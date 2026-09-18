"use client";

import { Loader2, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import type { TtsMode } from "@/lib/ai/models";

type Props = {
  text: string;
  mode?: TtsMode;
  label?: string;
  className?: string;
};

const memoryCache = new Map<string, string>();

export function SpeakButton({
  text,
  mode = "normal",
  label = "Nghe",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function play() {
    const clean = text.trim();
    if (!clean || loading) return;
    setError(null);
    setLoading(true);

    try {
      const cacheKey = `${mode}::${clean}`;
      let url = memoryCache.get(cacheKey);

      if (!url) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean, mode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không phát được âm thanh");

        const binary = atob(data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
        url = URL.createObjectURL(blob);
        memoryCache.set(cacheKey, url);
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi phát âm");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className={className}>
      <button type="button" className="icon-btn" onClick={() => void play()} title={label}>
        {loading ? <Loader2 size={16} className="spin" /> : <Volume2 size={16} />}
        <span>{label}</span>
      </button>
      {error ? <span className="field-error">{error}</span> : null}
    </span>
  );
}
