import { NextResponse } from "next/server";
import { createChat } from "@/lib/chat-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.userId !== "string") {
    return NextResponse.json({ error: "Missing userId in request body." }, { status: 400 });
  }

  const chat = await createChat(body.userId, typeof body.title === "string" ? body.title : "New conversation");
  return NextResponse.json({ chat });
}
