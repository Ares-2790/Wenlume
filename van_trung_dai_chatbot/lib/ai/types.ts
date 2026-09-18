export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ScanSegment = {
  chinese: string;
  pinyin: string;
  hanViet: string;
  vietnamese: string;
  english: string;
  explanation: string;
};

export type ScanVocabulary = {
  word: string;
  pinyin: string;
  hanViet: string;
  meaningVi: string;
  meaningEn: string;
  exampleZh: string;
  examplePinyin: string;
  exampleVi: string;
  partOfSpeech?: string;
};

export type ScanResult = {
  fullText: string;
  translationVietnamese: string;
  translationEnglish: string;
  segments: ScanSegment[];
  vocabulary: ScanVocabulary[];
};

export type TranslateMode = "natural" | "literal" | "learner";

export type TranslateResult = {
  sourceLang: string;
  targetLang: string;
  sourceText: string;
  translation: string;
  chinese?: string;
  pinyin?: string;
  hanViet?: string;
  keyWords?: Array<{
    word: string;
    pinyin: string;
    hanViet: string;
    meaningVi: string;
    meaningEn: string;
  }>;
  notes?: string;
};

export type SpeakingWordFeedback = {
  word: string;
  pinyin: string;
  status: "good" | "warning" | "incorrect";
  feedback: string;
};

export type SpeakingResult = {
  expected: string;
  expectedPinyin?: string;
  transcript: string;
  overallFeedback: string;
  fluencyFeedback: string;
  pronunciationFeedback: string;
  toneFeedback: string[];
  wordFeedback: SpeakingWordFeedback[];
  correction: string;
  naturalVersion: string;
  estimatedScore?: number;
  disclaimer: string;
};

export type CharacterCompound = {
  word: string;
  pinyin: string;
  hanViet: string;
  meaningVi: string;
  exampleZh: string;
  examplePinyin: string;
  exampleVi: string;
};

export type CharacterResult = {
  character: string;
  pinyin: string;
  hanViet: string;
  meanings: string[];
  radical: string;
  structure: string;
  originalMeaning: string;
  modernMeaning: string;
  mnemonic: string;
  compounds: CharacterCompound[];
  nearSynonyms: string[];
  easilyConfused: string[];
  notes: string;
  strokeOrderAvailable: boolean;
  strokeOrderNote: string;
};

export type ConversationTurnResult = {
  replyChinese: string;
  replyPinyin: string;
  replyVietnamese: string;
  correction?: string;
  tip?: string;
  newWords?: Array<{
    word: string;
    pinyin: string;
    meaningVi: string;
  }>;
};

export type LessonSummary = {
  goodSentences: string[];
  grammarErrors: string[];
  unnaturalWords: string[];
  newWords: Array<{ word: string; pinyin: string; meaningVi: string }>;
  usefulPatterns: string[];
  practiceAgain: string[];
};
