# AURA Project - Complete Pipeline Architecture Summary

**Created**: April 10, 2026  
**Project**: AURA AI Engine - Context-aware, Explainable, Ethical Career AI  
**Documentation**: 3 comprehensive guides + 1 flow diagram

---

## 📚 Documentation Structure

This architecture exploration consists of **4 comprehensive documents**:

### 1. **PIPELINE_ARCHITECTURE.md** (Primary Reference)
Complete 400+ line guide covering:
- Overview of the system design
- Stage-by-stage breakdown (8 steps)
- Data structures (Pydantic schemas)
- Module responsibilities
- Design patterns used
- Performance characteristics
- Error handling & fallbacks

**Use this when**: Understanding the overall system, learning what each stage does

### 2. **MODULE_REFERENCE.md** (Function Documentation)
Detailed API reference for every module and function:
- `pipeline/context_encoder.py` (5 functions)
- `pipeline/intent_classifier.py` (2 functions)
- `pipeline/llm_reasoner.py` (4 functions)
- `pipeline/xai_module.py` (4 functions)
- `pipeline/bias_detector.py` (6 functions)
- `utils/xml_parser.py` (4 functions)
- `utils/embedder.py` (5 functions)
- Plus schemas, environment variables, testing entries

**Use this when**: Looking up specific function signatures, understanding parameters, learning how to test

### 3. **DATA_FLOW_EXAMPLES.md** (Concrete Examples)
Real execution traces showing data flowing through the system:
- Example 1: Resume review query (successful, high quality)
- Example 2: Bias complaint with flagged response (how neutralization works)
- Example 3: Multi-turn conversation (context accumulation)
- Variance scenarios (green/amber/red reliability labels)

**Use this when**: Understanding concrete data transformations, debugging specific flows, learning edge cases

### 4. **Flow Diagram** (Visual Reference)
Mermaid diagram showing:
- All 8 pipeline stages in sequence
- Data transformations at each stage
- Sub-functions and operations within each stage
- Decision points (bias flagging, retries)
- Final output structure
- Color-coded by stage for easy navigation

**Use this when**: Getting a visual overview, understanding dependencies, explaining to others

---

## 🎯 Quick Navigation

### "I want to understand..."

| Question | Location |
|----------|----------|
| **...the overall system architecture** | Flow Diagram + PIPELINE_ARCHITECTURE.md (Overview) |
| **...what each pipeline stage does** | PIPELINE_ARCHITECTURE.md (Stage-by-Stage Breakdown) |
| **...how a specific function works** | MODULE_REFERENCE.md |
| **...what data structures are used** | PIPELINE_ARCHITECTURE.md (Data Structure Hierarchy) + MODULE_REFERENCE.md (models/schemas) |
| **...how a real query is processed** | DATA_FLOW_EXAMPLES.md (Example 1, Example 2, Example 3) |
| **...when bias is detected** | DATA_FLOW_EXAMPLES.md (Example 2: Bias Complaint Query) |
| **...how context accumulates across turns** | DATA_FLOW_EXAMPLES.md (Example 3: Multi-Turn Conversation) |
| **...performance characteristics** | PIPELINE_ARCHITECTURE.md (Performance Characteristics table) |
| **...error handling** | PIPELINE_ARCHITECTURE.md (Error Handling & Fallbacks) |
| **...the bias detection mechanism** | PIPELINE_ARCHITECTURE.md (Step 5) + MODULE_REFERENCE.md (bias_detector.py) |
| **...how explainability works** | PIPELINE_ARCHITECTURE.md (Step 4: XAI Module) + MODULE_REFERENCE.md (xai_module.py) |
| **...the reliability scoring formula** | PIPELINE_ARCHITECTURE.md (Step 7) |

---

## 🏗️ High-Level Pipeline Overview

