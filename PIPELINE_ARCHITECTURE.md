# AURA AI Pipeline Architecture

## Overview
AURA is a context-aware, explainable, ethical career AI system. The pipeline orchestrates 8 sequential stages to transform a user query into a reliable, bias-checked, explainable response.

---

## Input: JSON Query Structure

### Endpoint
```
POST /ai/infer
Content-Type: application/json
```

### Request Schema (`InferRequest`)
```json
{
  "message": "How should I update my resume for Python backend roles?",
  "history": [
    {"role": "user", "content": "I'm an experienced Python developer"},
    {"role": "assistant", "content": "Great! Let's tailor your resume..."}
  ],
  "user_context": {
    "skills": ["Python", "FastAPI", "PostgreSQL"],
    "goals": ["Backend Developer", "Tech Lead"],
    "constraints": ["3 years experience"],
    "location": "Mumbai",
    "preferences": {}
  },
  "session_id": "sess_abc123"
}
```

---

## Stage-by-Stage Breakdown

### **Step 0: Request Parsing**
- **File**: `models/schemas.py`
- **Operation**: FastAPI deserializes JSON into Pydantic models
- **Output**: Validated `InferRequest` object

---

### **Step 1: Context Encoding**
**File**: `pipeline/context_encoder.py`

#### 1a. Entity Extraction
- **Function**: `extract_entities(message: str) → dict`
- **Method**: spaCy NER (Named Entity Recognition)
- **Extracts**:
  - `skills`: Python, Java, Machine Learning (keyword matching + NER)
  - `roles`: Developer, Engineer, Analyst (noun chunks + keyword matching)
  - `locations`: Cities/regions (spaCy GPE/LOC entities)
  - `organizations`: Company names (spaCy ORG entities)
  - `experience`: "3 years", "2+ years" (regex patterns)

**Output**:
```python
{
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "roles": ["Backend Developer"],
  "locations": ["Mumbai"],
  "organizations": [],
  "experience": ["3 years"]
}
```

#### 1b. Context Update
- **Function**: `update_user_context(current: UserContext, entities: dict) → UserContext`
- **Behavior**: Accumulates entities across turns (never resets within session)
- **Updates**:
  - Skills: `set(current.skills + new_skills)`
  - Goals: `set(current.goals + new_roles)`
  - Constraints: `set(current.constraints + new_experience)`
  - Location: Overwrites if new location found

**Output**: Updated `UserContext`

#### 1c. History Encoding
- **Function**: `encode_history(history: list[HistoryTurn], max_turns=8) → str`
- **Method**: 
  - Takes last 8 turns
  - Applies decay weighting: `weight = 0.9^(age)`
  - Older turns are de-emphasized, recent turns full detail
- **Output**: Formatted string for LLM prompt
```
[w=0.43] User: I'm an experienced Python developer
[w=0.66] AURA: Great! Let's tailor...
[w=1.0] User: How should I update my resume?
```

#### 1d. Context Contributions (for XAI)
- **Function**: `compute_context_contributions(response: str, user_context: UserContext) → list[dict]`
- **Method**: 
  - Creates embeddings for each context item
  - Computes cosine similarity to response embedding
  - Returns top 5 items
- **Output**: List of `{"label": str, "score": float}` for later XAI display

#### 1e. Factual Grounding Score
- **Function**: `compute_factual_grounding(response: str, user_context: UserContext, history: list) → float`
- **Method**:
  - Combines top-3 context chunks most similar to response
  - Returns mean cosine similarity
  - Used directly in Reliability Score (0.0-1.0)

---

### **Step 2: Intent Classification**
**File**: `pipeline/intent_classifier.py`

#### 2a. Zero-shot Classification
- **Function**: `classify_intent(message: str) → tuple[IntentLabel, float, list[dict]]`
- **Model**: `facebook/bart-large-mnli` (zero-shot classifier)
- **Candidate Labels** (12 intent types):
  - `resume_review`, `salary_negotiation`, `interview_prep`, `job_search`
  - `skill_gap`, `career_switch`, `bias_complaint`, `general_question`
  - `motivation`, `networking`, `education`, `rejection_handling`

