import { NextResponse } from "next/server";
import { listChatsForUser, getUserId } from "@/lib/chat-store";

export async function GET() {
  const userId = await getUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  const chats = await listChatsForUser(userId);
  return NextResponse.json({ chats });
}
