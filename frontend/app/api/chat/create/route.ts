import { NextResponse } from "next/server";
import { createChat, getUserId } from "@/lib/chat-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = await getUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  const chat = await createChat(userId, typeof body.title === "string" ? body.title : "New conversation");
  return NextResponse.json({ chat });
}
