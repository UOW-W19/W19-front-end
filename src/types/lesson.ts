import type { SavedWord } from "./api";

export const LESSON_EXERCISE_SEQUENCE = [
  "VOICE_PROMPT",
  "ARRANGE_CHIPS",
  "WRITE_SELF",
] as const;

export const LESSON_FLOW_SEQUENCE = [
  ...LESSON_EXERCISE_SEQUENCE,
  "SHARE",
] as const;

export type LessonExerciseKind = (typeof LESSON_EXERCISE_SEQUENCE)[number];
export type LessonStepKind = (typeof LESSON_FLOW_SEQUENCE)[number];

export type LessonSessionStatus =
  | "READY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ABANDONED";

export type LessonStepStatus =
  | "PENDING"
  | "ACTIVE"
  | "PASSED"
  | "FAILED"
  | "SKIPPED";

export type LessonAttemptOutcome =
  | "CORRECT"
  | "INCORRECT"
  | "SKIPPED"
  | "UNSUPPORTED";

export interface LessonWordBank {
  id: string;
  label: string;
  words: SavedWord[];
}

export interface LessonToken {
  id: string;
  text: string;
  sourceIndex: number;
}

export interface LessonWord extends SavedWord {
  bankId: string;
  bankLabel: string;
  promptText: string;
  acceptedAnswer: string;
  tokens: LessonToken[];
}

export interface LessonExercise {
  id: string;
  kind: LessonExerciseKind;
  wordId: string;
  prompt: string;
  expectedAnswer: string;
  tokens?: LessonToken[];
  status: LessonStepStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface LessonStepAttempt {
  exerciseId: string;
  wordId: string;
  kind: LessonExerciseKind;
  attemptNumber: number;
  outcome: LessonAttemptOutcome;
  submittedAnswer?: string;
  normalizedSubmittedAnswer?: string;
  expectedAnswer: string;
  normalizedExpectedAnswer: string;
  responseTimeMs?: number;
  accuracy?: number;
  usedHint?: boolean;
  createdAt: string;
}

export interface LessonExerciseResult {
  exerciseId: string;
  wordId: string;
  kind: LessonExerciseKind;
  outcome: LessonAttemptOutcome;
  attempts: LessonStepAttempt[];
  responseTimeMs?: number;
  accuracy?: number;
  completedAt: string;
}

export interface LessonShareDraft {
  lessonId: string;
  wordIds: string[];
  content: string;
  translation?: string;
  originalLanguage: string;
  communityId?: string;
  communityLabel?: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  isPublic: boolean;
}

export interface LessonShareResult {
  postId: string;
  sharedAt: string;
}

export interface LessonSession {
  id: string;
  status: LessonSessionStatus;
  source: {
    type: "WORD_BANK";
    id: string;
    label: string;
  };
  words: LessonWord[];
  exercises: LessonExercise[];
  currentExerciseIndex: number;
  results: LessonExerciseResult[];
  shareDraft?: LessonShareDraft;
  shareResult?: LessonShareResult;
  startedAt?: string;
  completedAt?: string;
}

export interface StartLessonSessionRequest {
  wordBankId: string;
  wordIds: string[];
  lessonSize: number;
}

export interface StartLessonSessionResponse {
  sessionId: string;
  words: LessonWord[];
  exercises: LessonExercise[];
  startedAt: string;
}

export interface SubmitLessonStepRequest {
  exerciseId: string;
  wordId: string;
  kind: LessonExerciseKind;
  attempt: LessonStepAttempt;
}

export interface SubmitLessonStepResponse {
  exerciseId: string;
  wordId: string;
  kind: LessonExerciseKind;
  outcome: LessonAttemptOutcome;
  oldMastery: number;
  newMastery: number;
}

export interface CompleteLessonSessionRequest {
  results: LessonExerciseResult[];
  shareDraft?: LessonShareDraft;
}

export interface CompleteLessonSessionResponse {
  sessionId: string;
  status: "COMPLETED";
  wordsPracticed: number;
  correctCount: number;
  accuracy: number;
  durationSeconds: number;
  shareResult?: LessonShareResult;
  completedAt: string;
}
