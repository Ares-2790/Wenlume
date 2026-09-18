import { NextRequest, NextResponse } from "next/server";
import { conversationTurn, summarizeConversation } from "@/lib/ai/gemini";

export const maxDuration = 60;
const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const action = String(form.get("action") ?? "turn");
      const scenario = String(form.get("scenario") ?? "Café");
      const level = String(form.get("level") ?? "HSK 2");
      const history = JSON.parse(String(form.get("history") ?? "[]")) as Array<{
        role: "user" | "assistant";
        content: string;
      }>;

      if (action === "summary") {
        const { result, model } = await summarizeConversation({
          scenario,
          level,
          history,
        });
        return NextResponse.json({ result, model });
      }

      const userText = String(form.get("text") ?? "");
      const file = form.get("audio");
      let audio:
        | { mimeType: string; base64Data: string }
        | undefined;

      if (file instanceof File) {
        if (file.size > MAX_BYTES) {
          return NextResponse.json(
            { error: "Audio quá lớn (tối đa 6MB)." },
            { status: 400 },
          );
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        audio = {
          mimeType: file.type || "audio/webm",
          base64Data: buffer.toString("base64"),
        };
      }

      if (!userText && !audio) {
        return NextResponse.json(
          { error: "Cần text hoặc audio." },
          { status: 400 },
        );
      }

      const { result, model } = await conversationTurn({
        scenario,
        level,
        history,
        userText,
        audio,
      });
      return NextResponse.json({ result, model });
    }

    const body = await request.json();
    if (body.action === "summary") {
      const { result, model } = await summarizeConversation({
        scenario: body.scenario,
        level: body.level,
        history: body.history ?? [],
      });
      return NextResponse.json({ result, model });
    }

    const { result, model } = await conversationTurn({
      scenario: body.scenario,
      level: body.level,
      history: body.history ?? [],
      userText: body.text,
    });
    return NextResponse.json({ result, model });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi Conversation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
