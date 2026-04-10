from sentence_transformers import SentenceTransformer
from numpy import ndarray
import numpy as np

# ── Load once at module level (not per request) ───────────────────────────────

_model = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print("Loading embedding model...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        print("Embedding model loaded.")
    return _model


# ── Core functions ────────────────────────────────────────────────────────────

def embed(text: str) -> ndarray:
    model = get_model()
    return model.encode(text, normalize_embeddings=True)


def embed_batch(texts: list[str]) -> ndarray:
    model = get_model()
    return model.encode(texts, normalize_embeddings=True)


def cosine_similarity(a: ndarray, b: ndarray) -> float:
    return float(np.dot(a, b))          # valid because embeddings are normalized


def top_n_similar(
    query: str,
    candidates: list[str],
    n: int = 3
) -> list[tuple[str, float]]:
    """
    Given a query string and a list of candidate strings,
    return the top-n most similar candidates with their scores.
    Used by xai_module and context_encoder.
    """
    if not candidates:
        return []

    q_emb   = embed(query)
    c_embs  = embed_batch(candidates)
    scores  = [cosine_similarity(q_emb, c) for c in c_embs]
    ranked  = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
    return ranked[:n]