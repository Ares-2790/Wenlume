import { NextRequest, NextResponse } from "next/server";
import { generateChat } from "@/lib/ai/gemini";
import { MODELS } from "@/lib/ai/models";
import {
  TAB_BY_ID,
  type TabId,
  VAN_HOC_SYSTEM_PROMPT,
} from "@/lib/prompt";

export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function hasApiKey() {
  const key = (process.env.GEMINI_API_KEY ?? "")
    .replace(/^\uFEFF/, "")
    .trim();
  return key.length > 0;
}

export async function POST(request: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "Chưa cấu hình GEMINI_API_KEY trên server." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const messages = body.messages as ChatMessage[];
    const tabId = (body.tabId as TabId) || "van_hoc";
    const mode = String(body.mode ?? "");
    const systemPrompt =
      TAB_BY_ID[tabId]?.systemPrompt ?? VAN_HOC_SYSTEM_PROMPT;

    if (!messages?.length) {
      return NextResponse.json({ error: "Thiếu tin nhắn." }, { status: 400 });
    }

    const modePrefix =
      mode === "socratic"
        ? "Mode: Giáo viên Socratic — hỏi dẫn dắt trước khi đưa đáp án đầy đủ.\n"
        : mode === "grammar"
          ? "Mode: Grammar Coach — tập trung ngữ pháp và sửa lỗi.\n"
          : mode === "essay"
            ? "Mode: Essay Review — chấm bài, chỉ lỗi, gợi ý cải thiện.\n"
            : "";

    const { answer, model } = await generateChat({
      messages,
      systemPrompt: `${modePrefix}${systemPrompt}`,
    });

    const note =
      model !== MODELS.PRIMARY
        ? `*(Đã dùng model \`${model}\` do model chính đang quá tải.)*\n\n`
        : "";

    return NextResponse.json({ answer: `${note}${answer}`, model });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
