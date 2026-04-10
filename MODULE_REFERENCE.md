# AURA Pipeline - Module Reference & Function Guide

## Quick Reference by Module

---

## 📦 `pipeline/context_encoder.py`
**Purpose**: Extract entities from messages and build enriched user context

### Functions

#### 1. `extract_entities(text: str) → dict`
```python
Extracts job-relevant entities from user message using spaCy NER.

Returns:
{
  "skills": ["Python", "FastAPI"],
  "roles": ["Backend Developer"],
  "locations": ["Mumbai"],
  "organizations": ["Acme Corp"],
  "experience": ["3 years", "5+ years"]
}

Uses:
- spaCy en_core_web_sm model for NER
- Skill keywords: python, java, react, docker, kubernetes, aws, etc.
- Role keywords: developer, engineer, analyst, manager, lead, etc.
- Experience regex: \d+\+?\s*years?
```

**Main entry point**: `get_nlp() → spacy.Language`
- Loads model once at module level
- Cached globally

---

#### 2. `update_user_context(current: UserContext, new_entities: dict) → UserContext`
```python
Merges newly extracted entities into running user context.

Logic:
- Skills:      current.skills ∪ new_entities["skills"]
- Goals:       current.goals ∪ new_entities["roles"]
- Constraints: current.constraints ∪ new_entities["experience"]
- Location:    Overwrites with first new location found
- Preferences: Unchanged (carried forward)

Key behavior:
- Accumulates across conversation turns
- Never resets unless session resets
- Uses set() to deduplicate
```

---

#### 3. `encode_history(history: list[HistoryTurn], max_turns: int = 8) → str`
```python
Converts conversation history into weighted string format for LLM.

Process:
1. Takes last N turns (default: 8)
2. Applies decay weighting: weight_i = 0.9^(age_i)
3. Formats as "[w=weight] Role: content"

Example output:
[w=0.43] User: I'm an experienced Python developer
[w=0.66] AURA: Great! Let's tailor your resume...
[w=1.0] User: How should I update my resume for Python backend roles?

Purpose: Prevents token explosion from long conversations
while preserving recent context
```

---

#### 4. `compute_context_contributions(response: str, user_context: UserContext) → list[dict]`
```python
For each context element, compute relevance to response.

Process:
1. Create embedding for response
2. For each context item (skill, goal, constraint, location):
   - Create embedding for that item
   - Compute cosine_similarity(response_emb, item_emb)
3. Sort descending, return top-5

Output:
[
  {"label": "Python", "score": 0.94},
  {"label": "Backend Developer", "score": 0.87},
  {"label": "Mumbai", "score": 0.42}
]

Used by: XAI module to explain which context influenced response
```

---

#### 5. `compute_factual_grounding(response: str, user_context: UserContext, history: list[HistoryTurn]) → float`
```python
Measures how grounded response is in user's actual context.

Process:
1. Collect all context chunks:
   - user_context.skills
   - user_context.goals
   - user_context.constraints
   - Last 3 history turns (user messages)
2. Find top-3 chunks most similar to response
3. Return mean of their similarity scores

Range: 0.0 (generic) to 1.0 (highly personalized)
Fallback: 0.5 if no context exists

Used directly in: ReliabilityScore.factual_grounding
```

---

## 📊 `pipeline/intent_classifier.py`
**Purpose**: Classify user query into 1 of 12 career intents with confidence

### Functions

#### 1. `classify_intent(message: str) → tuple[IntentLabel, float, list[dict]]`
```python
Classifies message into one of 12 intent categories.

Process:
1. Load zero-shot classifier (facebook/bart-large-mnli)
2. Classify message against 12 candidate labels
3. Return: top intent, its score, top-3 predictions

Returns:
- intent:      IntentLabel.resume_review
- confidence:  0.9234
- top3:        [
                 {"label": "resume review", "score": 0.9234},
                 {"label": "job search", "score": 0.0521},
                 {"label": "skill gap analysis", "score": 0.0245}
               ]

Candidate labels (INTENT_LABELS):
1. "resume review"
2. "salary negotiation"
3. "interview preparation"
4. "job search"
5. "skill gap analysis"
6. "career switch"
7. "bias complaint"
8. "general question"
9. "motivation and mindset"
10. "networking advice"
11. "education and courses"
12. "rejection handling"

Main entry point: `get_classifier() → pipeline`
- Loads model once at module level
- Falls back to offline mode if online fails
```

---

