from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from models.schemas import IntentLabel
from pipeline.constants import INTENT_SIGNALS
import os

# Enable offline mode if models are cached
os.environ['HF_HUB_OFFLINE'] = 'False'  # Set to 'True' if you want offline-only mode


# ── Load once at module level ─────────────────────────────────────────────────

_classifier = None

INTENT_LABELS = [
    "advice seeking",
    "information request",
    "opinion discussion",
    "problem solving",
    "learning request",
    "debate argument",
    "creative help",
    "decision making",
    "venting support",
    "comparison analysis",
    "general question",
    "task assistance",
]

# ── Maps human-readable label back to IntentLabel enum ────────────────────────

LABEL_MAP = {
    "advice seeking":      IntentLabel.advice_seeking,
    "information request": IntentLabel.information_request,
    "opinion discussion":  IntentLabel.opinion_discussion,
    "problem solving":     IntentLabel.problem_solving,
    "learning request":    IntentLabel.learning_request,
    "debate argument":     IntentLabel.debate_argument,
    "creative help":       IntentLabel.creative_help,
    "decision making":     IntentLabel.decision_making,
    "venting support":     IntentLabel.venting_support,
    "comparison analysis": IntentLabel.comparison_analysis,
    "general question":    IntentLabel.general_question,
    "task assistance":     IntentLabel.task_assistance,
}



# ── Intent-specific signal keywords ──────────────────────────────────────────
# Imported from constants.py


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