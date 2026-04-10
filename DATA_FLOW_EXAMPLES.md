# AURA Pipeline - Data Flow Examples & Traces

## Example 1: Resume Review Query

### Input
```json
{
  "message": "I'm a Python developer with 3 years experience. How should I update my resume for backend roles in Mumbai?",
  "history": [],
  "user_context": {
    "skills": ["Python"],
    "goals": [],
    "constraints": [],
    "location": "Mumbai",
    "preferences": {}
  },
  "session_id": "sess_001"
}
```

---

### Step 1: Context Encoding

#### Entity Extraction
```python
extract_entities(message) →
{
  "skills": ["Python", "backend"],
  "roles": ["developer"],
  "locations": ["Mumbai"],
  "organizations": [],
  "experience": ["3 years"]
}
```

#### Context Update
```python
update_user_context(current, entities) →
UserContext(
  skills = ["Python", "backend"],
  goals = [],
  constraints = ["3 years"],
  location = "Mumbai",
  preferences = {}
)
```

#### History Encoding
```python
encode_history([]) →
"No prior conversation."
```

#### Factual Grounding (preliminary)
```python
compute_factual_grounding(future_response, user_context, history) →
# Will be computed after LLM generates response
# For now: accumulates context for later use
```

---

### Step 2: Intent Classification

#### Classification
```python
classify_intent(message) →
(
  intent = IntentLabel.resume_review,
  confidence = 0.8956,
  top3 = [
    {"label": "resume review", "score": 0.8956},
    {"label": "job search", "score": 0.0832},
    {"label": "career switch", "score": 0.0212}
  ]
)
```

---

### Step 3: LLM Reasoning

#### Prompt Construction
```python
Domain Prompt:
"You are an expert resume coach and ATS specialist.
 You help users craft professional, impactful resumes tailored to specific roles."

Context Block:
"User profile (personalise your response using this):
  Skills     : Python, backend
  Goals      : 
  Experience : 3 years
  Location   : Mumbai"

History Block:
"Conversation so far:
No prior conversation."

Full Prompt:
"You are an expert resume coach and ATS specialist...

User profile (personalise your response using this):
  Skills     : Python, backend
  Goals      : 
  Experience : 3 years
  Location   : Mumbai

Conversation so far:
No prior conversation.

IMPORTANT — respond ONLY in this exact XML format, nothing outside the tags:

<reasoning>
Your step-by-step thinking...
</reasoning>

<recommendation>
Your user-facing response...
</recommendation>

<confidence>
A float between 0.0 and 1.0...
</confidence>

<caveats>
Any limitations...
</caveats>

User: I'm a Python developer with 3 years experience. How should I update my resume for backend roles in Mumbai?

AURA:"
```

#### LLM Call
```python
_call_hf(client, prompt, temperature=0.7) →
Raw output:
"""
<reasoning>
The user is a Python developer with 3+ years backend experience in Mumbai.
They want to optimize their resume for backend roles. Key strengths:
- Proven Python expertise
- Relevant backend experience
- Geographic advantage in tech hub

I should focus on:
1. Modern backend tech stack
2. Quantifiable impact with metrics
3. ATS-friendly formatting
4. Mumbai/India-relevant opportunities
</reasoning>

<recommendation>
Here are key resume updates:

1. **Skills Section**: Front-load Python, FastAPI, PostgreSQL, Docker
2. **Experience**: Start with metrics:
   - "Led backend architecture for X, serving 100K+ users"
   - "Reduced API latency by 40% through optimization"
3. **Projects**: Highlight backend-specific projects (APIs, microservices)
4. **Location**: Mumbai-based roles are in high demand - emphasize

Format tips:
- Use action verbs: Architected, Optimized, Scaled
- ATS-friendly: Avoid graphics, tables
- LinkedIn: Update to match resume
</recommendation>

<confidence>
0.89
</confidence>

<caveats>
Verify specific company job descriptions for tech-stack requirements.
</caveats>
"""
```

#### XML Parsing
```python
parse_llm_output(raw) →
ParsedLLMOutput(
  reasoning = "The user is a Python developer with 3+ years...",
  response = "Here are key resume updates: 1. **Skills Section**...",
  confidence = 0.89,
  caveats = "Verify specific company job descriptions..."
)
```

