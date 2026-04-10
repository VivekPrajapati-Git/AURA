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


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("AURA AI engine starting...")
    print("All pipeline modules loaded.")
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
    allow_origins  = ["http://localhost:3000"],
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "aura-ai-engine", "version": "1.0.0"}


# ── Main inference endpoint ───────────────────────────────────────────────────

@app.post("/ai/infer", response_model=InferResponse)
async def infer(req: InferRequest):
    try:

        # ── Step 1: Extract entities + update context ─────────────────────────
        entities    = extract_entities(req.message)
        user_context= update_user_context(req.user_context, entities)
        encoded_history = encode_history(req.history)

        # ── Step 2: Classify intent ───────────────────────────────────────────
        intent, intent_confidence, top3 = classify_intent(req.message)

        # ── Step 3: LLM reasoning ─────────────────────────────────────────────
        parsed = run_llm(
            message         = req.message,
            history         = req.history,
            user_context    = user_context,
            intent          = intent,
            encoded_history = encoded_history
        )

        # ── Step 4: XAI data ──────────────────────────────────────────────────
        xai_data = build_xai_data(
            message      = req.message,
            response     = parsed.response,
            reasoning    = parsed.reasoning,
            intent       = intent,
            user_context = user_context,
            history      = req.history
        )

        # ── Step 5: Bias detection ────────────────────────────────────────────
        bias_score = detect_bias(req.message, parsed.response)

        # ── Step 6: Neutralized response if flagged ───────────────────────────
        neutralized = None
        if bias_score.flagged:
            neutralized = run_neutralized(
                message      = req.message,
                original     = parsed,
                intent       = intent,
                user_context = user_context
            )

        # ── Step 7: Reliability score ─────────────────────────────────────────
        factual_grounding = compute_factual_grounding(
            response     = parsed.response,
            user_context = user_context,
            history      = req.history
        )
        intent_alignment = compute_intent_alignment(parsed.response, intent)
        bias_penalty     = round(1.0 - bias_score.composite, 4)

        overall = round(
            0.25 * intent_confidence  +
            0.25 * parsed.confidence  +
            0.25 * factual_grounding  +
            0.25 * bias_penalty,
            4
        )

        label = (
            "green" if overall >= 0.75 else
            "amber" if overall >= 0.55 else
            "red"
        )

        reliability = ReliabilityScore(
            overall           = overall,
            intent_confidence = intent_confidence,
            llm_confidence    = parsed.confidence,
            factual_grounding = factual_grounding,
            bias_penalty      = bias_penalty,
            label             = label
        )

        # ── Step 8: Caveat injection ──────────────────────────────────────────
        caveat = None
        if parsed.confidence < 0.5:
            caveat = "I am not fully certain about this — please verify with a professional advisor."
        elif parsed.caveats:
            caveat = parsed.caveats

        # ── Return ────────────────────────────────────────────────────────────
        return InferResponse(
            response             = parsed.response,
            reasoning            = parsed.reasoning,
            intent               = intent,
            confidence           = parsed.confidence,
            xai_data             = xai_data,
            bias_score           = bias_score,
            reliability          = reliability,
            neutralized_response = neutralized,
            caveat               = caveat,
            session_id           = req.session_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)