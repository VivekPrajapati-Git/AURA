# AURA (Adaptive, Understandable and Responsible AI)

**AURA** is an intelligent assistant built around absolute transparency, operating on 3 core pillars:
1. **Multi-turn Context Awareness**
2. **Quantified Explainability (XAI)**
3. **Real-time Ethical Guardrails**

---

## 📖 Component Documentation

The system operates efficiently through a microservice architecture. For deep, technical deep-dives into how the code specifically operates, please reference the directory-level documentation below:

- 🧠 **[Python AI Engine (ai-service)](./ai-service/README.md)**  
  *Explains the inverted index XAI mapping, mathematically applied Shapley values, and parallel NLP core checks.*
- 🔌 **[Node.js Backend (Backend)](./Backend/README.md)**  
  *Details the dual-database (MySQL/MongoDB) approach, Server-Sent Events (SSE) streaming routing, and the Gamification leveling logic. (Also links to the **[Full API Documentation](./Backend/API.md)**).*
- 💻 **[Next.js Frontend (frontend)](./frontend/README.md)**  
  *Outlines the React Proxy routing bypassing CORS, dynamic streaming interfaces, and zero-refetch metadata rendering.*

---

## 🎯 How it Addresses the Problem

AURA moves securely beyond the standard "Black Box" model of LLMs. It achieves this by providing a live, quantified demonstration of ethics in action directly inside the user's chat interface.

### Innovation and Uniqueness
- **Live Bias Meter:** A real-time header scoring system analyzing output bias simultaneously with word generation.
- **Gamified Trust:** An "AI Literacy" XP system and trust badge architecture rewarding users who actively challenge the AI, ask unbiased questions, and engage directly with Explainability metrics.

---

## 🛠 Technical Approach

- **AI & XAI Engine:** Python, SHAP, Hugging Face, GPT-4o, spaCy.
- **Frontend App:** Next.js 14, Tailwind CSS, Server-Sent Events (SSE) Streaming.
- **Backend API:** Node.js, Express, MySQL / PostgreSQL, MongoDB, Redis.

---

## 🏗 System Architecture (Under the Hood)

Below is the complete data flow and architectural diagram demonstrating how the sub-systems interact, from the Next.js UI routing through the Node proxy and down to the parallel Python execution nodes. 

[System Architecture](images/System Architecture.png)
---

## ⚖️ Feasibility & Viability

**Feasibility:** Built entirely on Industry-standard Open Source models (MiniLM, DistilBERT) combined with rapid routing microservices to ensure both top-tier performance and cost viability.

### Potential Challenges
- Maintaining sub 3-second latency for complex parallel AI metric generation.
- Handling deep context memory without slowing down the primary response stream.

### Our Engineering Strategies
- Utilizing `asyncio.gather()` in Python to run up to four distinct verification checks (Bias, Intent, Grounding) completely in parallel.
- Implementing **Redis** caching mechanisms for sub-100ms updates to stateful configurations.
- Applying a mathematical **Weight Decay Graph** ($0.9^n$) to dynamically prioritize recent context memory while safely compressing and pruning older dialogue history.

---

## 🌍 Impact & Benefits

**Potential Impact:** Fundamentally empowers users to trust Generative AI by making transparency a core, embedded feature rather than an afterthought or secondary audit.

**Core Benefits:**
- **Educational Gamification:** Radically increases user engagement software retention and general AI literacy through an enjoyable, progressive level-based reward structure.

---

## 📚 Key References

- Lundberg, Scott M., and Su-In Lee. *"A unified approach to interpreting model predictions."* Advances in neural information processing systems 30 (2017).
- Sanh, Victor, Lysandre Debut, Julien Chaumond, and Thomas Wolf. *"DistilBERT, a distilled version of BERT: smaller, faster, cheaper and lighter."* arXiv preprint arXiv:1910.01108 (2019).
- Reimers, Nils, and Iryna Gurevych. *"Sentence-bert: Sentence embeddings using siamese bert-networks."* In Proceedings of the 2019 conference on empirical methods in natural language processing and the 9th international joint conference on natural language processing (EMNLP-IJCNLP), pp. 3982-3992. 2019.