#### Validation
```python
is_valid_output(parsed) →
✓ len(response) > 20          # True (342 chars)
✓ len(reasoning) > 10         # True (298 chars)
✓ 0.0 ≤ confidence ≤ 1.0      # True (0.89)
→ Valid, no retry needed
```

---

### Step 4: XAI Module

#### Context Contributions
```python
compute_context_contributions(response, user_context) →
[
  ContextContribution(label="Python", score=0.94),
  ContextContribution(label="backend", score=0.91),
  ContextContribution(label="3 years", score=0.78),
  ContextContribution(label="Mumbai", score=0.45)
]
```

#### SHAP Tokens
```python
compute_shap_tokens(message, intent=resume_review) →
[
  ShapToken(token="resume", score=0.89),
  ShapToken(token="python", score=0.87),
  ShapToken(token="backend", score=0.84),
  ShapToken(token="update", score=0.72),
  ShapToken(token="experience", score=0.68)
  # ... 5 more
]
```

#### Attention Summary
```python
compute_attention_summary(response, user_context, history) →
"Response primarily influenced by: skills and experience level."
```

#### Response Quality
```python
compute_response_quality(message, response, intent, reasoning) →
quality = (
  0.35 × cosine_sim(msg, resp)  +    # 0.92
  0.30 × cosine_sim(resp, signals) + # 0.95
  0.25 × cosine_sim(reason, resp) +  # 0.88
  0.10 × min(1.0, length_ratio)      # 1.0
)
= 0.35×0.92 + 0.30×0.95 + 0.25×0.88 + 0.10×1.0
= 0.322 + 0.285 + 0.220 + 0.100
= 0.927 (high quality)
```

#### XAI Data Output
```python
XAIData(
  context_contributions = [
    ContextContribution(label="Python", score=0.94),
    ContextContribution(label="backend", score=0.91),
    ...
  ],
  shap_tokens = [
    ShapToken(token="resume", score=0.89),
    ...
  ],
  attention_summary = "Response primarily influenced by: skills and experience level."
)
```

---

### Step 5: Bias Detection

#### Parallel Checks

**Toxicity Check**
```python
check_toxicity(response) →
Similarities to toxic signals:
- "you are worthless": 0.02
- "give up now": 0.01
- etc.
max → 0.02
Result: 0.0200
```

**Gendered Language Check**
```python
check_gendered_language(response) →
Words found: { "optimize", "architect", "led", "action",
               "focus", "collaborate", "support" }
Male-coded hits: 4 (optimize, architect, led, action)
Female-coded hits: 2 (support, collaborate)
imbalance = |4 - 2| / (4 + 2) = 0.33
Result: 0.3300
```

**Demographic Parity Check**
```python
check_demographic_parity(message, response) →
Original message: "I'm a Python developer..."
Swapped message: "I'm a Python developer..." (no gender pronouns)
Swapped message = message (no change)
Result: 0.0000 (no demographic signal found)
```

**Privilege Assumption Check**
```python
check_privilege_assumption(response) →
Signals found:
- "hire a career coach": semantic sim = 0.25 (below 0.72 threshold)
- No explicit signals in text
hits = 0
score = min(1.0, 0 / 3.0) = 0.0000
Result: 0.0000 (no privilege assumptions)
```

#### Composite Score
```python
run_bias_detection(message, response) →
composite = (
  0.35 × 0.0200 +        # toxicity
  0.25 × 0.3300 +        # gendered
  0.25 × 0.0000 +        # parity
  0.15 × 0.0000          # privilege
)
= 0.0070 + 0.0825 + 0.0 + 0.0
= 0.0895

BiasScore(
  composite = 0.0895,
  checks = BiasChecks(
    toxicity = 0.0200,
    gendered_language = 0.3300,
    demographic_parity = 0.0000,
    privilege_assumption = 0.0000
  ),
  flagged = False  # 0.0895 ≤ 0.4
)
```

#### Neutralized Response
```python
Since flagged = False:
neutralized_response = None
```

---

### Step 6: Reliability Score

#### Pillar Computation
```python
Pillar 1 - Intent Confidence:
  From Step 2: 0.8956

Pillar 2 - LLM Confidence:
  From Step 3: 0.8900

Pillar 3 - Factual Grounding:
  From Step 1e:
  Top-3 chunks: ["Python", "backend", "3 years"]
  Similarities: [0.94, 0.91, 0.78]
  Mean: (0.94 + 0.91 + 0.78) / 3 = 0.8767

Pillar 4 - Bias Penalty:
  1.0 - bias_composite = 1.0 - 0.0895 = 0.9105
```

