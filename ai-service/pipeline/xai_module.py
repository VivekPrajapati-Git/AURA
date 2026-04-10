import numpy as np
from utils.embedder import embed, cosine_similarity
from pipeline.context_encoder import compute_context_contributions
from models.schemas import XAIData, ContextContribution, ShapToken, UserContext, HistoryTurn, IntentLabel
from pipeline.constants import INTENT_SIGNALS, MIN_TOKENS

# ── SHAP-lite token scorer ────────────────────────────────────────────────────

def compute_shap_tokens(
    message: str,
    intent:  IntentLabel
) -> list[ShapToken]:
    """
    Lightweight SHAP-style token attribution.
    For each token in the user message, measures how much it
    contributed to the intent classification by computing
    cosine similarity between token embedding and intent signal.
    """
    from pipeline.intent_classifier import INTENT_SIGNALS

    signal     = INTENT_SIGNALS.get(intent, "career advice")
    signal_emb = embed(signal)

    tokens     = _tokenize(message)
    results    = []

    for token in tokens:
        if len(token) < 3:              # skip stopwords/punctuation
            continue
        token_emb = embed(token)
        score     = cosine_similarity(token_emb, signal_emb)
        results.append(ShapToken(token=token, score=round(float(score), 4)))

    results.sort(key=lambda x: x.score, reverse=True)
    return results[:10]                 # top 10 most influential tokens


# ── Attention summary ─────────────────────────────────────────────────────────

def compute_attention_summary(
    response:     str,
    user_context: UserContext,
    history:      list[HistoryTurn]
) -> str:
    """
    Generates a human-readable one-line summary of what context
    most influenced the response. Used in XAI panel as plain text.
    """
    all_context = []

    if user_context.interests:
        all_context.append(("interests: " + ", ".join(user_context.interests),
                            "interests"))
    if user_context.background:
        all_context.append(("background: " + ", ".join(user_context.background),
                            "background"))
    if user_context.knowledge_level:
        all_context.append((user_context.knowledge_level, "knowledge_level"))
    if user_context.location:
        all_context.append((user_context.location, "location"))
    if user_context.constraints:
        all_context.append(("constraints: " + ", ".join(user_context.constraints),
                            "experience level"))

    for turn in history[-3:]:
        if turn.role == "user":
            all_context.append((turn.content, f"your earlier message"))

    if not all_context:
        return "Response based on general career knowledge."

    response_emb = embed(response)
    scored       = []

    for full_text, label in all_context:
        ctx_emb = embed(full_text)
        score   = cosine_similarity(response_emb, ctx_emb)
        scored.append((label, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:2]

    parts = [label for label, _ in top]
    return f"Response primarily influenced by: {' and '.join(parts)}."


# ── Response quality scorer ───────────────────────────────────────────────────

def compute_response_quality(
    message:  str,
    response: str,
    intent:   IntentLabel,
    reasoning: str
) -> float:
    """
    Validates response quality across 4 dimensions:
    1. Semantic match   — does response address the query
    2. Intent alignment — does response match the intent domain
    3. CoT coherence    — does reasoning match recommendation
    4. Length sanity    — is response long enough for the intent

    Returns a quality score 0.0 to 1.0.
    """
    from pipeline.intent_classifier import INTENT_SIGNALS

    
    q_emb      = embed(message)
    r_emb      = embed(response)
    reason_emb = embed(reasoning)
    signal_emb = embed(INTENT_SIGNALS.get(intent, "career advice"))

    semantic_match   = cosine_similarity(q_emb, r_emb)
    intent_alignment = cosine_similarity(r_emb, signal_emb)
    cot_coherence    = cosine_similarity(reason_emb, r_emb)
    length_ok        = len(response.split()) >= MIN_TOKENS.get(intent, 30)

    quality = (
        0.35 * semantic_match   +
        0.30 * intent_alignment +
        0.25 * cot_coherence    +
        0.10 * int(length_ok)
    )

    return round(float(quality), 4)


# ── Main XAI builder ──────────────────────────────────────────────────────────

def build_xai_data(
    message:      str,
    response:     str,
    reasoning:    str,
    intent:       IntentLabel,
    user_context: UserContext,
    history:      list[HistoryTurn]
) -> XAIData:
    """
    Master function — builds the complete XAIData object.
    Called from main.py after LLM response is received.
    Returns structured data the frontend renders as charts.
    """
    context_contributions = compute_context_contributions(response, user_context)
    shap_tokens           = compute_shap_tokens(message, intent)
    attention_summary     = compute_attention_summary(response, user_context, history)

    return XAIData(
        context_contributions = [
            ContextContribution(label=c["label"], score=c["score"])
            for c in context_contributions
        ],
        shap_tokens       = shap_tokens,
        attention_summary = attention_summary
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _tokenize(text: str) -> list[str]:
    """Simple whitespace + punctuation tokenizer."""
    import re
    tokens = re.findall(r"\b[a-zA-Z]+\b", text.lower())
    stopwords = {
        "i", "me", "my", "we", "you", "the", "a", "an", "is", "are",
        "was", "be", "to", "of", "and", "in", "it", "for", "on", "with",
        "this", "that", "have", "has", "do", "can", "will", "how", "what",
        "should", "would", "could", "any", "all", "also", "just", "at"
    }
    return [t for t in tokens if t not in stopwords]