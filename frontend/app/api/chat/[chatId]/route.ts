import { NextResponse } from "next/server";
import { deleteChat, getChat, updateChatTitle } from "@/lib/chat-store";

export async function GET(
  _request: Request,
  context: any
) {
  const { chatId } = await (context.params as Promise<{ chatId: string }>);
  const chat = await getChat(chatId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }
  return NextResponse.json({ chat });
}

export async function PATCH(
  request: Request,
  context: any
) {
  const { chatId } = await (context.params as Promise<{ chatId: string }>);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  const chat = await updateChatTitle(chatId, body.title);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  return NextResponse.json({ chat });
}

export async function DELETE(
  _request: Request,
  context: any
) {
  const { chatId } = await (context.params as Promise<{ chatId: string }>);
  const deleted = await deleteChat(chatId);
  if (!deleted) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
