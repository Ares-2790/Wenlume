import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/ai/gemini";
import type { TtsMode } from "@/lib/ai/models";

export const maxDuration = 60;

// Simple in-memory cache for repeated playback in the same server instance
const cache = new Map<string, { audioBase64: string; mimeType: string }>();
const MAX_CACHE = 80;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = String(body.text ?? "").trim();
    const mode = (body.mode ?? "normal") as TtsMode;

    if (!text) {
      return NextResponse.json({ error: "Thiếu nội dung cần đọc." }, { status: 400 });
    }
    if (text.length > 800) {
      return NextResponse.json(
        { error: "Đoạn đọc quá dài (tối đa 800 ký tự)." },
        { status: 400 },
      );
    }

    const key = `${mode}::${text}`;
    const hit = cache.get(key);
    if (hit) {
      return NextResponse.json({ ...hit, cached: true });
    }

    const { audioBase64, mimeType, model } = await synthesizeSpeech({ text, mode });

    if (cache.size >= MAX_CACHE) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    cache.set(key, { audioBase64, mimeType });

    return NextResponse.json({ audioBase64, mimeType, model, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi TTS";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
