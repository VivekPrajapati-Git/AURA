import { NextResponse } from "next/server";
import { addUserMessageAndAssistantResponse, getChat } from "@/lib/chat-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.chatId !== "string" || typeof body.message !== "string") {
    return NextResponse.json({ error: "chatId and message are required." }, { status: 400 });
  }

  const chat = getChat(body.chatId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  const result = addUserMessageAndAssistantResponse(body.chatId, body.message);
  if (!result) {
    return NextResponse.json({ error: "Unable to add message." }, { status: 500 });
  }

  return NextResponse.json({ chat, userMessage: result.userMessage, assistantMessage: result.assistantMessage });
}
