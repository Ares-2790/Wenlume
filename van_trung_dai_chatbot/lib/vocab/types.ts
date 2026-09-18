export type VocabSource =
  | "camera"
  | "chat"
  | "speaking"
  | "character"
  | "translator"
  | "manual";

export type VocabularyItem = {
  id: string;
  chinese: string;
  pinyin: string;
  hanViet: string;
  vietnamese: string;
  english: string;
  exampleChinese: string;
  examplePinyin: string;
  exampleVietnamese: string;
  source: VocabSource;
  createdAt: string;
  reviewCount: number;
  lastReviewedAt: string | null;
};