#### 2. `compute_intent_alignment(response: str, intent: IntentLabel) → float`
```python
Validates that response actually addresses the classified intent.

Process:
1. Get intent signal keywords: INTENT_SIGNALS[intent]
   - Example: for resume_review → "resume skills experience format bullet points ATS"
2. Embed response
3. Embed signal keywords
4. Return cosine_similarity(response_emb, signal_emb)

Range: 0.0 (unrelated) to 1.0 (perfectly aligned)

Used in: ReliabilityScore computation (via main.py)
```

---

## 🧠 `pipeline/llm_reasoner.py`
**Purpose**: Generate structured reasoning and recommendations via LLM

### Functions

#### 1. `run_llm(message, history, user_context, intent, encoded_history) → ParsedLLMOutput`
```python
Main reasoning function - orchestrates prompt building and LLM call.

Process:
1. Build context block from user_context
2. Select domain-specific system prompt based on intent
3. Format full prompt with all sections
4. Call HF LLM with prompt
5. Parse XML output
6. Validate parsed output
7. If invalid: retry with stricter prompt at lower temperature

Returns ParsedLLMOutput:
{
  reasoning:  "User has Python skills. Backend roles value...",
  response:   "Highlight your Python expertise...",
  confidence: 0.87,
  caveats:    ""
}

Retry behavior:
- First attempt: temperature=0.7 (more creative)
- If parsing fails: temperature=0.3 (stricter adherence to format)
```

---

#### 2. `_build_prompt(message, history, user_context, intent, encoded_history) → str`
```python
Constructs the full prompt for HF models.

Structure:
1. Domain-specific system prompt (12 variants per intent)
2. Context block (skills, goals, experience, location)
3. History block (encoded_history from context_encoder)
4. XML format instructions
5. User message
6. "AURA:" prefix to trigger assistant response

Example domain prompt for resume_review:
"You are an expert resume coach and ATS specialist.
 You help users craft professional, impactful resumes tailored to specific roles."

Total prompt is ~500-800 tokens typically
Sent to HF as single combined prompt (not messages array)
```

---

#### 3. `_call_hf(client: OpenAI, prompt: str, temperature: float) → str`
```python
Calls HuggingFace Inference API via OpenAI-compatible endpoint.

API Details:
- Endpoint: https://router.huggingface.co/v1
- Auth: HF_TOKEN environment variable
- Model: HF_MODEL env var (default: Mistral-7B)

Parameters:
- max_tokens: 1024
- temperature: 0.7 (default) or 0.3 (retry)

Returns: Raw LLM output string (may or may not contain valid XML)

Main entry point: `get_client() → OpenAI`
- Singleton client initialization
- Cached globally
```

---

#### 4. `run_neutralized(message, original: ParsedLLMOutput, intent, user_context) → str`
```python
Generates bias-neutral alternative response.

Trigger: Only called if bias_score.flagged (composite > 0.4)

Process:
1. Build neutralization prompt combining:
   - Original domain prompt
   - Request to remove identified biases
   - "Maintain helpfulness while ensuring neutrality"
2. Call LLM with temperature=0.3
3. Extract recommendation from XML
4. Return as plain string

Returns: String (or None if not applicable)

Used in: InferResponse.neutralized_response field
```

---

## 💡 `pipeline/xai_module.py`
**Purpose**: Build explainability data showing which factors influenced response

### Functions

#### 1. `compute_shap_tokens(message: str, intent: IntentLabel) → list[ShapToken]`
```python
Attribute importance to individual tokens based on intent signal.

Process:
1. Tokenize message (simple word tokenization)
2. Filter out stopwords (< 3 chars)
3. For each remaining token:
   - Embed token
   - Embed intent signal keywords
   - Compute cosine_similarity
   - Store (token, score) pair
4. Sort descending, return top-10

Example output:
[
  ShapToken(token="python", score=0.812),
  ShapToken(token="backend", score=0.756),
  ShapToken(token="resume", score=0.643)
]

Use: Frontend highlights most influential words in user query
```

---

#### 2. `compute_attention_summary(response, user_context, history) → str`
```python
Generate human-readable 1-line summary of response drivers.

Process:
1. Collect all context sources:
   - user_context.skills
   - user_context.goals
   - user_context.location
   - user_context.constraints
   - Last 3 history user messages
2. For each source:
   - Embed source text
   - Compute similarity to response
   - Store (label, score) pair
3. Sort by score descending
4. Pick top-2 and format into sentence

Example output:
"Response primarily influenced by: skills and career goals."

Fallback if no context:
"Response based on general career knowledge."

Use: Frontend displays as explanatory text under response
```

---

