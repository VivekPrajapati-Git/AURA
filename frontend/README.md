# AURA Frontend (Next.js)

The AURA frontend is a modern, highly responsive web application built with **Next.js (App Router)**, **React 19**, and **Tailwind CSS**. It serves as the primary gateway for users to interact with the AURA AI, track their bias-awareness progress, and view deep explainability metrics.

---

## ⚡ Optimized Communication Architecture

To achieve a seamless, secure, and blazing-fast user experience, the frontend specifically avoids direct, heavy REST calls from the client browser to the main Node.js backend for core AI interactions. 

Instead, it relies on a **Proxy & Server-Sent Events (SSE) Streaming Architecture**.

### 1. Next.js API Route Proxies
Whenever the client needs to interact with the backend (for auth, fetching histories, or sending messages), it sends a request to the Next.js internal `/app/api/...` routes.
- **Why?** This securely attaches `httpOnly` JWT cookies server-side before forwarding the request to the Node.js backend.
- **Result:** Complete elimination of browser CORS issues, highly secure credential management (tokens are never exposed to `document.cookie`), and minimized frontend bundle sizes.

### 2. High-Performance SSE Streaming
When a user asks the AI a question, waiting for the entire LLM to generate, calculate XAI, and score bias can take several seconds. To prevent the UI from "freezing" or showing a static loading spinner, we use Server-Sent Events (SSE).

**The Flow:**
1. User clicks "Send".
2. React opens a native `EventSource` connection to our Next.js API Route (`/api/chat/stream/[chatId]`).
3. Next.js instantly opens a stream with the Node.js Backend, which is heavily tethered to the Python Engine.
4. As the Python engine generates text, it passes token-by-token through Node ➔ Next.js ➔ React.
5. React uses state (`setStreamingText`) to append these chunks instantly, creating a typing effect.

### 3. The "Zero-Refetch" Metadata Payload
The biggest optimization is how we handle complex analytics. 

Once the AI finishes speaking, we do **not** make a second API call to fetch the Bias Scores, Gamification XP, and XAI Context. Instead, the final frame of the SSE stream sends a specialized `JSON` packet containing everything:

```json
{
  "done": true,
  "xp": { "xpEarned": 15, "newLevel": 2 },
  "metrics": {
    "biasScore": 12,
    "confidence": 92,
    "xai": [ ... ]
  }
}
```

When React sees this `done` frame, it immediately:
1. Closes the stream.
2. Formats the final chat bubble with an interactive UI allowing the user to click and inspect the XAI terms.
3. Triggers the Gamification CSS Toast animation (e.g., `⚡ +15 XP Earned!`).

---

## 🎨 UI & Design Principles

- **Glassmorphism & Gradients**: Heavy use of Tailwinds `backdrop-blur` and radial gradients (`cyan-500`, `amber-500`, `rose-500`) to create a premium, dynamic feel.
- **Micro-Animations**: Uses CSS `@keyframes` (like `slideInRight` for toasts and `pulse` for streaming indicators) to make the interface feel alive and responsive.
- **Gamified Dashboards**: Beautiful pure-SVG donut charts and stat grid layouts provide immediate metric readability on the `/dashboard` and `/user` routes.

---

## 🚀 Running the Frontend Locally

### Prerequisites
- Node.js (v18+)
- Running instances of the Node.js Backend and Python AI Engine.

### Setup
```bash
cd frontend
npm install
```

### Environment Variables
Create a `.env.local` file in the `frontend` root:
```env
# Point this to your local Node.js backend
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

### Start Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to view the application.
