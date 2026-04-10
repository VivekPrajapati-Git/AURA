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
    Extract job-relevant entities from user message using spaCy NER.
    Returns structured dict of skills, roles, locations, orgs found.
    """
    nlp = get_nlp()
    doc = nlp(text)

    entities = {
        "skills":        [],
        "roles":         [],
        "locations":     [],
        "organizations": [],
        "experience":    [],
    }

    # ── Named entity recognition ──────────────────────────────────────────────
    for ent in doc.ents:
        if ent.label_ in ("GPE", "LOC"):
            entities["locations"].append(ent.text)
        elif ent.label_ == "ORG":
            entities["organizations"].append(ent.text)

    # ── Noun chunks for skills and roles ─────────────────────────────────────
    skill_keywords = {
        "python", "java", "javascript", "typescript", "react", "node",
        "sql", "mongodb", "postgresql", "docker", "kubernetes", "aws",
        "machine learning", "deep learning", "nlp", "fastapi", "django",
        "data science", "tensorflow", "pytorch", "git", "linux", "excel"
    }

    role_keywords = {
        "developer", "engineer", "analyst", "manager", "designer",
        "architect", "consultant", "intern", "lead", "scientist",
        "devops", "fullstack", "frontend", "backend", "data"
    }

    for chunk in doc.noun_chunks:
        text_lower = chunk.text.lower()
        if any(skill in text_lower for skill in skill_keywords):
            entities["skills"].append(chunk.text)
        if any(role in text_lower for role in role_keywords):
            entities["roles"].append(chunk.text)

    # ── Experience pattern (e.g. "3 years", "2+ years") ──────────────────────
    import re
    exp_matches = re.findall(r"\d+\+?\s*years?", text.lower())
    entities["experience"] = exp_matches

    # ── Deduplicate ───────────────────────────────────────────────────────────
    for key in entities:
        entities[key] = list(set(entities[key]))

    return entities


# ── Context accumulation ──────────────────────────────────────────────────────

def update_user_context(
    current_context: UserContext,
    new_entities: dict
) -> UserContext:
    """
    Merge newly extracted entities into the running user context.
    Accumulates across turns — never resets unless session resets.
    """
    updated_skills      = list(set(current_context.skills      + new_entities.get("skills", [])))
    updated_goals       = list(set(current_context.goals       + new_entities.get("roles",  [])))
    updated_constraints = list(set(current_context.constraints + new_entities.get("experience", [])))

    location = current_context.location
    if new_entities.get("locations"):
        location = new_entities["locations"][0]

    return UserContext(
        skills      = updated_skills,
        goals       = updated_goals,
        constraints = updated_constraints,
        location    = location,
        preferences = current_context.preferences
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
    """
    context_items = []

    for skill in user_context.skills:
        context_items.append(("skill: " + skill, skill))
    for goal in user_context.goals:
        context_items.append(("role: " + goal, goal))
    for constraint in user_context.constraints:
        context_items.append(("experience: " + constraint, constraint))
    if user_context.location:
        context_items.append(("location: " + user_context.location, user_context.location))

    if not context_items:
        return []

    response_emb = embed(response)
    results      = []

    for full_text, label in context_items:
        item_emb = embed(full_text)
        score    = cosine_similarity(response_emb, item_emb)
        results.append({"label": label, "score": round(float(score), 4)})

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

    chunks += user_context.skills
    chunks += user_context.goals
    chunks += user_context.constraints

    for turn in history[-3:]:
        chunks.append(turn.content)

    if not chunks:
        return 0.5                      # neutral if no context exists yet

    top3   = top_n_similar(response, chunks, n=3)
    scores = [score for _, score in top3]
    return round(float(np.mean(scores)), 4) if scores else 0.5