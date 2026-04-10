import { NextResponse } from "next/server";
import { listChatsForUser } from "@/lib/chat-store";

export async function GET(
  _request: Request,
  context: any
) {
  const { userId } = await (context.params as Promise<{ userId: string }>);
  if (!userId) {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 });
  }

  const chats = await listChatsForUser(userId);
  return NextResponse.json({ chats });
}