**Output**:
```python
intent = IntentLabel.resume_review
confidence = 0.9234
top3 = [
  {"label": "resume review", "score": 0.9234},
  {"label": "job search", "score": 0.0521},
  {"label": "skill gap analysis", "score": 0.0245}
]
```

#### 2b. Intent-Response Alignment
- **Function**: `compute_intent_alignment(response: str, intent: IntentLabel) → float`
- **Method**: 
  - Each intent has signal keywords: `INTENT_SIGNALS[intent]`
  - Embeds both response and signal keywords
  - Returns cosine similarity (0.0-1.0)
- **Used in**: Reliability Score computation

---

### **Step 3: LLM Reasoning**
**File**: `pipeline/llm_reasoner.py` | `utils/xml_parser.py`

#### 3a. Prompt Construction
1. **Domain-specific system prompt** selected based on intent:
   - `resume_review` → "You are an expert resume coach and ATS specialist"
   - `salary_negotiation` → "You are an expert salary negotiation coach"
   - etc. (12 per-intent prompts)

2. **Context block** built from `UserContext`:
   ```
   User profile (personalise your response using this):
     Skills     : Python, FastAPI, PostgreSQL
     Goals      : Backend Developer, Tech Lead
     Experience : 3 years
     Location   : Mumbai
   ```

3. **History block** from Step 1c (encoded_history)

4. **Structured output instructions** (XML format):
   ```
   IMPORTANT — respond ONLY in this exact XML format:
   <reasoning>Your step-by-step thinking...</reasoning>
   <recommendation>User-facing response...</recommendation>
   <confidence>0.87</confidence>
   <caveats>Any limitations...</caveats>
   ```

#### 3b. LLM API Call
- **Function**: `run_llm(message, history, user_context, intent, encoded_history) → ParsedLLMOutput`
- **API**: HuggingFace Inference API via OpenAI-compatible client
- **Model**: `mistralai/Mistral-7B-Instruct-v0.3` (configurable)
- **Parameters**:
  - `max_tokens`: 1024
  - `temperature`: 0.7 (or 0.3 on retry)
- **Retry Logic**: If XML parsing fails, retry with stricter prompt at lower temperature

#### 3c. XML Parsing
- **Function**: `parse_llm_output(raw: str) → ParsedLLMOutput`
- **Extraction**: Regex-based tag extraction from `raw` string
  - `<reasoning>...</reasoning>`
  - `<recommendation>...</recommendation>`
  - `<confidence>0.87</confidence>`
  - `<caveats>...</caveats>`

**Output**:
```python
ParsedLLMOutput(
  reasoning="User has Python and FastAPI skills. Backend roles value technical depth...",
  response="Highlight your Python/FastAPI expertise. Quantify impact with metrics...",
  confidence=0.87,
  caveats="Verify specific company requirements"
)
```

---

### **Step 4: XAI Module (Explainability)**
**File**: `pipeline/xai_module.py`

#### 4a. SHAP-lite Token Attribution
- **Function**: `compute_shap_tokens(message: str, intent: IntentLabel) → list[ShapToken]`
- **Method**:
  - Tokenizes user message
  - Each token → embedding
  - Compares token embedding to intent signal embedding
  - Top 10 most influential tokens returned
- **Output**: `[ShapToken(token="python", score=0.812), ...]`
- **Use**: Frontend displays which words pushed toward this intent

#### 4b. Context Contribution Scores
- **Reuses**: `compute_context_contributions()` from Step 1d
- **Output**: Top 5 context items that influenced the response

#### 4c. Attention Summary
- **Function**: `compute_attention_summary(response, user_context, history) → str`
- **Method**: 
  - Embeds response
  - Compares to all context items + recent history turns
  - Returns human-readable 1-liner
- **Output**: `"Response primarily influenced by: skills and career goals."`

#### 4d. Response Quality Score
- **Function**: `compute_response_quality(message, response, intent, reasoning) → float`
- **Dimensions** (weighted):
  - 35% Semantic match (query ↔ response similarity)
  - 30% Intent alignment (response ↔ intent domain keywords)
  - 25% CoT coherence (reasoning ↔ recommendation similarity)
  - 10% Length sanity (response length ≥ intent-specific MIN_TOKENS)
- **Output**: 0.0-1.0 quality score

