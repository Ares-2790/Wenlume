import { NextRequest, NextResponse } from "next/server";
import { lookupCharacter } from "@/lib/ai/gemini";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const character = String(body.character ?? "").trim();
    if (!character) {
      return NextResponse.json({ error: "Nhập chữ hoặc từ cần tra." }, { status: 400 });
    }
    if (character.length > 12) {
      return NextResponse.json({ error: "Quá dài (tối đa 12 ký tự)." }, { status: 400 });
    }
    const { result, model } = await lookupCharacter(character);
    return NextResponse.json({ result, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi Character Lens";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