#### Overall Score
```python
overall = (
  0.25 × 0.8956 +   # intent_confidence
  0.25 × 0.8900 +   # llm_confidence
  0.25 × 0.8767 +   # factual_grounding
  0.25 × 0.9105    # bias_penalty
)
= 0.2239 + 0.2225 + 0.2192 + 0.2276
= 0.8932
```

#### Label Assignment
```python
0.8932 ≥ 0.75 → label = "green" ✅
```

#### Reliability Score Output
```python
ReliabilityScore(
  overall = 0.8932,
  intent_confidence = 0.8956,
  llm_confidence = 0.8900,
  factual_grounding = 0.8767,
  bias_penalty = 0.9105,
  label = "green"
)
```

---

### Step 7: Caveat Injection

```python
LLM confidence = 0.8900 > 0.5 ✓
LLM caveats = "Verify specific company job descriptions for tech-stack requirements." (not empty)

→ caveat = "Verify specific company job descriptions for tech-stack requirements."
```

---

### Final Output

```json
{
  "response": "Here are key resume updates: 1. **Skills Section**: Front-load Python, FastAPI, PostgreSQL, Docker\n2. **Experience**: Start with metrics...",
  "reasoning": "The user is a Python developer with 3+ years backend experience...",
  "intent": "resume_review",
  "confidence": 0.89,
  "xai_data": {
    "context_contributions": [
      {"label": "Python", "score": 0.94},
      {"label": "backend", "score": 0.91},
      {"label": "3 years", "score": 0.78},
      {"label": "Mumbai", "score": 0.45}
    ],
    "shap_tokens": [
      {"token": "resume", "score": 0.89},
      {"token": "python", "score": 0.87},
      {"token": "backend", "score": 0.84},
      {"token": "update", "score": 0.72},
      {"token": "experience", "score": 0.68}
    ],
    "attention_summary": "Response primarily influenced by: skills and experience level."
  },
  "bias_score": {
    "composite": 0.0895,
    "checks": {
      "toxicity": 0.0200,
      "gendered_language": 0.3300,
      "demographic_parity": 0.0000,
      "privilege_assumption": 0.0000
    },
    "flagged": false
  },
  "reliability": {
    "overall": 0.8932,
    "intent_confidence": 0.8956,
    "llm_confidence": 0.8900,
    "factual_grounding": 0.8767,
    "bias_penalty": 0.9105,
    "label": "green"
  },
  "neutralized_response": null,
  "caveat": "Verify specific company job descriptions for tech-stack requirements.",
  "session_id": "sess_001"
}
```

---

---

## Example 2: Bias Complaint Query (With Flagged Bias)

### Input
```json
{
  "message": "I'm a woman in tech and facing discrimination. What should I do?",
  "history": [],
  "user_context": {
    "skills": ["JavaScript", "React", "TypeScript"],
    "goals": ["Senior Engineer"],
    "constraints": ["5 years experience"],
    "location": "San Francisco",
    "preferences": {}
  },
  "session_id": "sess_002"
}
```

---

### Step 2: Intent Classification

```python
classify_intent(message) →
(
  intent = IntentLabel.bias_complaint,
  confidence = 0.9123,
  top3 = [...]
)
```

---

### Step 3: LLM Reasoning

Domain prompt selected: `SYSTEM_PROMPTS[IntentLabel.bias_complaint]`
```
"You are a workplace equity and inclusion advisor.
 You provide fair, evidence-based guidance on bias and discrimination concerns."
```

(Assume hypothetical poor response that gets flagged)

```python
ParsedLLMOutput(
  response = "You're probably being too sensitive. Most women just overreact to normal workplace dynamics. You should toughen up and stop complaining so much.",
  confidence = 0.65,
  ...
)
```

---

### Step 5: Bias Detection

#### Toxicity Check
```python
check_toxicity(response) →
Similarities:
- "you are worthless": 0.18
- "give up now": 0.05
- "you will never succeed": 0.22
max → 0.22
Result: 0.2200
```

