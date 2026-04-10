# AURA Backend API Documentation

This document outlines the REST and Server-Sent Events (SSE) endpoints provided by the AURA Node.js backend.

All endpoints (except Authentication) are secured using a JWT Token and require the `Authorization: Bearer <token>` header.

---

## 1. Authentication
Handles user registration and secure login.

### Register User
- **URL**: `/auth/register`
- **Method**: `POST`
- **Body**: `{ "username": "...", "email": "...", "password": "..." }`
- **Response**: `{ "token": "jwt-token", "user": { "id": "uuid", "username": "..." } }`

### Login User
- **URL**: `/auth/login`
- **Method**: `POST`
- **Body**: `{ "email": "...", "password": "..." }`
- **Response**: `{ "token": "jwt-token", "user": { "id": "uuid", "username": "..." } }`

---

## 2. Chat & AI Interactions
Manages chat sessions, messages, and communication with the Python AI Engine.

### Create New Chat Session
- **URL**: `/chat/create`
- **Method**: `POST`
- **Response**: `{ "message": "Chat created successfully", "chatId": "uuid" }`

### Send Message (Synchronous)
- **URL**: `/chat/message`
- **Method**: `POST`
- **Body**: `{ "chatId": "uuid", "text": "User's query" }`
- **Description**: Forwards the query to the Python AI engine, saves the rich metadata (bias, intent, confidence, XAI) to MongoDB, and returns the full JSON response. Also computes and awards Gamification XP.

### Stream Message (SSE - Asynchronous)
- **URL**: `/chat/stream/:chatId?message=<user_query>`
- **Method**: `GET`
- **Description**: Real-time streaming endpoint utilizing Server-Sent Events (SSE). Streams token chunks as they arrive.
- **SSE Events**:
  - `data: {"chunk": "word"}` — Text chunk.
  - `data: {"done": true, "messageId": "mongo-id", "xp": {...}, "metrics": {...}}` — Final frame containing all explainable AI metrics and XP earned.

### List User's Chats
- **URL**: `/chat/list/:userId`
- **Method**: `GET`
- **Response**: `{ "chats": [ { "id": "...", "title": "...", "message_count": 0, "last_active": "..." } ] }`

### Load Chat History (Messages)
- **URL**: `/chat/:chatId`
- **Method**: `GET`
- **Response**: `{ "messages": [ /* Array of rich message objects from MongoDB */ ] }`

### Delete Chat
- **URL**: `/chat/:chatId`
- **Method**: `DELETE`

---

## 3. User Gamification & Profile
Retrieves gamified metrics, XP, and profile details.

### Get User Profile
- **URL**: `/user/:userId/profile`
- **Method**: `GET`
- **Response**: Complete profile including trust level, XP, Gamification Badges (calculated dynamically), and recent conversations.

---

## 4. System & Recovery
Administrative and system reliability endpoints.

### Recover Sessions from MongoDB
- **URL**: `/recovery/sessions`
- **Method**: `GET`
- **Description**: Rebuilds the MySQL `sessions` table by aggregating distinct sessions from the MongoDB message history. Highly useful if SQL data is wiped.
