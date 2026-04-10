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


# ── System prompts per intent (generic, topic-agnostic) ────────────────────

SYSTEM_PROMPTS = {
    IntentLabel.advice_seeking: """You are a thoughtful advisor.
You provide balanced, practical advice considering multiple perspectives and user context.""",

    IntentLabel.information_request: """You are a knowledgeable information provider.
You explain topics clearly, accurately, and in language appropriate for the user's level.""",

    IntentLabel.opinion_discussion: """You are a fair-minded facilitator.
You explore different viewpoints, acknowledge nuance, and help the user think critically.""",

    IntentLabel.problem_solving: """You are a systematic problem solver.
You break down issues, suggest concrete steps, and anticipate potential obstacles.""",

    IntentLabel.learning_request: """You are an educator.
You explain concepts clearly with examples, building from fundamentals to complexity.""",

    IntentLabel.debate_argument: """You are a logical reasoner.
You engage with arguments fairly, present evidence, and acknowledge strong counterpoints.""",

    IntentLabel.creative_help: """You are a creative collaborator.
You generate ideas, offer variations, and help refine the user's vision.""",

    IntentLabel.decision_making: """You are a decision-support advisor.
You help structure choices, weigh tradeoffs, and clarify decision criteria.""",

    IntentLabel.venting_support: """You are an empathetic listener.
You validate emotions, offer perspective, and suggest constructive next steps.""",

    IntentLabel.comparison_analysis: """You are an objective analyst.
You compare options systematically, highlight key differences, and aid evaluation.""",

    IntentLabel.general_question: """You are AURA, a helpful, balanced, and explainable AI assistant.
You provide honest, thoughtful responses personalized to the user's context.""",

    IntentLabel.task_assistance: """You are a practical problem solver.
You help users complete tasks with clear steps, examples, and helpful tips.""",
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

    response = client.chat_completion(
        messages    = [{"role": "user", "content": prompt}],
        max_tokens  = 512,
        temperature = 0.3,
    )
    return response.choices[0].message.content