#### 3. `compute_response_quality(message, response, intent, reasoning) → float`
```python
Validates response quality across 4 dimensions.

Dimensions (weighted):
1. Semantic match (35%)
   = cosine_similarity(embed(message), embed(response))
   Measures: Does response address the query?

2. Intent alignment (30%)
   = cosine_similarity(embed(response), embed(INTENT_SIGNALS[intent]))
   Measures: Does response match intent domain?

3. CoT coherence (25%)
   = cosine_similarity(embed(reasoning), embed(response))
   Measures: Do reasoning and recommendation align?

4. Length sanity (10%)
   = 1.0 if len(response.split()) >= MIN_TOKENS[intent], else 0.0
   Measures: Is response sufficiently detailed?

Formula:
quality = 0.35×semantic + 0.30×alignment + 0.25×coherence + 0.10×length

Range: 0.0 to 1.0
Used: Internal quality validation (not exposed in response)
```

---

#### 4. `build_xai_data(...) → XAIData`
```python
Master function - assembles complete explainability data.

Parameters:
- message: User query string
- response: LLM-generated recommendation
- reasoning: LLM chain-of-thought
- intent: Classified intent
- user_context: Enriched user context
- history: Conversation history

Process:
1. Call compute_context_contributions()
2. Call compute_shap_tokens()
3. Call compute_attention_summary()
4. Assemble into XAIData struct

Returns:
XAIData(
  context_contributions=[...],  # Top-5 context items
  shap_tokens=[...],            # Top-10 influential tokens
  attention_summary="..."       # 1-line summary
)

Included in: InferResponse.xai_data
```

---

## 🚨 `pipeline/bias_detector.py`
**Purpose**: Detect 4 types of response bias and score overall bias level

### Functions

#### 1. `check_toxicity(response: str) → float [async]`
```python
Detects abusive/discouraging language.

Toxic signals:
- "you are worthless"
- "this is stupid"
- "you will never succeed"
- "give up now"
- "you are not good enough"

Process:
1. Embed response
2. For each toxic signal:
   - Embed signal
   - Compute cosine_similarity
3. Return max similarity

Range: 0.0 (clean) to 1.0 (highly toxic)
```

---

#### 2. `check_gendered_language(response: str) → float [async]`
```python
Detects male/female-coded language imbalance.

Male-coded words (15):
aggressive, ambitious, assertive, confident, dominant, driven, fearless, 
independent, strong, competitive, decisive, determined, bold, direct, outspoken

Female-coded words (15):
collaborative, cooperative, empathetic, gentle, nurturing, sensitive, 
supportive, warm, compassionate, emotional, affectionate, polite, modest, 
caring, soft

Process:
1. Extract words from response
2. Count male-coded hits
3. Count female-coded hits
4. imbalance = |male - female| / (male + female)

Range: 0.0 (neutral) to 1.0 (heavily gendered)
```

---

#### 3. `check_demographic_parity(message, response) → float [async]`
```python
Treatment fairness across demographics using gender-swap test.

Process:
1. Swap pronouns in original message:
   he↔she, him↔her, his↔hers, man↔woman, etc.
2. Generate hypothetical response to swapped message
   (NOT actually done; realization is simpler)
3. Embed original response
4. Embed swapped message
5. Compute similarity
6. bias_score = 1.0 - similarity

Logic: If same message with different gender gets different response embeddings,
       that indicates demographic bias

Range: 0.0 (fair) to 1.0 (biased)
```

---

#### 4. `check_privilege_assumption(response: str) → float [async]`
```python
Detects assumptions of access to paid or privileged resources.

Privilege signals (9):
- "attend a bootcamp"      - attend a bootcamp (expensive)
- "take an online course"  - requires time/money
- "buy a course"           - explicit cost
- "invest in training"     - explicit cost
- "hire a career coach"    - expensive service
- "attend networking events" - may require membership
- "get a certification"    - expensive
- "pursue a degree"        - major investment
- "subscribe to"           - recurring cost

Process:
1. Check if signal keywords appear text-wise
2. For any missing: embed response, check similarity to signal
   - If similarity > 0.72: count as hit
3. score = min(1.0, hits / 3.0)

Range: 0.0 (no assumption) to 1.0 (strong assumption)

Example: Responding "take an online course" to someone in poverty
         = high privilege_assumption score
```

---

#### 5. `run_bias_detection(message, response) → BiasScore [async]`
```python
Orchestrates all 4 bias checks in parallel.

Process:
1. Run all 4 checks concurrently using asyncio.gather()
2. Compute weighted composite:
   composite = 0.35×toxicity + 0.25×gendered + 0.25×parity + 0.15×privilege
3. Flag if composite > 0.4 (moderate-high bias)
4. Package into BiasScore struct

Returns:
BiasScore(
  composite=0.25,
  checks=BiasChecks(
    toxicity=0.05,
    gendered_language=0.12,
    demographic_parity=0.18,
    privilege_assumption=0.45
  ),
  flagged=False  # composite ≤ 0.4
)

Flagged responses trigger: run_neutralized() in Step 6
```

