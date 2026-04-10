import { NextResponse } from "next/server";
import { getUserStats } from "@/lib/chat-store";

export async function GET(
  _request: Request,
  context: any
) {
  const { userId } = context.params as { userId: string };
  if (!userId) {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 });
  }

  const stats = getUserStats(userId);
  return NextResponse.json({ stats });
}
