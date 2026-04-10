import { NextResponse } from "next/server";
import { getUserStats } from "@/lib/chat-store";

export async function GET(
  _request: Request,
  context: any
) {
  const { userId } = await (context.params as Promise<{ userId: string }>);
  if (!userId) {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 });
  }

  const stats = await getUserStats(userId);
  return NextResponse.json({ stats });
}
