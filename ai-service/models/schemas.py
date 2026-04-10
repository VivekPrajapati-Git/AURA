from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class IntentLabel(str, Enum):
    # Generic intent labels for any topic
    advice_seeking       = "advice_seeking"       # Asking for guidance/recommendation
    information_request  = "information_request"  # Asking for facts/information
    opinion_discussion   = "opinion_discussion"   # Wanting to discuss perspectives
    problem_solving      = "problem_solving"      # Asking for help solving issue
    learning_request     = "learning_request"     # Wants to learn/understand topic
    debate_argument      = "debate_argument"      # Debating or arguing a point
    creative_help        = "creative_help"        # Needs creative assistance
    decision_making      = "decision_making"      # Help deciding between options
    venting_support      = "venting_support"      # Expressing frustration/seeking support
    comparison_analysis  = "comparison_analysis"  # Comparing options/analyzing
    general_question     = "general_question"     # General open-ended question
    task_assistance      = "task_assistance"      # Help with specific task


class HistoryTurn(BaseModel):
    role:    str                        # "user" or "assistant"
    content: str


class UserContext(BaseModel):
    # Generic user profile (topic-agnostic)
    interests:      list[str] = []  # Topics/areas user is interested in
    knowledge_level: str      = "general"  # "beginner", "intermediate", "expert"
    preferences:    dict      = {}  # Any user preferences
    background:     list[str] = []  # User background/context (replaces skills)
    constraints:    list[str] = []  # Any constraints mentioned
    location:       str       = ""  # Optional location


class ContextContribution(BaseModel):
    label: str
    score: float = Field(ge=0.0, le=1.0)


class ShapToken(BaseModel):
    token: str
    score: float                        # positive = pushed toward intent


class XAIData(BaseModel):
    context_contributions: list[ContextContribution] = []
    shap_tokens:           list[ShapToken]           = []
    attention_summary:     str                       = ""


class BiasChecks(BaseModel):
    toxicity:             float = Field(ge=0.0, le=1.0)
    gendered_language:    float = Field(ge=0.0, le=1.0)
    demographic_parity:   float = Field(ge=0.0, le=1.0)
    privilege_assumption: float = Field(ge=0.0, le=1.0)


class BiasScore(BaseModel):
    composite: float = Field(ge=0.0, le=1.0)
    checks:    BiasChecks
    flagged:   bool  = False


class ReliabilityScore(BaseModel):
    """
    Four-pillar reliability score.

    Removed: consistency_score — penalises healthy language variation
             across runs, not a valid signal for single-inference eval.

    Replaced with: factual_grounding — measures whether the response
                   is anchored to the user's actual context rather than
                   comparing two separate LLM runs against each other.

    Formula:
        overall = 0.25 * intent_confidence
                + 0.25 * llm_confidence
                + 0.25 * factual_grounding
                + 0.25 * (1 - bias_composite)
    """
    overall:            float = Field(ge=0.0, le=1.0)
    intent_confidence:  float = Field(ge=0.0, le=1.0)
    llm_confidence:     float = Field(ge=0.0, le=1.0)
    factual_grounding:  float = Field(ge=0.0, le=1.0)  # replaces consistency
    bias_penalty:       float = Field(ge=0.0, le=1.0)  # = 1 - bias_composite
    label:              str   = ""                      # "green" | "amber" | "red"


# ── Inbound ───────────────────────────────────────────────────────────────────

class InferRequest(BaseModel):
    message:      str
    history:      list[HistoryTurn] = []
    user_context: UserContext       = UserContext()
    session_id:   str


# ── Outbound ──────────────────────────────────────────────────────────────────

class InferResponse(BaseModel):
    response:             str
    reasoning:            str
    intent:               IntentLabel
    confidence:           float = Field(ge=0.0, le=1.0)
    xai_data:             XAIData
    bias_score:           BiasScore
    reliability:          ReliabilityScore
    neutralized_response: Optional[str] = None
    caveat:               Optional[str] = None
    session_id:           str