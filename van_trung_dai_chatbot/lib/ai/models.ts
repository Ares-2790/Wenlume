/**
 * Central model registry for Wenlume.
 * Do not hardcode model IDs elsewhere — import from here.
 */
export const MODELS = {
  /** Main multimodal / reasoning model */
  PRIMARY: "gemini-3.6-flash",
  /** Cheap / high-volume tasks */
  LITE: "gemini-3.5-flash-lite",
  /** Realtime voice conversation */
  LIVE: "gemini-3.1-flash-live-preview",
  /** Text-to-speech */
  TTS: "gemini-3.1-flash-tts-preview",
} as const;

export type ModelKey = keyof typeof MODELS;
export type ModelId = (typeof MODELS)[ModelKey] | string;

/** Fallback chain when PRIMARY is overloaded */
export const PRIMARY_FALLBACKS: ModelId[] = [
  MODELS.PRIMARY,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

export const LITE_FALLBACKS: ModelId[] = [
  MODELS.LITE,
  MODELS.PRIMARY,
  "gemini-2.5-flash",
];

export const TTS_VOICE = "Kore";

export type TtsMode = "normal" | "slow" | "shadowing" | "literary";