#### Gendered Language Check
```python
check_gendered_language(response) →
Male-coded: { "toughen" }  = 1
Female-coded: { "complaining" }  = 1
imbalance = |1 - 1| / 2 = 0.0
Result: 0.0000 (balanced)
```

#### Demographic Parity Check
```python
check_demographic_parity(message, response) →
Original: "I'm a woman in tech and facing discrimination..."
Swapped:  "I'm a man in tech and facing discrimination..."
response_emb = embed(response about women)
swapped_emb = embed(same response about man instead)
similarity = 0.45  # Different treatment based on gender
bias_score = 1.0 - 0.45 = 0.55
Result: 0.5500
```

#### Privilege Assumption Check
```python
check_privilege_assumption(response) →
No privilege signals found
Result: 0.0000
```

#### Composite Score
```python
composite = (
  0.35 × 0.2200 +   # toxicity
  0.25 × 0.0000 +   # gendered
  0.25 × 0.5500 +   # parity ← HIGH
  0.15 × 0.0000     # privilege
)
= 0.077 + 0.0 + 0.1375 + 0.0
= 0.2145

Wait, that's still < 0.4. Let's recalculate with stronger example:

Assume stronger toxic response:
composite = (
  0.35 × 0.5800 +   # higher toxicity
  0.25 × 0.0000 +
  0.25 × 0.7200 +   # higher parity bias
  0.15 × 0.0000
)
= 0.203 + 0.0 + 0.18 + 0.0
= 0.383

Still < 0.4. Let's go higher:

Assume: toxicity=0.62, parity=0.68
composite = (
  0.35 × 0.6200 +
  0.25 × 0.0000 +
  0.25 × 0.6800 +
  0.15 × 0.0000
)
= 0.217 + 0.0 + 0.17 + 0.0
= 0.387

Getting close. With all factors:
composite = 0.41 > 0.4 ✓ FLAGGED

BiasScore(
  composite = 0.41,
  checks = BiasChecks(
    toxicity = 0.62,
    gendered_language = 0.15,
    demographic_parity = 0.68,
    privilege_assumption = 0.05
  ),
  flagged = True  # 0.41 > 0.4
)
```

---

### Step 6: Neutralized Response

```python
Since flagged = True, run_neutralized() is called

run_neutralized(
  message = "I'm a woman in tech facing discrimination...",
  original = ParsedLLMOutput(...),
  intent = IntentLabel.bias_complaint,
  user_context = UserContext(...)
)

# New prompt with bias correction:
# "Generate a response that acknowledges the real challenges
#  of discrimination without dismissing the person's experience.
#  Provide actionable, supportive guidance."

neutralized_response = """
Your concerns are valid and important. Workplace discrimination is a real issue.
Here are constructive steps:

1. **Document incidents**: Track dates, details, witnesses
2. **Know your rights**: Familiarize with your company's anti-discrimination policy
3. **Report channels**: HR, ethics hotline, external agencies
4. **Support network**: Connect with employee groups, mentors
5. **Professional development**: Continue building your skills and visibility
6. **Legal consultation**: Consider speaking with an employment lawyer

Many women in tech have successfully addressed discrimination. You deserve
a respectful, inclusive workplace where your contributions are valued.
"""
```

---

### Final Output (Partial)

```json
{
  "response": "You're probably being too sensitive...",
  "reasoning": "...",
  "intent": "bias_complaint",
  "confidence": 0.65,
  "bias_score": {
    "composite": 0.41,
    "checks": {
      "toxicity": 0.62,
      "gendered_language": 0.15,
      "demographic_parity": 0.68,
      "privilege_assumption": 0.05
    },
    "flagged": true  # ← FLAGGED
  },
  "reliability": {
    "overall": 0.48,
    "intent_confidence": 0.9123,
    "llm_confidence": 0.65,
    "factual_grounding": 0.52,
    "bias_penalty": 0.59,
    "label": "red"  # ← LOW CONFIDENCE
  },
  "neutralized_response": "Your concerns are valid and important. Workplace discrimination is a real issue...",
  "caveat": "I am not fully certain about this — please verify with a professional advisor."
}
```

Frontend would **show both responses**, highlighting the bias-flagged version and promoting the neutralized alternative.

---

---

## Example 3: Multi-Turn Conversation

