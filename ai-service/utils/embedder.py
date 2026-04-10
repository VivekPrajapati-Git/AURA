from sentence_transformers import SentenceTransformer
from numpy import ndarray
import numpy as np
import os

# Enable offline mode if models are cached
os.environ['HF_HUB_OFFLINE'] = 'False'

# ── Load once at module level (not per request) ───────────────────────────────

_model = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print("Loading embedding model...")
        try:
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            print("Embedding model loaded.")
        except Exception as e:
            print(f"Failed to load embedding model with online mode: {e}")
            print("Attempting to load from cache with offline mode...")
            try:
                os.environ['HF_HUB_OFFLINE'] = 'True'
                _model = SentenceTransformer("all-MiniLM-L6-v2")
                print("Embedding model loaded from cache (offline mode).")
            except Exception as e2:
                print(f"Failed to load from cache: {e2}")
                raise RuntimeError(
                    "Could not load embedding model. Check internet connection or ensure "
                    "model is cached in ~/.cache/huggingface/hub/"
                ) from e2
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