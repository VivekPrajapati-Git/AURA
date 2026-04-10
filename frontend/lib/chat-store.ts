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

const chats = new Map<string, Chat>();
const userChats = new Map<string, string[]>();

const now = () => new Date().toISOString();
const createId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const biasInfluencePool: Influence[] = [
  { term: "language", impact: 0.18 },
  { term: "identity", impact: 0.15 },
  { term: "context", impact: 0.12 },
  { term: "assumption", impact: 0.1 },
  { term: "keywords", impact: 0.08 },
  { term: "tone", impact: 0.07 },
];

const generateInfluences = (): Influence[] =>
  biasInfluencePool
    .map((item, index) => ({
      term: item.term,
      impact: Math.max(0.05, item.impact - index * 0.02 + (Math.random() - 0.5) * 0.03),
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 4);

const simulateBias = (text: string): number => {
  const normalized = text.toLowerCase();
  const sensitiveTopics = ["job", "career", "salary", "hiring", "gender", "race", "college", "age", "interview"];
  const biasModifier = sensitiveTopics.reduce((score, term) => (normalized.includes(term) ? score + 0.16 : score), 0);
  return Math.min(0.94, 0.08 + biasModifier + Math.random() * 0.18);
};

const simulateConfidence = (bias: number): number => Math.max(0.62, 0.98 - bias + (Math.random() - 0.5) * 0.12);

export const generateAssistantText = (userText: string): string => {
  const normalized = userText.toLowerCase();

  if (normalized.includes("job") || normalized.includes("career")) {
    return "AURA suggests focusing on your skills and not making assumptions based on identity. This answer calls attention to bias risks while staying constructive.";
  }

  if (normalized.includes("school") || normalized.includes("college")) {
    return "I recommend reviewing both objective criteria and inclusive language when discussing education or admissions. This helps keep the response fair and transparent.";
  }

  return "This answer draws on the most relevant context, and I highlight areas where bias may appear so you can decide with confidence.";
};

export const createChat = (userId: string, title = "New conversation") => {
  const id = createId();
  const chat: Chat = {
    id,
    userId,
    title,
    createdAt: now(),
    updatedAt: now(),
    messages: [],
  };

  chats.set(id, chat);
  userChats.set(userId, [...(userChats.get(userId) ?? []), id]);
  return chat;
};

export const getChat = (chatId: string): Chat | null => chats.get(chatId) ?? null;

export const listChatsForUser = (userId: string): ChatSummary[] => {
  return (userChats.get(userId) ?? [])
    .map((chatId) => chats.get(chatId))
    .filter((chat): chat is Chat => Boolean(chat))
    .map((chat) => ({
      id: chat.id,
      title: chat.title,
      lastMessage: chat.messages.at(-1)?.text,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

export const addMessage = (chatId: string, role: MessageRole, text: string): ChatMessage | null => {
  const chat = chats.get(chatId);
  if (!chat) return null;

  const bias = role === "assistant" ? simulateBias(text) : 0;
  const confidence = role === "assistant" ? simulateConfidence(bias) : 0;
  const influences = role === "assistant" ? generateInfluences() : [];

  const message: ChatMessage = {
    id: createId(),
    role,
    text,
    bias,
    confidence,
    influences,
    createdAt: now(),
  };

  chat.messages.push(message);
  chat.updatedAt = now();
  return message;
};

export const addUserMessageAndAssistantResponse = (chatId: string, text: string): { userMessage: ChatMessage; assistantMessage: ChatMessage } | null => {
  const userMessage = addMessage(chatId, "user", text);
  if (!userMessage) return null;

  const responseText = generateAssistantText(text);
  const assistantMessage = addMessage(chatId, "assistant", responseText);
  if (!assistantMessage) return null;

  return { userMessage, assistantMessage };
};

export const updateChatTitle = (chatId: string, title: string): Chat | null => {
  const chat = chats.get(chatId);
  if (!chat) return null;
  chat.title = title;
  chat.updatedAt = now();
  return chat;
};

export const deleteChat = (chatId: string): boolean => {
  const chat = chats.get(chatId);
  if (!chat) return false;
  chats.delete(chatId);
  userChats.set(chat.userId, (userChats.get(chat.userId) ?? []).filter((id) => id !== chatId));
  return true;
};

export const getMessage = (chatId: string, messageId: string): ChatMessage | null => {
  const chat = chats.get(chatId);
  if (!chat) return null;
  return chat.messages.find((message) => message.id === messageId) ?? null;
};

export const getMessageMetrics = (chatId: string, messageId: string) => {
  const message = getMessage(chatId, messageId);
  if (!message) return null;
  return {
    id: message.id,
    role: message.role,
    bias: message.bias,
    confidence: message.confidence,
    influences: message.influences,
    createdAt: message.createdAt,
  };
};

export const getUserStats = (userId: string): UserStats => {
  const summaries = listChatsForUser(userId);
  const chatsForUser = summaries.map((summary) => chats.get(summary.id)).filter((chat): chat is Chat => Boolean(chat));
  const allMessages = chatsForUser.flatMap((chat) => chat.messages);
  const averageBias = allMessages.length ? allMessages.filter((message) => message.role === "assistant").reduce((sum, message) => sum + message.bias, 0) / Math.max(1, allMessages.filter((message) => message.role === "assistant").length) : 0;
  const averageConfidence = allMessages.length ? allMessages.filter((message) => message.role === "assistant").reduce((sum, message) => sum + message.confidence, 0) / Math.max(1, allMessages.filter((message) => message.role === "assistant").length) : 0;

  return {
    userId,
    chatCount: summaries.length,
    messageCount: allMessages.length,
    averageBias: Number(averageBias.toFixed(3)),
    averageConfidence: Number(averageConfidence.toFixed(3)),
    topChats: summaries.slice(0, 5),
  };
};
