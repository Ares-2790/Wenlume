import type { VocabularyItem, VocabSource } from "./types";

const STORAGE_KEY = "wenlume.vocabulary.v1";

export type VocabInput = {
  chinese: string;
  pinyin?: string;
  hanViet?: string;
  vietnamese?: string;
  english?: string;
  exampleChinese?: string;
  examplePinyin?: string;
  exampleVietnamese?: string;
  source?: VocabSource;
};

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readAll(): VocabularyItem[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VocabularyItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: VocabularyItem[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const vocabStorage = {
  list(): VocabularyItem[] {
    return readAll().sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  },

  count(): number {
    return readAll().length;
  },

  save(input: VocabInput): VocabularyItem {
    const items = readAll();
    const existing = items.find((item) => item.chinese === input.chinese.trim());
    if (existing) {
      return existing;
    }

    const item: VocabularyItem = {
      id: crypto.randomUUID(),
      chinese: input.chinese.trim(),
      pinyin: input.pinyin ?? "",
      hanViet: input.hanViet ?? "",
      vietnamese: input.vietnamese ?? "",
      english: input.english ?? "",
      exampleChinese: input.exampleChinese ?? "",
      examplePinyin: input.examplePinyin ?? "",
      exampleVietnamese: input.exampleVietnamese ?? "",
      source: input.source ?? "manual",
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      lastReviewedAt: null,
    };

    items.unshift(item);
    writeAll(items);
    return item;
  },

  remove(id: string) {
    writeAll(readAll().filter((item) => item.id !== id));
  },

  markReviewed(id: string) {
    const items = readAll().map((item) =>
      item.id === id
        ? {
            ...item,
            reviewCount: item.reviewCount + 1,
            lastReviewedAt: new Date().toISOString(),
          }
        : item,
    );
    writeAll(items);
  },

  dueForReview(limit = 20): VocabularyItem[] {
    return readAll()
      .sort((a, b) => {
        const aTime = a.lastReviewedAt ? +new Date(a.lastReviewedAt) : 0;
        const bTime = b.lastReviewedAt ? +new Date(b.lastReviewedAt) : 0;
        return aTime - bTime;
      })
      .slice(0, limit);
  },
};