```
INPUT (JSON Query)
    ↓
[1] CONTEXT ENCODING
    - Extract entities (spaCy NER)
    - Update user context
    - Encode conversation history
    - Compute factual grounding
    ↓ Output: UserContext + encoded_history
    
[2] INTENT CLASSIFICATION
    - Zero-shot classify into 12 intent labels
    - BART-large-mnli model
    - Return top-3 predictions
    ↓ Output: IntentLabel + confidence
    
[3] LLM REASONING
    - Build intent-specific prompt
    - Include context, history, user profile
    - Call Mistral-7B via HF API
    - Parse XML structured output
    - Retry if validation fails
    ↓ Output: ParsedLLMOutput (reasoning, response, confidence, caveats)
    
[4] XAI MODULE (Explainability)
    - SHAP-lite token attribution
    - Context contribution scoring
    - Attention summary
    - Response quality validation
    ↓ Output: XAIData (context_contributions, shap_tokens, attention_summary)
    
[5] BIAS DETECTION (4 parallel checks)
    - Toxicity detection
    - Gendered language balance
    - Demographic parity test
    - Privilege assumption check
    - Composite bias score (weighted)
    ↓ Output: BiasScore (composite, checks, flagged)
    
[6] NEUTRALIZATION (if flagged)
    - Regenerate response with bias-neutral prompt
    - Keep same structure, remove bias patterns
    ↓ Output: Optional[neutralized_response]
    
[7] RELIABILITY SCORING
    - 4 equally-weighted pillars:
      • Intent confidence (from Step 2)
      • LLM confidence (from Step 3)
      • Factual grounding (from Step 1)
      • Bias penalty (1 - composite from Step 5)
    - Assign label: GREEN (≥0.75), AMBER (0.55-0.74), RED (<0.55)
    ↓ Output: ReliabilityScore (overall, 4 pillars, label)
    
[8] CAVEAT INJECTION
    - If LLM confidence < 0.5: warn user
    - Else if LLM provided caveats: use those
    - Else: no caveat
    ↓ Output: Optional[caveat]
    
OUTPUT (Complete InferResponse JSON)
    - response: str
    - reasoning: str
    - intent: IntentLabel
    - confidence: float
    - xai_data: XAIData
    - bias_score: BiasScore
    - reliability: ReliabilityScore
    - neutralized_response: Optional[str]
    - caveat: Optional[str]
    - session_id: str
```

---

## 📊 Key Metrics at a Glance

| Aspect | Value | Details |
|--------|-------|---------|
| **Total Inference Time** | 3-5 seconds | Dominated by HF API call (~2-4s) |
| **Intent Labels Count** | 12 | resume_review, salary_negotiation, interview_prep, ... |
| **Bias Checks** | 4 | Parallel async checks (toxicity, gendered, parity, privilege) |
| **XAI Components** | 3 | Context contributions, SHAP tokens, attention summary |
| **Reliability Pillars** | 4 | Intent conf, LLM conf, factual grounding, bias penalty |
| **Bias Threshold** | 0.40 | composite > 0.4 triggers neutralization |
| **Reliability Thresholds** | 0.75 / 0.55 | Green/Amber/Red labels |
| **Context Window** | Last 8 turns | With decay weighting (0.9^age) |
| **Embedding Model** | 384-dim | sentence-transformers/all-MiniLM-L6-v2 |
| **LLM Model** | Mistral-7B | Via HF Inference API (configurable) |
| **Classifier Model** | BART-large-mnli | facebook/bart-large-mnli, zero-shot |
| **NER Model** | spaCy en_core_web_sm | For entity extraction |

---

## 🔧 Core Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Web Framework** | FastAPI | Async Python web server |
| **LLM** | Mistral-7B (HF API) | Main reasoning engine |
| **Intent Classification** | BART-large-mnli (zero-shot) | Intent detection |
| **NER** | spaCy en_core_web_sm | Entity extraction |
| **Embeddings** | all-MiniLM-L6-v2 | Semantic similarity |
| **Parsing** | Regex (xml_parser) | Structured output extraction |
| **Async** | asyncio | Parallel bias checks |
| **Validation** | Pydantic | Request/response schemas |

---

## 💾 Data Flow Checkpoints

```
InferRequest
    ↓
[1] → UserContext (enriched), encoded_history
[2] → IntentLabel, intent_confidence, top3_predictions
[3] → ParsedLLMOutput (reasoning, response, llm_confidence, caveats)
[4] → XAIData (context_contributions, shap_tokens, attention_summary)
[5] → BiasScore (composite, checks, flagged)
[6] → Optional[neutralized_response]
[7] → ReliabilityScore (overall, pillars, label)
[8] → Optional[caveat]
    ↓
InferResponse (complete JSON output)
```

---

## 🎨 Design Principles

1. **Modular & Composable**
   - Each stage is independent
   - Functions can be tested in isolation
   - Easy to swap models (e.g., intent classifier)

2. **Explainability First**
   - Every decision is transparent
   - Context contributions tracked
   - Token attribution computed
   - Attention mechanisms explained

3. **Ethical by Default**
   - 4 bias checks run on every response
   - Low-confidence responses get caveats
   - Neutralization for flagged bias
   - Factual grounding verification

4. **Context-Aware**
   - User profile accumulates across turns
   - Decay-weighted history prevents explosion
   - Location-specific and skill-specific responses
   - Experience level considered

5. **Graceful Degradation**
   - LLM parsing fails → retry with stricter prompt
   - Model load fails → offline mode (cached)
   - Missing tags → sensible defaults
   - API errors → clear HTTP 500 with detail

---

## 📈 Reliability Score Formula