#### 4e. Master XAI Builder
- **Function**: `build_xai_data(message, response, reasoning, intent, user_context, history) → XAIData`
- **Combines**: All above functions into single struct

**Output**:
```python
XAIData(
  context_contributions=[
    ContextContribution(label="Python", score=0.94),
    ContextContribution(label="Backend Developer", score=0.87)
  ],
  shap_tokens=[
    ShapToken(token="python", score=0.812),
    ShapToken(token="resume", score=0.756)
  ],
  attention_summary="Response primarily influenced by: skills and goals."
)
```

---

### **Step 5: Bias Detection**
**File**: `pipeline/bias_detector.py`

Runs **4 parallel async checks**:

#### 5a. Toxicity Check
- **Function**: `check_toxicity(response: str) → float`
- **Method**: 
  - Pre-defined toxic signal phrases
  - Computes max cosine similarity between response and any toxic signal
- **Output**: 0.0 (clean) → 1.0 (toxic)
- **Examples tested**:
  - "you are worthless"
  - "give up now"
  - "you will never succeed"

#### 5b. Gendered Language Check
- **Function**: `check_gendered_language(response: str) → float`
- **Method**:
  - Male-coded words: aggressive, ambitious, assertive, confident, bold, etc.
  - Female-coded words: collaborative, empathetic, supportive, warm, gentle, etc.
  - `imbalance = |male_hits - female_hits| / total_hits`
- **Output**: 0.0 (neutral) → 1.0 (heavily gendered)

#### 5c. Demographic Parity Check
- **Function**: `check_demographic_parity(message: str, response: str) → float`
- **Method**:
  - Swaps gender pronouns in original message: he↔she, his↔hers, etc.
  - Different recommendation = bias
  - `bias_score = 1 - cosine_similarity(original_response, swapped_response)`
- **Output**: 0.0 (fair) → 1.0 (biased)

#### 5d. Privilege Assumption Check
- **Function**: `check_privilege_assumption(response: str) → float`
- **Method**:
  - Detects recommendations assuming paid resources without knowing user context
  - Signals: "hire a career coach", "buy a course", "attend bootcamp", etc.
  - Counts keyword hits + semantic similarity matches
  - `score = min(1.0, hits / 3.0)`
- **Output**: 0.0 (none) → 1.0 (strong assumption)

#### 5e. Composite Score
- **Function**: `run_bias_detection(message, response) → BiasScore`
- **Weighting**:
  - 35% toxicity (highest priority)
  - 25% gendered_language
  - 25% demographic_parity
  - 15% privilege_assumption

**Output**:
```python
BiasScore(
  composite=0.18,
  checks=BiasChecks(
    toxicity=0.05,
    gendered_language=0.12,
    demographic_parity=0.14,
    privilege_assumption=0.33
  ),
  flagged=False  # composite > 0.4 triggers flag
)
```

---

### **Step 6: Neutralized Response (Conditional)**
**File**: `pipeline/llm_reasoner.py`

- **Trigger**: Only if `bias_score.flagged == True` (composite > 0.4)
- **Function**: `run_neutralized(message, original: ParsedLLMOutput, intent, user_context) → str`
- **Method**:
  - Regenerates response with bias-reduction prompt
  - Uses lower temperature (0.3) for more conservative output
  - Keeps same structure but removes flagged bias patterns
- **Output**: Alternative `neutralized_response: Optional[str]` (or None if not flagged)

---

### **Step 7: Reliability Score**
**File**: `main.py`

#### 7a. Four-Pillar Score Computation

| Pillar | Source | Formula |
|--------|--------|---------|
| **Intent Confidence** | Step 2 | Classifier's top score (0.0-1.0) |
| **LLM Confidence** | Step 3 | Extracted from `<confidence>` tag (0.0-1.0) |
| **Factual Grounding** | Step 1e | Mean similarity to top-3 context chunks (0.0-1.0) |
| **Bias Penalty** | Step 5 | `1.0 - bias_score.composite` (0.0-1.0) |

#### 7b. Overall Reliability
```
overall = 0.25 × intent_confidence
        + 0.25 × llm_confidence
        + 0.25 × factual_grounding
        + 0.25 × bias_penalty
```

Each pillar equally weighted.

