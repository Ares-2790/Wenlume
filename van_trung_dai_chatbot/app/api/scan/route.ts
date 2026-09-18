import { NextRequest, NextResponse } from "next/server";
import { analyzeScanImage } from "@/lib/ai/gemini";

export const maxDuration = 60;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu ảnh tải lên." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type) && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: `Định dạng ảnh không hỗ trợ: ${file.type || "unknown"}` },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Ảnh quá lớn (tối đa 8MB)." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { result, model } = await analyzeScanImage({
      mimeType: file.type || "image/jpeg",
      base64Data: buffer.toString("base64"),
    });

    return NextResponse.json({ result, model });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi phân tích ảnh";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
