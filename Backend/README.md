# AURA Backend

The AURA Node.js Backend serves as the robust middleware connecting the Next.js Frontend with the Python AI Engine. It is responsible for user authentication, session management, secure chat streaming, real-time gamification, and persisting complex Explainable AI (XAI) metadata.

👉 **[View Full API Documentation](API.md)**

---

## 🏗 System Architecture

The backend utilizes a **Dual-Database Architecture** to optimize for both fast relational queries and heavy metadata storage:

1. **MySQL (Relational Data)**
   - **Users**: Authentication, passwords, and overall XP / Level.
   - **Sessions**: Lightweight chat pointers (Session ID, User ID, Message Count, Title).
   - Designed for fast joins, secure authentication, and managing the gamification state.

2. **MongoDB (Document Data)**
   - **Messages**: Stores the actual chat transcripts.
   - **XAI Metadata**: Stores the dense, unstructured JSON data returned by the Python AI Engine (Bias Scores, Confidence Breakdowns, Factual Grounding, SHAP Context Contributions).
   - Designed to handle highly variable AI metadata without bogging down relational queries.

---

## ✨ Key Features

- **Server-Sent Events (SSE) Streaming**: Delivers AI generated text token-by-token directly to the frontend. Once the text finishes, it sends a final structured metadata frame (`[DONE]`) containing all the XAI data, intent, and reliability metrics.
- **Dynamic Gamification (XP System)**: Users are dynamically rewarded with XP after every prompt. Special bonuses are awarded for discovering biased answers (Bias Hunter) or asking remarkably clean questions. Levels and Badges are computed in real-time.
- **Auto-Titling**: The first user prompt in a new session is automatically truncated and assigned as the Chat Session title.
- **MongoDB Auto-Recovery**: If the MySQL `sessions` table is ever flushed or corrupted, the Node.js server automatically detects it upon startup and rebuilds the `sessions` table by aggregating distinct conversations from the MongoDB historical message logs.

---

## 🚀 How to Run Locally

### 1. Requirements
- Node.js (v18+)
- Local or Cloud instances of **MySQL** and **MongoDB**
- Redis (optional, based on caching config)

### 2. Environment Variables (`.env`)
Create a `.env` file in the `Backend` directory:
```env
PORT=5000
JWT_SECRET=your_super_secret_key

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=root
MYSQL_DATABASE=aura_db

# MongoDB Configuration
MONGO_URI=mongodb+srv://<user>:<password>@cluster...

# Python AI Engine
AI_ENGINE_URL=http://replace_with_python_pc_ip:8000
```

### 3. Start the Server
```bash
npm install
npm run dev
```

*(Note: The server uses `nodemon` and will automatically restart on file changes.)*

---

## 📁 Directory Structure

- `controllers/` - Handler functions for API routes (Auth, Chat, User).
- `routes/` - Express route definitions mapping URLs to Controllers.
- `models/` - Mongoose Models (e.g., `Message.js` for MongoDB).
- `services/` - Business logic including formatting AI history, calculating XP (`xpService.js`), and recovery (`recoveryService.js`).
- `database/` - Connection setup for MySQL and Redis.
- `server.js` - Main Express entry point and middleware configuration.
- `initDb.js` - MySQL Schema creation script.
