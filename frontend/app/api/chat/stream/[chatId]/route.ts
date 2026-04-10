import { cookies } from "next/headers";

const NODE_BASE = "http://127.0.0.1:5000";

// GET /api/chat/stream/[chatId]?message=...
// Proxies the Node SSE stream to the browser transparently
export async function GET(
  request: Request,
  context: any
) {
  const { chatId } = await (context.params as Promise<{ chatId: string }>);
  const url = new URL(request.url);
  const userText = url.searchParams.get("message");

  if (!userText) {
    return new Response(JSON.stringify({ error: "message query parameter is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("aura-token")?.value || "";

  // Forward as POST to Node SSE endpoint
  const upstreamRes = await fetch(`${NODE_BASE}/chat/message/stream/${chatId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: userText }),
  });

  if (!upstreamRes.ok || !upstreamRes.body) {
    return new Response(JSON.stringify({ error: "Upstream SSE failed." }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pipe the upstream SSE stream straight through to the browser
  return new Response(upstreamRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
