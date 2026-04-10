from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import InferRequest, InferResponse, XAIData, BiasScore, BiasChecks, ReliabilityScore, IntentLabel
from contextlib import asynccontextmanager
import uvicorn


# ── Lifespan (runs once on startup) ──────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("AURA AI service starting...")
    # pipeline imports will be loaded here later
    # e.g. load models into memory once instead of per-request
    yield
    print("AURA AI service shutting down...")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AURA AI Engine",
    description="Context-aware, explainable, ethical AI service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   # Next.js frontend
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "aura-ai-engine"}


# ── Main inference endpoint ───────────────────────────────────────────────────

@app.post("/ai/infer", response_model=InferResponse)
async def infer(req: InferRequest):
    try:
        # ── MOCK RESPONSE (replace step by step as each pipeline file is built) ──
        mock_response = InferResponse(
            response        = "Based on your background, I recommend tailoring your resume to highlight Python and data skills prominently for fintech roles.",
            reasoning       = "User has Python skills and is targeting fintech. Resume should front-load technical stack and quantify impact.",
            intent          = IntentLabel.resume_review,
            confidence      = 0.87,
            xai_data        = XAIData(
                context_contributions = [
                    {"label": "Python skills mentioned", "score": 0.72},
                    {"label": "Fintech role target",     "score": 0.65},
                    {"label": "3 years experience",      "score": 0.48},
                ],
                shap_tokens       = [
                    {"token": "resume",  "score":  0.42},
                    {"token": "update",  "score":  0.18},
                    {"token": "help",    "score":  0.05},
                ],
                attention_summary = "Response grounded primarily in user skills and target role."
            ),
            bias_score      = BiasScore(
                composite = 0.08,
                checks    = BiasChecks(
                    toxicity             = 0.02,
                    gendered_language    = 0.05,
                    demographic_parity   = 0.10,
                    privilege_assumption = 0.08,
                ),
                flagged   = False
            ),
            reliability     = ReliabilityScore(
                overall           = 0.83,
                intent_confidence = 0.87,
                llm_confidence    = 0.87,
                factual_grounding = 0.76,
                bias_penalty      = 0.92,
                label             = "green"
            ),
            neutralized_response = None,
            caveat               = None,
            session_id           = req.session_id
        )

        return mock_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)