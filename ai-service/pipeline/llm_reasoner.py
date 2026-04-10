import os
from huggingface_hub import InferenceClient
from utils.xml_parser import parse_llm_output, is_valid_output, ParsedLLMOutput
from models.schemas import IntentLabel, HistoryTurn, UserContext
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# ── Available models (swap anytime by changing HF_MODEL in .env) ──────────────
#
#   "mistralai/Mistral-7B-Instruct-v0.3"       — fast, good quality
#   "mistralai/Mixtral-8x7B-Instruct-v0.1"     — stronger, slower
#   "meta-llama/Meta-Llama-3-8B-Instruct"      — excellent reasoning
#   "meta-llama/Meta-Llama-3-70B-Instruct"     — best quality, needs HF Pro
#   "HuggingFaceH4/zephyr-7b-beta"             — reliable, no auth needed
#   "google/gemma-2-9b-it"                     — solid alternative
#
# Default: Mistral-7B — best balance of speed + quality for hackathon

DEFAULT_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"

# ── Client ────────────────────────────────────────────────────────────────────

_client = None

def get_client() -> OpenAI:
    global _client
    if _client is None:
        token = os.getenv("HF_TOKEN")
        if not token:
            raise ValueError("HF_TOKEN not set in .env file")
        _client = OpenAI(
            api_key  = token,
            base_url = "https://router.huggingface.co/v1"
        )
        print(f"HF client loaded — model: {os.getenv('HF_MODEL', DEFAULT_MODEL)}")
    return _client


# ── System prompts per intent ─────────────────────────────────────────────────

SYSTEM_PROMPTS = {
    IntentLabel.resume_review: """You are an expert resume coach and ATS specialist.
You help users craft professional, impactful resumes tailored to specific roles.""",

    IntentLabel.salary_negotiation: """You are an expert salary negotiation coach.
You help users understand their market value and negotiate confidently.""",

    IntentLabel.interview_prep: """You are an expert interview coach.
You help users prepare compelling, structured answers using the STAR technique.""",

    IntentLabel.job_search: """You are a career strategist specializing in job search.
You help users find opportunities and stand out from other applicants.""",

    IntentLabel.skill_gap: """You are a technical skills advisor.
You help users identify skill gaps and build targeted learning plans.""",

    IntentLabel.career_switch: """You are a career transition specialist.
You help users pivot industries by leveraging transferable skills.""",

    IntentLabel.bias_complaint: """You are a workplace equity and inclusion advisor.
You provide fair, evidence-based guidance on bias and discrimination concerns.""",

    IntentLabel.motivation: """You are a career mindset and motivation coach.
You help users overcome burnout, self-doubt, and career anxiety.""",

    IntentLabel.networking: """You are a professional networking strategist.
You help users build meaningful connections and leverage their network.""",

    IntentLabel.education: """You are an education and career development advisor.
You help users choose courses and certifications strategically.""",

    IntentLabel.rejection_handling: """You are a resilience and career recovery coach.
You help users process rejection constructively and move forward.""",

    IntentLabel.general_question: """You are AURA, an ethical and explainable career
counseling assistant. You provide honest, balanced, personalized career guidance.""",
}

BASE_SYSTEM_SUFFIX = """
IMPORTANT — respond ONLY in this exact XML format, nothing outside the tags:

<reasoning>
Your step-by-step thinking. Reference the user's specific context.
</reasoning>

<recommendation>
Your user-facing response. Be specific, actionable, and encouraging.
Reference the user's actual skills, goals, and constraints directly.
</recommendation>

<confidence>
A float between 0.0 and 1.0 for how confident you are.
</confidence>

<caveats>
Any limitations or things the user should verify. Leave empty if none.
</caveats>
"""


# ── Context builder ───────────────────────────────────────────────────────────

def _build_context_block(ctx: UserContext) -> str:
    lines = ["User profile (personalise your response using this):"]
    if ctx.skills:
        lines.append(f"  Skills     : {', '.join(ctx.skills)}")
    if ctx.goals:
        lines.append(f"  Goals      : {', '.join(ctx.goals)}")
    if ctx.constraints:
        lines.append(f"  Experience : {', '.join(ctx.constraints)}")
    if ctx.location:
        lines.append(f"  Location   : {ctx.location}")
    return "\n".join(lines)


def _build_prompt(
    message:         str,
    history:         list[HistoryTurn],
    user_context:    UserContext,
    intent:          IntentLabel,
    encoded_history: str
) -> str:
    """
    Builds a single prompt string for HuggingFace models.
    HF Inference API works best with a combined prompt rather than
    separate messages array like OpenAI.
    """
    domain_prompt = SYSTEM_PROMPTS.get(
        intent,
        SYSTEM_PROMPTS[IntentLabel.general_question]
    )
    context_block = _build_context_block(user_context)

    history_block = encoded_history if encoded_history else "No prior conversation."

    prompt = (
        f"{domain_prompt}\n\n"
        f"{context_block}\n\n"
        f"Conversation so far:\n{history_block}\n\n"
        f"{BASE_SYSTEM_SUFFIX}\n\n"
        f"User: {message}\n\n"
        f"AURA:"
    )
    return prompt


# ── Main reasoner ─────────────────────────────────────────────────────────────

def run_llm(
    message:         str,
    history:         list[HistoryTurn],
    user_context:    UserContext,
    intent:          IntentLabel,
    encoded_history: str = ""
) -> ParsedLLMOutput:
    """
    Call HuggingFace Inference API with structured CoT prompt.
    Retries once with stricter prompt if output fails validation.
    """
    client = get_client()
    prompt = _build_prompt(message, history, user_context, intent, encoded_history)

    raw    = _call_hf(client, prompt, temperature=0.7)
    parsed = parse_llm_output(raw)

    # ── Retry with stricter prompt if validation fails ────────────────────────
    if not is_valid_output(parsed):
        print("Output failed validation — retrying...")
        strict_prompt = (
            prompt
            + "\nIMPORTANT: Your previous response did not follow the XML format. "
            + f"The user asked: {message}. "
            + "Respond strictly using the four XML tags only."
        )
        raw    = _call_hf(client, strict_prompt, temperature=0.3)
        parsed = parse_llm_output(raw)

    return parsed


def _call_hf(
    client:      OpenAI,
    prompt:      str,
    temperature: float = 0.7
) -> str:
    response = client.chat.completions.create(
        model    = os.getenv("HF_MODEL", DEFAULT_MODEL),
        messages = [{"role": "user", "content": prompt}],
        max_tokens  = 1024,
        temperature = temperature,
    )
    return response.choices[0].message.content

# ── Neutralized response ──────────────────────────────────────────────────────

def run_neutralized(
    message:      str,
    original:     ParsedLLMOutput,
    intent:       IntentLabel,
    user_context: UserContext
) -> str:
    client = get_client()

    prompt = (
        "You are AURA, an ethical career assistant. "
        "The following response was flagged for potential bias. "
        "Rewrite it to be completely neutral — no gendered language, "
        "no assumptions about background, resources, or demographics. "
        "Return only the rewritten response, no XML tags.\n\n"
        f"Original query: {message}\n\n"
        f"Response to rewrite:\n{original.response}\n\n"
        "Rewritten neutral response:"
    )

    response = client.chat.completions.create(
        model       = os.getenv("HF_MODEL", DEFAULT_MODEL),
        messages    = [{"role": "user", "content": prompt}],
        max_tokens  = 512,
        temperature = 0.3,
    )
    return response.choices[0].message.content

