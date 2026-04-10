import asyncio
import re
import numpy as np
from utils.embedder import embed, cosine_similarity
from models.schemas import BiasScore, BiasChecks


# ── Gendered word lists ───────────────────────────────────────────────────────

MALE_CODED = {
    "aggressive", "ambitious", "assertive", "confident", "dominant",
    "driven", "fearless", "independent", "strong", "competitive",
    "decisive", "determined", "bold", "direct", "outspoken"
}

FEMALE_CODED = {
    "collaborative", "cooperative", "empathetic", "gentle", "nurturing",
    "sensitive", "supportive", "warm", "compassionate", "emotional",
    "affectionate", "polite", "modest", "caring", "soft"
}

PRIVILEGE_SIGNALS = [
    "attend a bootcamp",
    "take an online course",
    "buy a course",
    "invest in training",
    "hire a career coach",
    "attend networking events",
    "get a certification",
    "pursue a degree",
    "join a premium",
    "subscribe to",
]

DEMOGRAPHIC_SWAPS = [
    ("he",  "she"),
    ("him", "her"),
    ("his", "hers"),
    ("man", "woman"),
    ("male", "female"),
    ("boy", "girl"),
    ("mr", "ms"),
    ("sir", "ma'am"),
]


# ── Check 1 — Toxicity ────────────────────────────────────────────────────────

async def check_toxicity(response: str) -> float:
    """
    Embedding-based toxicity check.
    Measures semantic similarity to known toxic phrase embeddings.
    Returns 0.0 (clean) to 1.0 (toxic).
    """
    toxic_signals = [
        "you are worthless",
        "this is stupid",
        "you will never succeed",
        "give up now",
        "you are not good enough",
    ]

    response_emb = embed(response)
    scores       = []

    for signal in toxic_signals:
        sig_emb = embed(signal)
        score   = cosine_similarity(response_emb, sig_emb)
        scores.append(score)

    raw = float(np.max(scores))
    return round(min(1.0, max(0.0, raw)), 4)


# ── Check 2 — Gendered language ───────────────────────────────────────────────

async def check_gendered_language(response: str) -> float:
    """
    Checks imbalance between male-coded and female-coded language.
    Returns 0.0 (neutral) to 1.0 (heavily gendered).
    """
    words      = set(re.findall(r"\b[a-zA-Z]+\b", response.lower()))
    male_hits  = len(words & MALE_CODED)
    female_hits= len(words & FEMALE_CODED)
    total_hits = male_hits + female_hits

    if total_hits == 0:
        return 0.0

    imbalance = abs(male_hits - female_hits) / total_hits
    return round(float(imbalance), 4)


# ── Check 3 — Demographic parity ─────────────────────────────────────────────

async def check_demographic_parity(
    message:  str,
    response: str
) -> float:
    """
    Generates a gender-swapped version of the query.
    Compares semantic similarity of original vs swapped response embeddings.
    Low similarity = different treatment = bias.
    Returns 0.0 (fair) to 1.0 (biased).
    """
    swapped_message = _swap_demographics(message)

    if swapped_message == message:
        return 0.0                      # no demographic markers found

    original_emb = embed(response)
    swapped_emb  = embed(swapped_message)
    similarity   = cosine_similarity(original_emb, swapped_emb)

    bias_score   = 1.0 - similarity
    return round(float(max(0.0, min(1.0, bias_score))), 4)


def _swap_demographics(text: str) -> str:
    result = text.lower()
    for male, female in DEMOGRAPHIC_SWAPS:
        result = re.sub(rf"\b{male}\b", f"__TEMP_{female.upper()}__", result)
        result = re.sub(rf"\b{female}\b", male, result)
        result = result.replace(f"__TEMP_{female.upper()}__", female)
    return result


# ── Check 4 — Privilege assumption ───────────────────────────────────────────

async def check_privilege_assumption(response: str) -> float:
    """
    Detects when response assumes access to paid/privileged resources
    without knowing the user's background.
    Returns 0.0 (no assumption) to 1.0 (strong assumption).
    """
    response_lower = response.lower()
    response_emb   = embed(response)

    hits = 0
    for signal in PRIVILEGE_SIGNALS:
        if signal in response_lower:
            hits += 1
            continue
        sig_emb = embed(signal)
        score   = cosine_similarity(response_emb, sig_emb)
        if score > 0.72:
            hits += 1

    score = min(1.0, hits / 3.0)
    return round(float(score), 4)


# ── Composite scorer ──────────────────────────────────────────────────────────

async def run_bias_detection(
    message:  str,
    response: str
) -> BiasScore:
    """
    Runs all 4 bias checks in parallel using asyncio.gather().
    Returns composite BiasScore with individual check breakdowns.

    Weights:
        toxicity             0.35  — highest weight, most critical
        gendered_language    0.25
        demographic_parity   0.25
        privilege_assumption 0.15
    """
    toxicity, gendered, parity, privilege = await asyncio.gather(
        check_toxicity(response),
        check_gendered_language(response),
        check_demographic_parity(message, response),
        check_privilege_assumption(response),
    )

    composite = round(
        0.35 * toxicity  +
        0.25 * gendered  +
        0.25 * parity    +
        0.15 * privilege,
        4
    )

    flagged = composite > 0.4

    return BiasScore(
        composite = composite,
        checks    = BiasChecks(
            toxicity             = toxicity,
            gendered_language    = gendered,
            demographic_parity   = parity,
            privilege_assumption = privilege,
        ),
        flagged   = flagged
    )


# ── Sync wrapper for non-async callers ────────────────────────────────────────

def detect_bias(message: str, response: str) -> BiasScore:
    """
    Synchronous wrapper around run_bias_detection.
    Call this from main.py — handles event loop automatically.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(
                    asyncio.run,
                    run_bias_detection(message, response)
                )
                return future.result()
        else:
            return loop.run_until_complete(
                run_bias_detection(message, response)
            )
    except RuntimeError:
        return asyncio.run(run_bias_detection(message, response))