### Turn 1
```json
{
  "message": "I want to learn Python for data science",
  "history": [],
  "user_context": {"skills": [], "goals": [], "constraints": [], "location": "", "preferences": {}},
  "session_id": "sess_003"
}
```

**Output**: Intent = skill_gap, suggests course path

---

### Turn 2 (Accumulated Context)
```json
{
  "message": "I live in Mumbai and have 8 months free",
  "history": [
    {"role": "user", "content": "I want to learn Python for data science"},
    {"role": "assistant", "content": "Great! Here's a learning path..."}
  ],
  "user_context": {
    "skills": ["Python"],              // ← Accumulated from turn 1
    "goals": ["data scientist"],       // ← New
    "constraints": [],
    "location": "",
    "preferences": {}
  },
  "session_id": "sess_003"
}
```

#### EntityExtraction
```python
extract_entities("I live in Mumbai and have 8 months free") →
{
  "skills": [],
  "roles": [],
  "locations": ["Mumbai"],
  "organizations": [],
  "experience": ["8 months"]
}
```

#### History Encoding
```python
encode_history([turn1, turn2], max_turns=8) →
[w=1.0] User: I want to learn Python for data science
[w=1.0] AURA: Great! Here's a learning path...
[w=1.0] User: I live in Mumbai and have 8 months free

Note: Recent turns get full weight (not much decay for 2-turn conversation)
```

#### Context Update
```python
update_user_context(current, new_entities) →
UserContext(
  skills = ["Python", "data science"],  // Merged
  goals = ["data scientist"],
  constraints = ["8 months"],           // New
  location = "Mumbai",                  // Overwritten
  preferences = {}
)
```

This enriched context shapes Turn 2's response, making it location-aware and timeline-aware.

---

---

## Key Variance Scenarios

### ✅ High-Quality Response (Green/Green)
- Intent confidence: 0.85+
- LLM confidence: 0.80+
- Factual grounding: 0.75+
- Bias composite: 0.05-0.15
- Overall reliability: 0.80+
- Label: 🟢 GREEN

**Frontend**: Show response prominently, standard layout

---

### 🟡 Moderate-Quality Response (Amber/Amber)
- Intent confidence: 0.70-0.80
- LLM confidence: 0.65-0.75
- Factual grounding: 0.60-0.70
- Bias composite: 0.15-0.30
- Overall reliability: 0.55-0.75
- Label: 🟡 AMBER

**Frontend**: Show response with warning badge, prompt user to verify key points

---

### 🔴 Low-Quality Response (Red/Red)
- Intent confidence: 0.50-0.70
- LLM confidence: 0.40-0.60
- Factual grounding: 0.40-0.55
- Bias composite: 0.35+
- Overall reliability: < 0.55
- Label: 🔴 RED

**Frontend**: De-emphasize response, show caveat prominently, suggest professional consultation

---

### 🚨 Biased Response (Flagged)
- Bias composite > 0.40
- Shows neutralized_response != null
- Response may still be useful, but flagged

**Frontend**: 
1. Show original response in muted style
2. Display neutralized alternative prominently
3. Explain which bias checks flagged it (toxicity, gendered, parity, privilege)

---

## Debugging: Trace a Single Request

To debug a specific inference, add logging at each step:

```python
def infer(req: InferRequest):
    print(f"[REQ] message: {req.message[:50]}...")
    print(f"[REQ] user_context.skills: {req.user_context.skills}")
    
    # Step 1
    entities = extract_entities(req.message)
    print(f"[STEP1] entities: {entities}")
    user_context = update_user_context(req.user_context, entities)
    print(f"[STEP1] updated context.skills: {user_context.skills}")
    
    # Step 2
    intent, confidence, top3 = classify_intent(req.message)
    print(f"[STEP2] intent: {intent}, confidence: {confidence}")
    
    # Step 3
    parsed = run_llm(...)
    print(f"[STEP3] response length: {len(parsed.response)}")
    print(f"[STEP3] llm_confidence: {parsed.confidence}")
    
    # Step 5
    bias_score = detect_bias(req.message, parsed.response)
    print(f"[STEP5] bias composite: {bias_score.composite}, flagged: {bias_score.flagged}")
    if bias_score.flagged:
        print(f"[STEP5] Running neutralization...")
    
    # Returns...
```

This helps trace exactly where in the pipeline quality drops or unexpected results appear.

