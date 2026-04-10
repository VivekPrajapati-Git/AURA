import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const NODE_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

// GET /api/chat/[chatId]/message/[messageId]
// Proxies to Node: GET /chat/:chatId/message/:messageId
export async function GET(
  _request: Request,
  context: any
) {
  const { chatId, messageId } = await (context.params as Promise<{ chatId: string; messageId: string }>);
  const cookieStore = await cookies();
  const token = cookieStore.get("aura-token")?.value || "";

  const res = await fetch(`${NODE_BASE}/chat/${chatId}/message/${messageId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Message not found." }, { status: res.status });
  }

  const message = await res.json();
  return NextResponse.json({ message });
}
