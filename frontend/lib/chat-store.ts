export type MessageRole = "user" | "assistant";

export type Influence = {
  term: string;
  impact: number;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
  bias: number;
  confidence: number;
  influences: Influence[];
  createdAt: string;
};

export type Chat = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export type ChatSummary = {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
  messageCount: number;
};

export type UserStats = {
  userId: string;
  chatCount: number;
  messageCount: number;
  averageBias: number;
  averageConfidence: number;
  topChats: ChatSummary[];
};

const BASE_URL = "http://127.0.0.1:5000";
let CACHED_TOKEN = "";
let CACHED_USER_ID = "";

// Auto-Login sequence to wire NextJS silently to Express backend Authentication
const getAuthToken = async () => {
    if (CACHED_TOKEN) return CACHED_TOKEN;
    try {
        const payload = {
            username: "demo-user",
            email: "nextjs_demo@test.com",
            password: "password123"
        };
        
        let res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        let data = await res.json().catch(()=>({}));
        
        if (data.error?.includes('exists') || !data.token) {
           res = await fetch(`${BASE_URL}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: "nextjs_demo@test.com", password: "password123" })
           });
           data = await res.json();
        }
        
        CACHED_TOKEN = data?.token || "";
        CACHED_USER_ID = data?.user?.id || "";
        return CACHED_TOKEN;
    } catch(err) {
        console.error("Auth Exception:", err);
        return "";
    }
}

const getHeaders = async () => {
    const t = await getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${t}`
    }
}

const mapBackendBlock = (msg: any): ChatMessage[] => {
    const mongoId = msg._id || msg.id || "0";
    
    // We map a Single Database Block into TWO UI Bubbles
    const userMsg: ChatMessage = {
        id: "usr-" + mongoId,
        role: "user",
        text: msg.userPrompt || "",
        bias: 0,
        confidence: 0, 
        influences: [],
        createdAt: msg.timestamp || msg.created_at || new Date().toISOString()
    };
    
    const sysMsg: ChatMessage = {
        id: "sys-" + mongoId,
        role: "assistant",
        text: msg.systemResponse || "",
        bias: (msg.biasScore || 0) / 100,
        confidence: (msg.confidence?.overall || 95) / 100, 
        influences: msg.xai || [],
        createdAt: msg.timestamp || msg.created_at || new Date().toISOString()
    };
    
    // If system response is empty string (e.g. while streaming hasn't completed), you optionally omit it. 
    // But since it's synchronous here, it handles the UI fine.
    // However, if systemResponse doesn't exist at all yet, we just return the user message.
    if (!msg.systemResponse) {
        return [userMsg];
    }
    
    return [userMsg, sysMsg];
}

export const createChat = async (userId: string, title = "New conversation"): Promise<Chat> => {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/chat/create`, { method: "POST", headers });
    const data = await res.json();
    return {
        id: data.chatId,
        userId: CACHED_USER_ID,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
    }
};

export const getChat = async (chatId: string): Promise<Chat | null> => {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/chat/${chatId}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    
    return {
        id: data.sessionDetails.id,
        userId: data.sessionDetails.user_id,
        title: data.sessionDetails.title || "AURA Chat",
        createdAt: data.sessionDetails.created_at,
        updatedAt: data.sessionDetails.last_active,
        messages: (data.messages || []).flatMap(mapBackendBlock)
    }
};

export const listChatsForUser = async (_unusedFrontendId: string): Promise<ChatSummary[]> => {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/chat/list/${CACHED_USER_ID}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    
    return data.chats.map((c: any) => ({
        id: c.id,
        title: c.title || "AURA Chat",
        lastMessage: "Loaded from Backend DB...",
        updatedAt: c.last_active,
        messageCount: c.message_count
    }));
};

export const addUserMessageAndAssistantResponse = async (chatId: string, text: string): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage } | null> => {
    const headers = await getHeaders();
    
    // Hit the Unified Message Backend (It will create the block containing both prompt and response instantaneously!)
    const ur = await fetch(`${BASE_URL}/chat/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ chatId, text })
    });
    
    if (!ur.ok) return null;
    const uData = await ur.json();
    
    const bubbles = mapBackendBlock(uData.savedMessage);

    return { userMessage: bubbles[0], assistantMessage: bubbles[1] };
};

export const updateChatTitle = async (chatId: string, title: string): Promise<Chat | null> => {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/chat/${chatId}/title`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ title })
    });
    if (!res.ok) return null;
    return await getChat(chatId);
};

export const deleteChat = async (chatId: string): Promise<boolean> => {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/chat/${chatId}`, { method: "DELETE", headers });
    return res.ok;
};

export const getMessageMetrics = async (chatId: string, messageId: string) => {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/chat/${chatId}/metrics/${messageId}`, { headers });
    if (!res.ok) return null;
    const msg = await res.json();
    // Assuming metric fetch grabs the block context, we just return the AI's metrics component
    const bubbles = mapBackendBlock(msg);
    return bubbles[bubbles.length - 1]; // Return the assistant portion metrics
};

export const getUserStats = async (_unusedFrontendId: string): Promise<UserStats> => {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/user/${CACHED_USER_ID}/stats`, { headers });
    const data = await res.json().catch(()=>({}));
    
    return {
      userId: CACHED_USER_ID,
      chatCount: 1, // Optional calculation
      messageCount: data.total_messages || 0,
      averageBias: data.overall_bias || 0,
      averageConfidence: data.level || 0.94, 
      topChats: []
    }
};