#### 7c. Reliability Label
- **🟢 GREEN** ≥ 0.75 → High confidence, use as-is
- **🟡 AMBER** 0.55-0.74 → Moderate confidence, verify key points
- **🔴 RED** < 0.55 → Low confidence, consult professional advisor

**Output**:
```python
ReliabilityScore(
  overall=0.82,
  intent_confidence=0.9234,
  llm_confidence=0.87,
  factual_grounding=0.78,
  bias_penalty=0.82,
  label="green"
)
```

---

### **Step 8: Caveat Injection**
**File**: `main.py`

- **Trigger 1**: If `llm_confidence < 0.5`
  - Caveat: `"I am not fully certain about this — please verify with a professional advisor."`

- **Trigger 2**: If LLM provided caveats in `<caveats>` tag
  - Caveat: Whatever LLM specified

- **Else**: `caveat = None`

---

## Output: JSON Response Structure

### Response Schema (`InferResponse`)
```json
{
  "response": "Highlight your Python/FastAPI expertise. Quantify impact with metrics...",
  "reasoning": "User has Python and FastAPI skills. Backend roles value technical depth...",
  "intent": "resume_review",
  "confidence": 0.87,
  "xai_data": {
    "context_contributions": [
      {"label": "Python", "score": 0.94},
      {"label": "Backend Developer", "score": 0.87}
    ],
    "shap_tokens": [
      {"token": "python", "score": 0.812},
      {"token": "resume", "score": 0.756}
    ],
    "attention_summary": "Response primarily influenced by: skills and goals."
  },
  "bias_score": {
    "composite": 0.18,
    "checks": {
      "toxicity": 0.05,
      "gendered_language": 0.12,
      "demographic_parity": 0.14,
      "privilege_assumption": 0.33
    },
    "flagged": false
  },
  "reliability": {
    "overall": 0.82,
    "intent_confidence": 0.9234,
    "llm_confidence": 0.87,
    "factual_grounding": 0.78,
    "bias_penalty": 0.82,
    "label": "green"
  },
  "neutralized_response": null,
  "caveat": null,
  "session_id": "sess_abc123"
}
```

---

## Data Structure Hierarchy

### Models (Pydantic schemas in `models/schemas.py`)

```
InferRequest
├── message: str
├── history: list[HistoryTurn]
│   ├── role: "user" | "assistant"
│   └── content: str
├── user_context: UserContext
│   ├── skills: list[str]
│   ├── goals: list[str]
│   ├── constraints: list[str]
│   ├── location: str
│   └── preferences: dict
└── session_id: str

InferResponse
├── response: str
├── reasoning: str
├── intent: IntentLabel (enum)
├── confidence: float [0.0, 1.0]
├── xai_data: XAIData
│   ├── context_contributions: list[ContextContribution]
│   │   ├── label: str
│   │   └── score: float [0.0, 1.0]
│   ├── shap_tokens: list[ShapToken]
│   │   ├── token: str
│   │   └── score: float
│   └── attention_summary: str
├── bias_score: BiasScore
│   ├── composite: float [0.0, 1.0]
│   ├── checks: BiasChecks
│   │   ├── toxicity: float [0.0, 1.0]
│   │   ├── gendered_language: float [0.0, 1.0]
│   │   ├── demographic_parity: float [0.0, 1.0]
│   │   └── privilege_assumption: float [0.0, 1.0]
│   └── flagged: bool
├── reliability: ReliabilityScore
│   ├── overall: float [0.0, 1.0]
│   ├── intent_confidence: float [0.0, 1.0]
│   ├── llm_confidence: float [0.0, 1.0]
│   ├── factual_grounding: float [0.0, 1.0]
│   ├── bias_penalty: float [0.0, 1.0]
│   └── label: "green" | "amber" | "red"
├── neutralized_response: Optional[str]
├── caveat: Optional[str]
└── session_id: str
```

---

## Embeddings & Utilities

### `utils/embedder.py`
- **Model**: `sentence-transformers/all-MiniLM-L6-v2` (384-dim embeddings)
- **Functions**:
  - `embed(text: str) → ndarray[384]` — Encodes single text
  - `embed_batch(texts: list[str]) → ndarray` — Batch encoding
  - `cosine_similarity(a, b) → float` — Normalized dot product
  - `top_n_similar(query, candidates, n) → list[tuple[str, float]]` — Ranked similarity

