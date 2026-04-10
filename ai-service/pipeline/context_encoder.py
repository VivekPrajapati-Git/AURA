import spacy
import numpy as np
from utils.embedder import embed, embed_batch, cosine_similarity, top_n_similar
from models.schemas import UserContext, HistoryTurn

# ── Load spaCy once at module level ───────────────────────────────────────────

_nlp = None

def get_nlp():
    global _nlp
    if _nlp is None:
        print("Loading spaCy model...")
        _nlp = spacy.load("en_core_web_sm")
        print("spaCy model loaded.")
    return _nlp


# ── Entity extraction ─────────────────────────────────────────────────────────

def extract_entities(text: str) -> dict:
    """
    Extract general-purpose entities from user message using spaCy NER.
    Returns structured dict of topics, entities, locations, organizations found.
    """
    nlp = get_nlp()
    doc = nlp(text)

    entities = {
        "topics":         [],  # General topics/subjects mentioned
        "entities":       [],  # Named entities (people, products, etc.)
        "locations":      [],  # Geographic locations
        "organizations":  [],  # Organizations/companies
        "values":         [],  # Numeric values/measurements
    }

    # ── Named entity recognition ──────────────────────────────────────────────
    for ent in doc.ents:
        if ent.label_ in ("GPE", "LOC"):
            entities["locations"].append(ent.text)
        elif ent.label_ == "ORG":
            entities["organizations"].append(ent.text)
        elif ent.label_ in ("PERSON", "PRODUCT", "EVENT", "WORK_OF_ART"):
            entities["entities"].append(ent.text)
        elif ent.label_ in ("DATE", "QUANTITY", "MONEY", "PERCENT"):
            entities["values"].append(ent.text)

    # ── Noun chunks for general topics ────────────────────────────────────────
    import re
    
    # Extract standalone significant nouns (potential topics)
    for chunk in doc.noun_chunks:
        # Filter for multi-word or capitalized entities
        if len(chunk.text.split()) > 1 or chunk.text[0].isupper():
            entities["topics"].append(chunk.text)

    # ── Numeric/measurement patterns ──────────────────────────────────────────
    number_matches = re.findall(r"\d+[\.\d]*\s*(?:years?|months?|days?|percent|%|units?|times?|[a-z]+)?", text.lower())
    entities["values"].extend(number_matches)

    # ── Deduplicate and clean ─────────────────────────────────────────────────
    for key in entities:
        entities[key] = list(dict.fromkeys(entities[key]))  # Preserve order, remove duplicates

    return entities


# ── Context accumulation ──────────────────────────────────────────────────────

def update_user_context(
    current_context: UserContext,
    new_entities: dict
) -> UserContext:
    """
    Merge newly extracted entities into the running user context.
    Accumulates across turns — never resets unless session resets.
    Generic version: works for any topic domain.
    """
    updated_interests  = list(dict.fromkeys(current_context.interests + new_entities.get("topics", [])))
    updated_background = list(dict.fromkeys(current_context.background + new_entities.get("entities", [])))
    updated_constraints = list(dict.fromkeys(current_context.constraints + new_entities.get("values", [])))

    location = current_context.location
    if new_entities.get("locations"):
        location = new_entities["locations"][0]

    return UserContext(
        interests       = updated_interests,
        background      = updated_background,
        constraints     = updated_constraints,
        location        = location,
        knowledge_level = current_context.knowledge_level,
        preferences     = current_context.preferences
    )


# ── History encoding ──────────────────────────────────────────────────────────

def encode_history(history: list[HistoryTurn], max_turns: int = 8) -> str:
    """
    Convert last N turns into a single context string for LLM prompt.
    Applies decay weighting — older turns summarised, recent turns full.
    """
    recent = history[-max_turns:]

    lines = []
    for i, turn in enumerate(recent):
        weight = round(0.9 ** (len(recent) - 1 - i), 2)   # decay older turns
        prefix = "User" if turn.role == "user" else "AURA"
        lines.append(f"[w={weight}] {prefix}: {turn.content}")

    return "\n".join(lines)


# ── Context contribution scores ───────────────────────────────────────────────

def compute_context_contributions(
    response: str,
    user_context: UserContext
) -> list[dict]:
    """
    For each element in user context, compute cosine similarity
    to the response embedding. Returns top-5 as contribution scores.
    Used by XAI module to show WHY the response said what it said.
    Generic version for any domain.
    """
    context_items = []

    # Add all context elements with their type prefix
    for interest in user_context.interests:
        context_items.append(("interest: " + interest, interest))
    for background in user_context.background:
        context_items.append(("background: " + background, background))
    for constraint in user_context.constraints:
        context_items.append(("constraint: " + constraint, constraint))
    if user_context.location:
        context_items.append(("location: " + user_context.location, user_context.location))

    if not context_items:
        return []

    response_emb = embed(response)
    results      = []

    for full_text, label in context_items:
        item_emb = embed(full_text)
        score    = cosine_similarity(response_emb, item_emb)
        # Clamp score to [0, 1] range (cosine sim can be negative)
        score    = max(0.0, min(1.0, float(score)))
        results.append({"label": label, "score": round(score, 4)})

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:5]


# ── Factual grounding score ───────────────────────────────────────────────────

def compute_factual_grounding(
    response: str,
    user_context: UserContext,
    history: list[HistoryTurn]
) -> float:
    """
    Measures how grounded the response is in the user's actual context.
    Cosine similarity between response and top-3 context chunks combined.
    Used directly in ReliabilityScore.factual_grounding.
    """
    chunks = []

    chunks += user_context.interests
    chunks += user_context.background
    chunks += user_context.constraints

    for turn in history[-3:]:
        chunks.append(turn.content)

    if not chunks:
        return 0.5                      # neutral if no context exists yet

    top3   = top_n_similar(response, chunks, n=3)
    scores = [score for _, score in top3]
    return round(float(np.mean(scores)), 4) if scores else 0.5