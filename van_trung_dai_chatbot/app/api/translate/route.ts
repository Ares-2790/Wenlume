import { NextRequest, NextResponse } from "next/server";
import { translateText } from "@/lib/ai/gemini";
import type { TranslateMode } from "@/lib/ai/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = String(body.text ?? "").trim();
    const sourceLang = (body.sourceLang ?? "auto") as "zh" | "vi" | "en" | "auto";
    const targetLang = (body.targetLang ?? "vi") as "zh" | "vi" | "en";
    const mode = (body.mode ?? "natural") as TranslateMode;

    if (!text) {
      return NextResponse.json({ error: "Thiếu nội dung cần dịch." }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json(
        { error: "Văn bản quá dài (tối đa 4000 ký tự)." },
        { status: 400 },
      );
    }

    const { result, model } = await translateText({
      text,
      sourceLang,
      targetLang,
      mode,
    });

    return NextResponse.json({ result, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi dịch thuật";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
