export interface UserLanguage {
  code: string;
  name: string;
  flag: string;
  level: string;
  isLearning: boolean;
}

export interface SavedWord {
  id: string;
  word: string;
  translation: string;
  language: string;
  languageFlag: string;
  mastery: number;
  source: 'post' | 'scan';
  sourceContext?: string;
}
