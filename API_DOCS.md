# AURA Master API Documentation

This file documents all 11 endpoints configured on the backend utilizing the MySQL Session & MongoDB Core dual-system architecture.

**Base URL:** `http://192.168.137.94/5000`

---

## 🧩 Frontend Environment Setup
The frontend reads the backend base URL from the environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=http://192.168.137.94/5000
```

Copy `frontend/.env.example` to `frontend/.env.local` and keep the local file private.

---

## 🔒 Security & Authentication
**ALL requests (except Register/Login) require an Authorization Header:**
```json
{
  "headers": {
    "Authorization": "Bearer <YOUR_JWT_TOKEN>"
  }
}
```

---

## 1️⃣ Authentication APIs

### 1. Register User
* **Endpoint:** `POST /auth/register`
* **Purpose:** Creates a new MySQL `user` row.
* **Body Parameters:**
  * `username` (string)
  * `email` (string)
  * `password` (string)
* **Response Content:** Returns new user details and the `token`.

### 2. Login User
* **Endpoint:** `POST /auth/login`
* **Purpose:** Validates MySQL hashing and returns user ID.
* **Body Parameters:**
  * `email` (string)
  * `password` (string)
* **Response Content:** Returns `{ token: "...", user: { id: "uuid", username: "text"} }`

---

## 2️⃣ Core Chat Interactions (MongoDB + SQL)

### 3. Create New Chat Session
* **Endpoint:** `POST /chat/create`
* **Purpose:** Initializes a secure tracking row in the MySQL `sessions` table.
* **Body:** `{ userId: string, title?: string }`
* **Returns:** `{ "message": "Chat created successfully", "chatId": "<MySQL_Session_UUID>" }`
* *Note: Pass the returned `chatId` to subsequent Message streams.*

### 4. Send Message (Standard)
* **Endpoint:** `POST /chat/message`
* **Purpose:** Saves standard static prompt text down to the MongoDB data pool.
* **Body:**
  * `chatId` (string)
  * `text` (string)
  * `role` (string - "user" or "system")

### 5. Get Entire Chat / Load Messages
* **Endpoint:** `GET /chat/:chatId`
* **Purpose:** Cross-checks your ownership in MySQL and triggers a MongoDB chronological population lookup.
* **Returns:** `{ "sessionDetails": { ... }, "messages": [ { _id, text, role, xai... } ] }`

### 6. Sidebar Loading (List All Chats)
* **Endpoint:** `GET /chat/list/:userId`
* **Purpose:** Optimized flat-data hit to MySQL directly for rendering fast UI sidebars.
* **Returns:** `[{ id, title, created_at, message_count }, ...]`

---

## 3️⃣ Advanced UI Telemetry & Integrations

### 7. AI Live Streaming (SSE)
* **Endpoint:** `POST /chat/message/stream/:chatId`
* **Purpose:** Implements true **Server-Sent Events (`text/event-stream`)**.
* **Body:** `{ "text": "Give me an overview of Python" }`
* **Handling:** Returns discrete data chunks asynchronously (`data: {"chunk": "..."}`). Watch for the sequence `data: [DONE]` to release your UI loader.

### 8. Update Chat Title
* **Endpoint:** `PATCH /chat/:chatId/title`
* **Body:** `{ "title": "My Updated Fun Chat" }`

### 9. Delete Chat History
* **Endpoint:** `DELETE /chat/:chatId`
* **Purpose:** Drops BOTH the root MySQL row AND recursively deletes all active MongoDB analytics metadata linked to the chat.

### 10. Gamification Data Retrieval
* **Endpoint:** `GET /user/:userId/stats`
* **Purpose:** Grabs SQL-layer calculations for UI Dashboard rendering.
* **Returns:** `{ "xp_score": ..., "level": ..., "total_messages": ..., "overall_bias": ... }`

### 11. Extract Individual AI Metrics
* **Endpoint:** `GET /chat/:chatId/metrics/:messageId`
* **Purpose:** Renders the isolated XAI/Telemetry payload from a single message, excluding heavy text fields, perfect for hover overlays or modal boxes.