---

#### 6. `detect_bias(message: str, response: str) → BiasScore [sync wrapper]`
```python
Synchronous wrapper around run_bias_detection().

Used by: main.py in non-async context

Process:
- Runs asyncio.run(run_bias_detection(...))
- Returns BiasScore

Purpose: Allows calling async function from sync code
```

---

## 📝 `utils/xml_parser.py`
**Purpose**: Parse LLM output structured as XML

### Functions

#### 1. `parse_llm_output(raw: str) → ParsedLLMOutput`
```python
Extracts structured data from XML-formatted LLM output.

Expected format:
<reasoning>step-by-step thinking here</reasoning>
<recommendation>user-facing response here</recommendation>
<confidence>0.87</confidence>
<caveats>any uncertainty notes here</caveats>

Process:
1. Extract reasoning tag
2. Extract recommendation tag
3. Extract confidence tag → parse as float
4. Extract caveats tag
5. Apply validation

Fallback behaviors:
- If recommendation missing: use entire raw output
- If reasoning missing: use "No reasoning chain provided."
- If confidence unparseable: use 0.5 (neutral default)
- If caveats missing: use "" (empty string)

Returns:
ParsedLLMOutput(
  reasoning="User has Python skills. Backend roles value...",
  response="Highlight your Python expertise...",
  confidence=0.87,
  caveats=""
)
```

---

#### 2. `_extract(text: str, tag: str) → str`
```python
Regex-based tag extraction helper.

Pattern: <tag>...</tag>
Flags: DOTALL | IGNORECASE (handles multiline + case variants)

Returns: Content between tags, trimmed, or empty string if not found

Example:
_extract("<reasoning>Hello</reasoning>", "reasoning") → "Hello"
_extract("No tags here", "reasoning") → ""
```

---

#### 3. `_parse_confidence(value: str) → float`
```python
Robust confidence string-to-float parser.

Handles:
- "0.87"     → 0.87
- "87%"      → 0.87
- "87"       → 0.87 (assumes percentage)
- garbage    → 0.5 (neutral fallback)

Clamps to [0.0, 1.0] range

Returns float always in valid range
```

---

#### 4. `is_valid_output(parsed: ParsedLLMOutput) → bool`
```python
Sanity check before accepting parsed output.

Checks:
✓ len(response) > 20 chars (not empty/too short)
✓ len(reasoning) > 10 chars (reasoning provided)
✓ 0.0 ≤ confidence ≤ 1.0 (valid range)

Returns: True if all pass, False if any fails

Used by: run_llm() to trigger retry on failure
```

---

## 🔧 `utils/embedder.py`
**Purpose**: Text embeddings and similarity operations

### Functions

#### 1. `get_model() → SentenceTransformer`
```python
Lazy-loads embedding model once at module level.

Model: sentence-transformers/all-MiniLM-L6-v2
- 384-dimensional embeddings
- Small & fast (12M parameters)
- Pre-trained on semantic similarity

Fallback: Offline mode if online load fails (uses cached models)

Caching: Global _model variable prevents reloading
```

---

#### 2. `embed(text: str) → ndarray[384]`
```python
Encodes single text string into 384-dim normalized embedding.

Process:
1. Load model via get_model()
2. Encode text with normalize_embeddings=True
3. Return ndarray

Returns: 1D array of 384 floats, L2-normalized
Normalized embeddings enable fast cosine_similarity via dot product
```

---

#### 3. `embed_batch(texts: list[str]) → ndarray[n, 384]`
```python
Batch encodes multiple texts efficiently.

Process:
1. Load model via get_model()
2. Encode all texts at once (more efficient than loop)
3. Return normalized embeddings

Returns: 2D array (n_texts × 384), L2-normalized

Used by: context_encoder for computing multiple similarities
```

---

#### 4. `cosine_similarity(a: ndarray, b: ndarray) → float`
```python
Computes cosine similarity between two embeddings.

Formula: similarity = dot_product(a, b)
(Valid for L2-normalized vectors)

Returns: float in [0, 1] range
- 1.0 = identical direction
- 0.5 = orthogonal
- 0.0 = opposite direction

Used by: All modules that need semantic similarity scores
```

---

