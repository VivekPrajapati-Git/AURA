import { getChat, addMessage, generateAssistantText } from "@/lib/chat-store";

export async function GET(
  request: Request,
  context: any
) {
  const { chatId } = context.params as { chatId: string };
  const chat = getChat(chatId);
  if (!chat) {
    return new Response(JSON.stringify({ error: "Chat not found." }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  const url = new URL(request.url);
  const userText = url.searchParams.get("message");
  if (!userText) {
    return new Response(JSON.stringify({ error: "message query parameter is required." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const responseText = generateAssistantText(userText);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const chunks = responseText.split(" ");
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${chunk} \n\n`));
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      controller.enqueue(encoder.encode("event: done\ndata: complete\n\n"));
      controller.close();

      addMessage(chatId, "assistant", responseText);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
