import { NextResponse } from "next/server";
import { addMessage, getChat } from "@/lib/chat-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.chatId !== "string" || typeof body.text !== "string") {
    return NextResponse.json({ error: "chatId and text are required." }, { status: 400 });
  }

  const chat = getChat(body.chatId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  const role = body.role === "assistant" ? "assistant" : "user";
  const message = addMessage(body.chatId, role, body.text);
  if (!message) {
    return NextResponse.json({ error: "Unable to add message." }, { status: 500 });
  }

  return NextResponse.json({ chat, message });
}