```
ReliabilityScore.overall = 
    0.25 × intent_confidence +     // How confident is intent classification?
    0.25 × llm_confidence +        // How confident is LLM about response?
    0.25 × factual_grounding +     // How grounded is response in user context?
    0.25 × bias_penalty            // How free from bias? (1 - composite)
```

**Interpretation**:
- 🟢 **≥ 0.75**: High confidence, use as-is
- 🟡 **0.55-0.74**: Moderate confidence, verify key points
- 🔴 **< 0.55**: Low confidence, consult professional

---

## 🚨 Bias Detection Weights

```
BiasScore.composite = 
    0.35 × toxicity +              // Highest priority
    0.25 × gendered_language +
    0.25 × demographic_parity +
    0.15 × privilege_assumption
```

**Triggering Neutralization**:
- If composite > 0.40 → flagged = True
- Neutralized alternative generated
- Both shown to user (original muted, alternative prominent)

---

## 🔗 Module Dependencies

```
main.py (orchestrator)
    ├→ models/schemas.py (data validation)
    ├→ pipeline/context_encoder.py
    │   └→ utils/embedder.py
    ├→ pipeline/intent_classifier.py
    │   └→ utils/embedder.py
    ├→ pipeline/llm_reasoner.py
    │   ├→ utils/xml_parser.py
    │   └→ pipeline/llm_reasoner.py::run_neutralized()
    ├→ pipeline/xai_module.py
    │   ├→ utils/embedder.py
    │   └→ pipeline/context_encoder.py::compute_context_contributions()
    └→ pipeline/bias_detector.py
        └→ utils/embedder.py
```

---

## 📖 How to Use This Documentation

### For Architecture Understanding:
1. Start with **Flow Diagram** (visual overview)
2. Read **PIPELINE_ARCHITECTURE.md** (understand each stage)
3. Review **DATA_FLOW_EXAMPLES.md** Example 1 (see data actually flowing)

### For Implementation:
1. Find your target module in **MODULE_REFERENCE.md**
2. Understand function signatures and outputs
3. Check **DATA_FLOW_EXAMPLES.md** for how it's called
4. Look at actual code in `ai-service/` for implementation details

### For Debugging:
1. Check which stage output is wrong in your trace
2. Find that stage in **MODULE_REFERENCE.md**
3. Review inputs/outputs in **DATA_FLOW_EXAMPLES.md**
4. Add logging based on patterns shown

### For Feature Addition:
1. Determine which stage is affected
2. Review that module in **MODULE_REFERENCE.md**
3. Check dependencies in "Module Dependencies" section
4. Consider impact on downstream stages
5. Review **DATA_FLOW_EXAMPLES.md** for side effects

---

## 🎓 Key Takeaways

✅ **AURA processes 8 sequential stages** transforming a JSON query into a complete, explainable response

✅ **Every response is scored** on 4 reliability pillars + 4 bias dimensions

✅ **Context accumulates** across turns, enabling personalized reasoning

✅ **Explainability is built-in**: SHAP tokens, context contributions, and attention summaries

✅ **Ethical guardrails are active**: Bias detection, privilege assumption checks, demographic parity tests

✅ **System is modular & testable**: Each stage can be tested independently

✅ **Graceful degradation** at every step: Retries, fallbacks, sensible defaults

✅ **Performance is reasonable**: 3-5 seconds total, dominated by LLM API call

---

## 📝 Files in This Documentation Set

1. **PIPELINE_ARCHITECTURE.md** (400+ lines)
   - Complete system reference
   - Each stage in detail
   - Data structures
   - Design patterns

2. **MODULE_REFERENCE.md** (300+ lines)
   - Function-by-function API
   - Input/output signatures
   - Practical examples
   - Testing entry points

3. **DATA_FLOW_EXAMPLES.md** (500+ lines)
   - 3 complete execution traces
   - Real data transformations
   - Variance scenarios
   - Debugging guidance

4. **This file** (SUMMARY.md)
   - Quick reference
   - Cross-linking
   - High-level overview
   - Usage guidance

---

## 🔍 Next Steps

To dive deeper:
- **Architecture**: Read PIPELINE_ARCHITECTURE.md cover-to-cover
- **Implementation**: Study MODULE_REFERENCE.md side-by-side with `ai-service/` source code
- **Testing**: Follow execution traces in DATA_FLOW_EXAMPLES.md, modify to test edge cases
- **Extension**: Use this documentation to safely add new bias checks, intent categories, or scoring dimensions

---

**Total Documentation**: ~1,600 lines across 4 comprehensive guides  
**Covers**: All 6 pipeline modules, 25+ functions, 3 utility functions, 12 intent labels, 4 bias checks, all data structures

**Created by**: Architecture Analysis - April 10, 2026
