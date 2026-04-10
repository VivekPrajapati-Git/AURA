import { NextResponse } from "next/server";
import { getMessageMetrics } from "@/lib/chat-store";

export async function GET(
  _request: Request,
  context: any
) {
  const { chatId, messageId } = await (context.params as Promise<{ chatId: string; messageId: string }>);
  const metrics = await getMessageMetrics(chatId, messageId);
  if (!metrics) {
    return NextResponse.json({ error: "Message metrics not found." }, { status: 404 });
  }
  return NextResponse.json({ metrics });
}
