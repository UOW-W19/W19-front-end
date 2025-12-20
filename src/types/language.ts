export interface UserLanguage {
  code: string;
  name: string;
  flag: string;
  level: string;
  isLearning: boolean;
}

export interface SavedWord {
  word: string;
  translation: string;
  language: string;
  mastery: number;
}
