import { NextResponse } from "next/server";
import { getMessage } from "@/lib/chat-store";

export async function GET(
  _request: Request,
  context: any
) {
  const { chatId, messageId } = context.params as { chatId: string; messageId: string };
  const message = getMessage(chatId, messageId);
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }
  return NextResponse.json({ message });
}
