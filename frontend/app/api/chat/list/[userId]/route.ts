import { NextResponse } from "next/server";
import { listChatsForUser } from "@/lib/chat-store";

export async function GET(
  _request: Request,
  context: any
) {
  const { userId } = context.params as { userId: string };
  if (!userId) {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 });
  }

  const chats = listChatsForUser(userId);
  return NextResponse.json({ chats });
}