#### 5. `top_n_similar(query: str, candidates: list[str], n: int = 3) → list[tuple[str, float]]`
```python
Finds top-N most similar candidates to query string.

Process:
1. Embed query
2. Batch embed all candidates
3. Compute all similarities
4. Sort descending
5. Return top-N with scores

Returns:
[
  ("candidate_1", 0.94),
  ("candidate_2", 0.87),
  ("candidate_3", 0.72)
]

Used by: context_encoder, xai_module, bias_module
```

---

## 🎯 `models/schemas.py`
**Purpose**: Pydantic data models for request/response validation

### Enums
```python
class IntentLabel(str, Enum):
  resume_review, salary_negotiation, interview_prep, job_search,
  skill_gap, career_switch, bias_complaint, general_question,
  motivation, networking, education, rejection_handling
```

### Request Model
```python
class InferRequest(BaseModel):
  message: str                          # User query
  history: list[HistoryTurn] = []       # Conversation history
  user_context: UserContext = UserContext()  # User profile
  session_id: str                       # Session identifier
```

### Response Models
```python
class InferResponse(BaseModel):
  response: str                         # Main recommendation
  reasoning: str                        # CoT reasoning
  intent: IntentLabel                   # Classified intent
  confidence: float                     # LLM confidence (0.0-1.0)
  xai_data: XAIData                     # Explainability data
  bias_score: BiasScore                 # Bias detection results
  reliability: ReliabilityScore         # Reliability assessment
  neutralized_response: Optional[str]   # Alternative if biased
  caveat: Optional[str]                 # Uncertainty warning
  session_id: str                       # Session identifier
```

---

## 🔗 Data Flow Connections

```
Input (InferRequest)
    ↓
[Step 1] context_encoder.extract_entities() + update_user_context()
    ↓ outputs: UserContext, encoded_history
    ↓
[Step 2] intent_classifier.classify_intent()
    ↓ outputs: intent, intent_confidence
    ↓
[Step 3] llm_reasoner.run_llm() → xml_parser.parse_llm_output()
    ↓ outputs: reasoning, response, llm_confidence
    ↓
[Step 4] xai_module.build_xai_data()
    ├→ calls: compute_context_contributions() [from context_encoder]
    ├→ calls: compute_shap_tokens()
    └→ calls: compute_attention_summary()
    ↓ outputs: XAIData
    ↓
[Step 5] bias_detector.detect_bias()
    ├→ parallel: check_toxicity, check_gendered_language, etc.
    ↓ outputs: BiasScore, flagged: bool
    ↓ [if flagged]
    ├→ llm_reasoner.run_neutralized()
    └→ outputs: neutralized_response
    ↓
[Step 7] Compute ReliabilityScore from 4 pillars
    ↓ outputs: ReliabilityScore with label
    ↓
Output (InferResponse)
```

---

## Environment Variables

```bash
HF_TOKEN           # HuggingFace API token (required)
HF_MODEL           # LLM model name (default: mistralai/Mistral-7B-Instruct-v0.3)
HF_HUB_OFFLINE     # "True" for offline mode (uses cached models)
```

---

## Model Loads (One-Time at Module Import)

| Module | Model | Version | Size | Purpose |
|--------|-------|---------|------|---------|
| context_encoder | spacy en_core_web_sm | 3.7 | 40MB | NER entity extraction |
| intent_classifier | facebook/bart-large-mnli | - | 1.6GB | Zero-shot classification |
| embedder | all-MiniLM-L6-v2 | - | 90MB | Semantic embeddings |
| llm_reasoner | Mistral-7B (HF API) | v0.3 | - (remote) | Main reasoning |

---

## Performance Tips

1. **Batch embeddings** when computing multiple similarities
2. **Cache embeddings** for repeated context items across turns
3. **Parallel bias checks** via asyncio (already implemented)
4. **Compress history** with decay weighting (prevents token explosion)
5. **Lazy model loading** (load on first infer, reuse after)

---

## Testing Entry Points

```python
# Test intent classification
from pipeline.intent_classifier import classify_intent
intent, conf, top3 = classify_intent("How should I update my resume for Python roles?")

# Test entity extraction
from pipeline.context_encoder import extract_entities
entities = extract_entities("I have 3 years Python experience in Mumbai")

# Test bias detection
from pipeline.bias_detector import detect_bias
bias_score = detect_bias("I'm a man", "Here are some tips for aggressive negotiation...")

# Test embeddings
from utils.embedder import embed, cosine_similarity
emb1 = embed("Python developer")
emb2 = embed("backend engineer")
sim = cosine_similarity(emb1, emb2)  # ~0.85
```

