// This route is superseded by /api/chat/message (which calls the real Node backend).
// Kept here as a redirect alias for any legacy calls.
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.chatId !== "string" || typeof body.text !== "string") {
    return NextResponse.json({ error: "chatId and text are required." }, { status: 400 });
  }
  // Forward to the canonical /api/chat/message endpoint
  const res = await fetch(new URL("/api/chat/message", request.url).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") || "" },
    body: JSON.stringify({ chatId: body.chatId, message: body.text }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
