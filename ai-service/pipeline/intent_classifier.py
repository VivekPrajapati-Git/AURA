from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from models.schemas import IntentLabel
from pipeline.constants import INTENT_SIGNALS
import os

# Enable offline mode if models are cached
os.environ['HF_HUB_OFFLINE'] = 'False'  # Set to 'True' if you want offline-only mode


# ── Load once at module level ─────────────────────────────────────────────────

_classifier = None

INTENT_LABELS = [
    "resume review",
    "salary negotiation",
    "interview preparation",
    "job search",
    "skill gap analysis",
    "career switch",
    "bias complaint",
    "general question",
    "motivation and mindset",
    "networking advice",
    "education and courses",
    "rejection handling",
]

# ── Maps human-readable label back to IntentLabel enum ────────────────────────

LABEL_MAP = {
    "resume review":           IntentLabel.resume_review,
    "salary negotiation":      IntentLabel.salary_negotiation,
    "interview preparation":   IntentLabel.interview_prep,
    "job search":              IntentLabel.job_search,
    "skill gap analysis":      IntentLabel.skill_gap,
    "career switch":           IntentLabel.career_switch,
    "bias complaint":          IntentLabel.bias_complaint,
    "general question":        IntentLabel.general_question,
    "motivation and mindset":  IntentLabel.motivation,
    "networking advice":       IntentLabel.networking,
    "education and courses":   IntentLabel.education,
    "rejection handling":      IntentLabel.rejection_handling,
}

# ── Intent-specific signal keywords ──────────────────────────────────────────
# Used by reliability scorer to check response aligns with intent

INTENT_SIGNALS = {
    IntentLabel.resume_review:       "resume skills experience format bullet points ATS",
    IntentLabel.salary_negotiation:  "salary offer negotiation compensation package counter",
    IntentLabel.interview_prep:      "interview question answer behavioral STAR technique",
    IntentLabel.job_search:          "job search apply portal LinkedIn company opening",
    IntentLabel.skill_gap:           "skill gap learn course certification missing technology",
    IntentLabel.career_switch:       "career change transition industry pivot new role",
    IntentLabel.bias_complaint:      "bias discrimination unfair treatment equal opportunity",
    IntentLabel.general_question:    "advice guidance information help career",
    IntentLabel.motivation:          "motivation confidence mindset burnout growth",
    IntentLabel.networking:          "network connect LinkedIn referral relationship event",
    IntentLabel.education:           "degree course certification bootcamp university study",
    IntentLabel.rejection_handling:  "rejection feedback failure resilience try again move on",
}


def get_classifier():
    global _classifier
    if _classifier is None:
        print("Loading zero-shot classifier...")
        try:
            _classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=-1,  # Use CPU if GPU not available
            )
            print("Zero-shot classifier loaded.")
        except Exception as e:
            print(f"Failed to load classifier with online mode: {e}")
            print("Attempting to load from cache with offline mode...")
            try:
                os.environ['HF_HUB_OFFLINE'] = 'True'
                _classifier = pipeline(
                    "zero-shot-classification",
                    model="facebook/bart-large-mnli",
                    device=-1,
                )
                print("Zero-shot classifier loaded from cache (offline mode).")
            except Exception as e2:
                print(f"Failed to load from cache: {e2}")
                raise RuntimeError(
                    "Could not load classifier. Check internet connection or ensure "
                    "model is cached in ~/.cache/huggingface/hub/"
                ) from e2
    return _classifier


# ── Main classify function ────────────────────────────────────────────────────

def classify_intent(message: str) -> tuple[IntentLabel, float, list[dict]]:
    """
    Classify user message into one of 12 career intent labels.

    Returns:
        intent      — top IntentLabel enum value
        confidence  — float 0.0 to 1.0
        top3        — list of top 3 {label, score} dicts for XAI display
    """
    classifier = get_classifier()

    result = classifier(
        message,
        candidate_labels=INTENT_LABELS,
        multi_label=False
    )

    top_label      = result["labels"][0]
    top_score      = round(float(result["scores"][0]), 4)

    top3 = [
        {"label": result["labels"][i], "score": round(float(result["scores"][i]), 4)}
        for i in range(min(3, len(result["labels"])))
    ]

    intent = LABEL_MAP.get(top_label, IntentLabel.general_question)

    return intent, top_score, top3


# ── Intent-response alignment score ──────────────────────────────────────────

def compute_intent_alignment(response: str, intent: IntentLabel) -> float:
    """
    Checks whether the response actually addresses the classified intent.
    Uses cosine similarity between response embedding and intent signal keywords.
    Used in ReliabilityScore computation.
    """
    from utils.embedder import embed, cosine_similarity

    signal  = INTENT_SIGNALS.get(intent, "career advice")
    r_emb   = embed(response)
    s_emb   = embed(signal)
    score   = cosine_similarity(r_emb, s_emb)
    return round(float(score), 4)