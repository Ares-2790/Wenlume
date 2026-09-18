"use client";

import { useCallback, useRef, useState } from "react";

type Status = "idle" | "recording" | "denied" | "unsupported";

export function useAudioRecorder() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError("Trình duyệt không hỗ trợ microphone.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch {
      setStatus("denied");
      setError(
        "Không lấy được quyền microphone. Hãy cho phép mic trong trình duyệt rồi thử lại.",
      );
    }
  }, []);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state === "inactive") {
      setStatus("idle");
      return null;
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        recorder.stream.getTracks().forEach((t) => t.stop());
        mediaRef.current = null;
        setStatus("idle");
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  return { status, error, start, stop };
}
