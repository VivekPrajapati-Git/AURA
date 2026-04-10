# AURA AI Engine (ai-service)

The AURA AI Engine is the core Python-based intelligent pipeline responsible for generating text, classifying intents, measuring confidence, checking for algorithmic bias, and extracting Explainable AI (XAI) metrics using advanced NLP techniques.

This documentation serves as a comprehensive guide to understanding the AI architecture, specifically diving deep into how explainability (XAI) is calculated using Inverted Indices and Shapley Values.

---

## 🛠 Features Overview

- **Large Language Model Inference**: Uses open-weights or API-based LLMs to stream responses.
- **Bias Detection**: Analyzes outputs before they reach the user, assigning a normalized Bias Score (0-100%).
- **Intent Recognition**: Classifies the user's root goal or motivation behind the query.
- **Confidence Scoring**: Computes a multi-dimensional confidence score (LLM Confidence, Intent Confidence, Coverage).
- **Explainable AI (XAI)**: Understands *why* the AI generated its response or why it triggered a high bias alert by attributing impact scores to individual words.

---

## 🧠 Explainable AI (XAI) Calculation Architecture

A major challenge in modern AI is the "Black Box" problem—knowing *why* a model made a specific prediction. To solve this and provide absolute transparency to our judges and users, the AURA AI Engine uses a customized, high-performance algorithm to calculate term-impact attribution.

### Step 1: Building the Inverted Index

When the AI evaluates a piece of text (either a user prompt or its own generated response), the first step is to tokenize the text and construct an **Inverted Index**.

An inverted index is a data structure mapping content (words/tokens) to their locations within the document. 
1. **Tokenization and Normalization:** The text is split into tokens. Stop words (like "the", "and") are often filtered out depending on the pipeline mode.
2. **Indexing:** We map each unique token to its frequency and strict positional offset (`Token -> [Position Arrays]`).

*Why an Inverted Index?*  
It allows the engine to rapidly search, mask, and permute specific words without re-parsing the entire text from scratch every single time. It provides O(1) instantaneous lookup for exact term locations when we simulate "removing" a word.

### Step 2: Applying Shapley Values (Game Theory)

Once we have the text mapped via the inverted index, we determine which specific words (or features) had the biggest impact on the final outcome (like the Bias Score or the text generated). For this, we utilize a concept from cooperative game theory called **Shapley Values**.

1. **The "Game":** The overall prediction of the model (e.g., "This text has a 88% bias score").
2. **The "Players":** The individual words extracted from our inverted index.
3. **Marginal Contribution:** The algorithm systematically masks (removes) a word from the text and re-runs the prediction. 
   - By comparing the prediction *with* the word vs. the prediction *without* the word across multiple combinations of surrounding context, we isolate the marginal contribution of that specific word.
4. **Impact Allocation:** Shapley values guarantee a fair distribution of the total model output among all words. If removing the word "bias-word" drops the bias score from 88% down to 20%, that word receives an exceptionally high Shapley impact score.

### Summary of the Flow
`Raw Text` ➔ `Inverted Index Built` ➔ `Tokens Extracted` ➔ `Shapley Combinatorics on Tokens` ➔ `Marginal Impact Weights Calculated` ➔ `Top impacting words emitted to Frontend as XAI payload.`

---

## 📊 Core Metric Calculations

Aside from XAI, the AI Engine calculates several advanced metrics in real-time for every prompt and response pair.

### 1. Bias Score Calculation (0-100%)
The engine evaluates the output against multiple bias vectors (gender, racial, socioeconomic, tone, etc.).
- It uses a weighted lexical analysis combined with a prompt-injected LLM secondary pass.
- A score of `0%` means perfectly neutral; a score `>40%` flags as biased text.

### 2. Confidence Measurement
We don't rely entirely on raw LLM logprobs, as they can be misleading. Instead, we use a composite metric:
- **LLM Confidence**: The model's baseline certainty in its generated tokens.
- **Intent Confidence**: How strongly the parsed intent matches known clusters.
- **Coverage**: The ratio of the user's explicit question entities that were addressed in the answer.
- *Total Confidence* is an aggregated average of these factors.

### 3. Factual Grounding (0-100%)
Grounding measures how tethered the AI's response is to established general knowledge vs. hallucinatory inferences.
- It is calculated via semantic similarity matching between the generated claims and a recognized knowledge baseline representation.

### 4. Reliability Label
Based on the Bias Score, Confidence, and Factual Grounding, the engine assigns a strict categorical label (e.g., `High Reliability`, `Caution Advisable`, `Low Confidence`) to instantly alert the user to the physical safety of the advice.

---

## 📦 Generated Metadata Payload

The AI Engine streams text tokens, but once the sequence is complete, it emits a robust JSON metadata payload. This is intercepted by the Node.js backend and used for the UI, gamification, and historical tracking.

**Example Payload Structure:**
```json
{
  "done": true,
  "confidence": {
    "overall": 92,
    "llm": 95,
    "intent": 90,
    "coverage": 91
  },
  "biasScore": 12,
  "intent": "salary_negotiation_advice",
  "reasoning": "The user is asking for fair compensation benchmarks.",
  "reliabilityLabel": "High Reliability",
  "factualGrounding": 88,
  "neutralizedResponse": null,
  "caveat": "Please consult local labor laws.",
  "xai": [
    { "word": "salary", "impact": 45 },
    { "word": "industry", "impact": 30 }
  ],
  "contextContributions": [
    { "label": "Historical data", "score": 85 }
  ]
}
```
This payload is exactly what powers the "Metrics Panel" on the frontend Chat UI.

---

## 🚀 Running the Engine

### Prerequisites
- Python 3.9+
- Pip dependencies installed from `requirements.txt`

### Setup
```bash
# Navigate to the service folder
cd ai-service

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables
Configure your `.env` file referencing `.env.example` (or configure inline):
```env
PORT=8000
MODEL_PROVIDER=gemini # or huggingface / local
API_KEY=your_key_here
```

### Start Server
```bash
uvicorn main:app --reload --port 8000
```

---

## 🔗 Internal API Map

The backend communicates with this Python engine via FastAPI routing.

- `POST /v1/chat/generate`: The primary streaming generation endpoint. Receives user text and outputs `chunk` events followed by a final comprehensive metadata frame detailing the XAI/Shapley results.
- `GET /health`: Engine status check.

*For complete details on how Node.js communicates with this engine, see `Backend/API.md`.*