**Used by**: Intent alignment, context contributions, XAI scoring, bias checks

### `utils/xml_parser.py`
- **Functions**:
  - `parse_llm_output(raw: str) → ParsedLLMOutput` — Extract XML tags and parse
  - `is_valid_output(parsed) → bool` — Sanity checks: min length, confidence range
  - `_extract(text, tag) → str` — Regex-based tag extraction
  - `_parse_confidence(value: str) → float` — Robust confidence parsing

---

## Key Design Patterns

### 1. **Module-Level Lazy Loading**
- Models loaded once at import time, cached globally
- Avoids reload overhead on every inference
- Graceful degradation: offline mode fallback

### 2. **Streaming Context Accumulation**
- User context merges entities across conversation turns
- Skills/goals/constraints never reset (per session)
- Location updated on new location detection

### 3. **Hierarchical Decay-Weighted History**
- Recent turns full weight, older turns summarized
- Exponential decay: $weight_i = 0.9^{(\text{age}_i)}$
- Prevents LLM prompt explosion from long conversations

### 4. **Parallel Bias Checks**
- 4 independent checks run async concurrently
- Results combined with explicit weighting
- Composite score > 0.4 triggers neutralization

### 5. **Structured Chain-of-Thought**
- LLM forced into XML format (4 tags)
- Reasoning extracted separately from recommendation
- Enables parsing, validation, re-prompting if needed

### 6. **Multi-Dimensional Quality Scoring**
- Reliability score: 4 equally-weighted pillars
- XAI quality score: 4 dimensions for response validation
- Each dimension independently measurable

---

## API Contract

### Request → Response Flow
```
1. Client sends JSON to POST /ai/infer
2. Pipeline processes through 8 stages
3. Returns complete InferResponse JSON with:
   - Generated response + reasoning
   - Intent classification + confidence
   - Full explainability data (XAI)
   - Bias detection scores
   - Reliability assessment
   - Optional neutralized alternative
   - Optional uncertainty caveat
4. Frontend renders all 6 sections to user
```

---

## Performance Characteristics

| Stage | Model | Latency |
|-------|-------|---------|
| Context Encoding | spaCy (local) | ~50ms |
| Intent Classification | facebook/bart-large-mnli | ~500ms |
| LLM Reasoning | Mistral-7B (HF API) | ~2-4s |
| XML Parsing | Regex (local) | ~5ms |
| XAI Scoring | Embeddings + cosine | ~100ms |
| Bias Detection | Async parallel checks | ~200ms |
| Reliability Score | Weighted computation | ~10ms |
| **Total** | | **~3-5s** |

---

## Error Handling & Fallbacks

1. **LLM Parsing Failure** → Retry with stricter prompt at T=0.3
2. **Invalid Output** → Fallback: treat entire LLM output as recommendation
3. **Missing Tags** → Fill with defaults (empty reasoning, 0.5 confidence)
4. **Model Load Failure** → Try offline mode (cached models)
5. **API Error** → HTTPException 500 with error detail

---

## Constants & Configuration

### Intent Labels (12 types)
`constants.py`: INTENT_SIGNALS dict + MIN_TOKENS dict per intent

### Gender Code Words
`bias_detector.py`: MALE_CODED set + FEMALE_CODED set

### Privilege Signals
`bias_detector.py`: PRIVILEGE_SIGNALS list

### Entity Keywords
`context_encoder.py`: skill_keywords, role_keywords sets

---

## Summary

AURA's architecture is **multi-stage, modular, and ethically grounded**:

✅ **Context-aware**: Maintains user profile, extracts & accumulates entities  
✅ **Intent-driven**: Classifies query purpose, selects domain-specific LLM persona  
✅ **Structured reasoning**: Forces LLM into chain-of-thought XML format  
✅ **Explainable**: SHAP tokens, context contributions, attention summaries  
✅ **Bias-checked**: 4 parallel checks (toxicity, gender, parity, privilege)  
✅ **Reliability-scored**: 4-pillar scoring (intent, LLM, grounding, bias)  
✅ **Language-neutral**: Can swap HF models per intent  
✅ **Graceful degradation**: Offline fallbacks, retry logic, sensible defaults  

Total inference time: **3-5 seconds** per query.
