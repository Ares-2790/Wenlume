# Wenlume 文露明

Nền tảng học tiếng Trung có AI (Next.js + Gemini), deploy trên Vercel.

## Stack

- Next.js 15 App Router
- React 19 + TypeScript
- `@google/genai` (server-only)
- Streamlit `app.py` vẫn giữ cho chạy local cũ (không deploy Vercel)

## Chạy local

```powershell
npm install
copy .env.example .env.local
# điền GEMINI_API_KEY=
npm run dev
```

Mở http://localhost:3000

## Biến môi trường

```
GEMINI_API_KEY=...
```

Chỉ dùng phía server. Không dùng `NEXT_PUBLIC_*` cho API key.

## Model routing

Xem `lib/ai/models.ts`:

| Key | Model | Dùng cho |
|-----|-------|----------|
| PRIMARY | gemini-3.6-flash | Tutor, scan, dịch, vision |
| LITE | gemini-3.5-flash-lite | JSON / quiz nhẹ |
| LIVE | gemini-3.1-flash-live-preview | Conversation (Phase 4) |
| TTS | gemini-3.1-flash-tts-preview | Phát âm |

## PHASE 1 đã có

- Dashboard + sidebar
- AI Tutor (giữ chat Văn + Trung)
- Scan & Learn
- Translator
- TTS + nút nghe
- Vocabulary localStorage abstraction

## Phase tiếp

- Phase 2: Speaking, Shadow, Character Lens
- Phase 3: Flashcards, Progress
- Phase 4: Gemini Live Conversation
