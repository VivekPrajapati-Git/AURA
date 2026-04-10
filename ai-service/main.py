import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from models.schemas import (
    InferRequest, InferResponse,
    ReliabilityScore, IntentLabel
)
from pipeline.context_encoder import (
    extract_entities,
    update_user_context,
    encode_history,
    compute_factual_grounding
)
from pipeline.intent_classifier import (
    classify_intent,
    compute_intent_alignment
)
from pipeline.llm_reasoner import run_llm, run_neutralized
from pipeline.xai_module import build_xai_data, compute_response_quality
from pipeline.bias_detector import detect_bias

import uvicorn


# ── Lifespan (pre-load models once on startup) ────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("AURA AI service starting — pre-loading models...")

    # Pre-load the zero-shot intent classifier into memory (takes ~15s first run)
    from pipeline.intent_classifier import get_classifier
    get_classifier()

    # Pre-load spaCy NER model
    from pipeline.context_encoder import get_nlp
    get_nlp()

    print("AURA AI service ready ✓")
    yield
    print("AURA AI engine shutting down...")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "AURA AI Engine",
    description = "Context-aware, explainable, ethical career AI",
    version     = "1.0.0",
    lifespan    = lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "aura-ai-engine", "version": "1.0.0"}


# ── Main inference endpoint ───────────────────────────────────────────────────

@app.post("/ai/infer", response_model=InferResponse)
async def infer(req: InferRequest):
    try:
        # ── Step 1: Classify intent ───────────────────────────────────────────
        from pipeline.intent_classifier import classify_intent
        intent, intent_confidence, top3_intents = classify_intent(req.message)

        # ── Step 2: Encode conversation history ───────────────────────────────
        from pipeline.context_encoder import encode_history, extract_entities, update_user_context
        encoded_history = encode_history(req.history)

        # Enrich user_context with entities extracted from the current message
        extracted = extract_entities(req.message)
        enriched_context = update_user_context(req.user_context, extracted)

        # ── Step 3: Call LLM (HuggingFace) ───────────────────────────────────
        from pipeline.llm_reasoner import run_llm
        llm_out = run_llm(
            message         = req.message,
            history         = req.history,
            user_context    = enriched_context,
            intent          = intent,
            encoded_history = encoded_history,
        )
        # llm_out: ParsedLLMOutput { reasoning, response, confidence, caveats }

        # ── Step 4: Bias detection (runs all 4 checks in parallel) ───────────
        from pipeline.bias_detector import detect_bias
        bias_score: BiasScore = detect_bias(req.message, llm_out.response)

        # ── Step 5: XAI — build explainability data ───────────────────────────
        from pipeline.xai_module import build_xai_data
        xai_data: XAIData = build_xai_data(
            message      = req.message,
            response     = llm_out.response,
            reasoning    = llm_out.reasoning,
            intent       = intent,
            user_context = enriched_context,
            history      = req.history,
        )

        # ── Step 6: Reliability scoring ───────────────────────────────────────
        from pipeline.context_encoder import compute_factual_grounding
        from pipeline.xai_module import compute_response_quality

        factual_grounding = compute_factual_grounding(
            llm_out.response, enriched_context, req.history
        )
        llm_quality = compute_response_quality(
            req.message, llm_out.response, intent, llm_out.reasoning
        )
        bias_penalty    = round(1.0 - bias_score.composite, 4)
        overall         = round(
            0.25 * intent_confidence +
            0.25 * llm_out.confidence +
            0.25 * factual_grounding  +
            0.25 * bias_penalty,
            4
        )
        if overall >= 0.70:
            rel_label = "green"
        elif overall >= 0.45:
            rel_label = "amber"
        else:
            rel_label = "red"

        reliability = ReliabilityScore(
            overall            = overall,
            intent_confidence  = intent_confidence,
            llm_confidence     = llm_out.confidence,
            factual_grounding  = factual_grounding,
            bias_penalty       = bias_penalty,
            label              = rel_label,
        )

        # ── Step 7: Neutralized response (only if flagged for bias) ───────────
        neutralized_response = None
        if bias_score.flagged:
            try:
                from pipeline.llm_reasoner import run_neutralized
                neutralized_response = run_neutralized(
                    req.message, llm_out, intent, enriched_context
                )
            except Exception as ne:
                print(f"[neutralize] skipped: {ne}")

        # ── Assemble final response ───────────────────────────────────────────
        return InferResponse(
            response             = llm_out.response,
            reasoning            = llm_out.reasoning,
            intent               = intent,
            confidence           = llm_out.confidence,
            xai_data             = xai_data,
            bias_score           = bias_score,
            reliability          = reliability,
            neutralized_response = neutralized_response,
            caveat               = llm_out.caveats or None,
            session_id           = req.session_id,
        )


    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)