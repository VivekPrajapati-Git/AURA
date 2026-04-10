import re
from dataclasses import dataclass


@dataclass
class ParsedLLMOutput:
    reasoning:   str
    response:    str
    confidence:  float
    caveats:     str


# ── Main parser ───────────────────────────────────────────────────────────────

def parse_llm_output(raw: str) -> ParsedLLMOutput:
    """
    Parses structured XML tags from LLM CoT output.

    Expected format from GPT-4o:
        <reasoning>step by step thinking here</reasoning>
        <recommendation>user facing response here</recommendation>
        <confidence>0.87</confidence>
        <caveats>any uncertainty notes here</caveats>
    """
    reasoning      = _extract(raw, "reasoning")
    recommendation = _extract(raw, "recommendation")
    confidence_str = _extract(raw, "confidence")
    caveats        = _extract(raw, "caveats")

    confidence = _parse_confidence(confidence_str)

    # ── Fallback: if tags missing, treat entire output as response ────────────
    if not recommendation:
        recommendation = raw.strip()

    if not reasoning:
        reasoning = "No reasoning chain provided."

    if not caveats:
        caveats = ""

    return ParsedLLMOutput(
        reasoning   = reasoning.strip(),
        response    = recommendation.strip(),
        confidence  = confidence,
        caveats     = caveats.strip()
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract(text: str, tag: str) -> str:
    """Extract content between <tag>...</tag>. Returns empty string if not found."""
    pattern = rf"<{tag}>(.*?)</{tag}>"
    match   = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    return match.group(1).strip() if match else ""


def _parse_confidence(value: str) -> float:
    """
    Safely parse confidence string to float.
    Handles: "0.87", "87%", "87", garbage input.
    Always returns a value between 0.0 and 1.0.
    """
    try:
        value = value.strip().replace("%", "")
        f     = float(value)
        if f > 1.0:
            f = f / 100.0               # handle "87" → 0.87
        return round(max(0.0, min(1.0, f)), 4)
    except (ValueError, AttributeError):
        return 0.5                      # neutral fallback if unparseable


# ── Validation ────────────────────────────────────────────────────────────────

def is_valid_output(parsed: ParsedLLMOutput) -> bool:
    """
    Basic sanity check before accepting parsed output.
    Returns False if response is empty or suspiciously short.
    """
    return (
        len(parsed.response)  > 20  and
        len(parsed.reasoning) > 10  and
        0.0 <= parsed.confidence <= 1.0
    )