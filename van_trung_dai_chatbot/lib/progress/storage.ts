const STORAGE_KEY = "wenlume.progress.v1";

export type ProgressState = {
  speakingSessions: number;
  shadowSessions: number;
  conversationSessions: number;
  lastActiveDate: string | null;
  streak: number;
  activity: Array<{
    id: string;
    type: string;
    label: string;
    at: string;
  }>;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function canUse() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function defaultState(): ProgressState {
  return {
    speakingSessions: 0,
    shadowSessions: 0,
    conversationSessions: 0,
    lastActiveDate: null,
    streak: 0,
    activity: [],
  };
}

function read(): ProgressState {
  if (!canUse()) return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...(JSON.parse(raw) as ProgressState) };
  } catch {
    return defaultState();
  }
}

function write(state: ProgressState) {
  if (!canUse()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bumpStreak(state: ProgressState): ProgressState {
  const t = today();
  if (state.lastActiveDate === t) return state;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toISOString().slice(0, 10);
  const streak =
    state.lastActiveDate === y ? Math.max(1, state.streak + 1) : 1;
  return { ...state, lastActiveDate: t, streak };
}

export const progressStorage = {
  get(): ProgressState {
    return read();
  },

  track(type: string, label: string) {
    let state = bumpStreak(read());
    if (type === "speaking") state.speakingSessions += 1;
    if (type === "shadow") state.shadowSessions += 1;
    if (type === "conversation") state.conversationSessions += 1;
    state.activity = [
      {
        id: crypto.randomUUID(),
        type,
        label,
        at: new Date().toISOString(),
      },
      ...state.activity,
    ].slice(0, 30);
    write(state);
    return state;
  },
};
