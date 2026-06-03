// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LearnPage from "./LearnPage";
import type { SavedWord, UserProfile } from "@/types";

const frenchWords: SavedWord[] = [
  word("fr-1", "bonjour", "hello", "fr", "French", "FR", "greetings", 65),
  word("fr-2", "merci", "thank you", "fr", "French", "FR", "greetings", 80),
  word("fr-3", "marche", "market", "fr", "French", "FR", "shopping", 45),
  word("fr-4", "eau", "water", "fr", "French", "FR", "food", 58),
  word("fr-5", "cafe", "coffee", "fr", "French", "FR", "food", 72),
];

const japaneseWords: SavedWord[] = [
  word("ja-1", "ashita", "tomorrow", "ja", "Japanese", "JP", "other", 40),
  word("ja-2", "mizu", "water", "ja", "Japanese", "JP", "other", 58),
  word("ja-3", "migi", "right", "ja", "Japanese", "JP", "other", 55),
  word("ja-4", "hidari", "left", "ja", "Japanese", "JP", "other", 30),
];

const mocks = vi.hoisted(() => ({
  authUser: null as UserProfile | null,
  savedWords: [] as SavedWord[],
  startPracticeSession: vi.fn(),
  submitPracticeResult: vi.fn(),
  completePracticeSession: vi.fn(),
  updateWord: vi.fn(),
  createWord: vi.fn(),
  deleteWord: vi.fn(),
}));

vi.mock("@/contexts/useAuth", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

vi.mock("@/hooks/useLearnApi", () => ({
  useSavedWords: () => ({
    data: mocks.savedWords,
    isLoading: false,
    error: null,
  }),
  useStartPracticeSession: () => ({
    mutateAsync: mocks.startPracticeSession,
    isPending: false,
  }),
  useSubmitPracticeResult: () => ({
    mutateAsync: mocks.submitPracticeResult,
    isPending: false,
  }),
  useCompletePracticeSession: () => ({
    mutateAsync: mocks.completePracticeSession,
  }),
  useUpdateWord: () => ({
    mutate: mocks.updateWord,
    mutateAsync: mocks.updateWord,
  }),
  useCreateWord: () => ({
    mutateAsync: mocks.createWord,
    isPending: false,
  }),
  useDeleteWord: () => ({
    mutate: mocks.deleteWord,
  }),
  transformSessionWord: (word: {
    id: string;
    word: string;
    translation: string;
    language_code: string;
    language_name: string;
    language_flag: string;
    mastery_level: number;
  }): SavedWord => ({
    id: word.id,
    word: word.word,
    translation: word.translation,
    languageCode: word.language_code,
    languageName: word.language_name,
    languageFlag: word.language_flag,
    masteryLevel: word.mastery_level,
    source: "STARTER",
    createdAt: "2026-01-01T00:00:00.000Z",
  }),
}));

vi.mock("@/hooks/useLessonSession", () => ({
  useLessonSession: () => ({
    lessonBank: null,
    lessonWords: [],
    currentLessonWord: null,
    currentWordIndex: 0,
    lessonStep: 1,
    chipPool: [],
    placedChips: [],
    writeInput: "",
    writeAnswer: {
      status: "idle",
      attempts: 0,
      accuracy: null,
      normalizedAnswer: "",
      feedback: null,
      showHint: false,
      canReveal: false,
      canContinue: false,
    },
    isRecording: false,
    voicePrompt: {
      status: "idle",
      transcript: "",
      normalizedTranscript: "",
      accuracy: null,
      error: null,
      supportsSpeechRecognition: false,
      supportsSpeechSynthesis: false,
      isListening: false,
      isCorrect: false,
      canContinue: true,
    },
    isArrangeComplete: false,
    isArrangeCorrect: false,
    startLesson: vi.fn(() => false),
    exitLesson: vi.fn(),
    advanceStep: vi.fn(),
    placeChip: vi.fn(),
    removeChip: vi.fn(),
    reorderPlacedChips: vi.fn(),
    setWriteInput: vi.fn(),
    submitWriteAnswer: vi.fn(),
    revealWriteAnswer: vi.fn(),
    playVoicePrompt: vi.fn(),
    toggleRecording: vi.fn(),
    skipVoicePrompt: vi.fn(),
  }),
}));

vi.mock("@/services/api/posts", () => ({
  postsApi: {
    createPost: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function word(
  id: string,
  value: string,
  translation: string,
  languageCode: string,
  languageName: string,
  languageFlag: string,
  topic: string,
  masteryLevel: number
): SavedWord {
  return {
    id,
    word: value,
    translation,
    languageCode,
    languageName,
    languageFlag,
    topic,
    masteryLevel,
    source: "STARTER",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function frenchLearner(): UserProfile {
  return {
    id: "user-1",
    email: "learner@example.com",
    username: "learner",
    displayName: "Learner",
    createdAt: "2026-01-01T00:00:00.000Z",
    languages: [
      { code: "en", name: "English", flagEmoji: "EN", proficiency: "NATIVE", isLearning: false },
      { code: "fr", name: "French", flagEmoji: "FR", proficiency: "BEGINNER", isLearning: true },
    ],
    roles: [],
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  };
}

beforeEach(() => {
  mocks.authUser = frenchLearner();
  mocks.savedWords = [...frenchWords, ...japaneseWords];
  mocks.startPracticeSession.mockResolvedValue({
    session_id: "session-1",
    started_at: "2026-01-01T00:00:00.000Z",
    words: frenchWords.map(savedWord => ({
      id: savedWord.id,
      word: savedWord.word,
      translation: savedWord.translation,
      language_code: savedWord.languageCode,
      language_name: savedWord.languageName,
      language_flag: savedWord.languageFlag,
      mastery_level: savedWord.masteryLevel,
    })),
  });
  mocks.submitPracticeResult.mockResolvedValue({
    word_id: "fr-1",
    is_correct: true,
    old_mastery: 65,
    new_mastery: 72,
  });
  mocks.completePracticeSession.mockResolvedValue({});
  mocks.updateWord.mockResolvedValue({});
  mocks.createWord.mockResolvedValue({});
  mocks.deleteWord.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LearnPage learning-language scoping", () => {
  it("shows only active learning-language word banks and language options", async () => {
    render(<LearnPage />);

    expect(screen.getByText("Greetings & Phrases")).toBeTruthy();
    expect(screen.getByText("Food & Drink")).toBeTruthy();
    expect(screen.queryByText("Other")).toBeNull();

    fireEvent.pointerDown(screen.getByRole("button", { name: /All/i }), {
      button: 0,
      ctrlKey: false,
    });

    await waitFor(() => {
      expect(screen.getByText(/French/)).toBeTruthy();
    });
    expect(screen.queryByText(/Japanese/)).toBeNull();
  });

  it("starts quick practice with the single active learning language", async () => {
    render(<LearnPage />);

    fireEvent.click(screen.getByRole("button", { name: "5" }));
    fireEvent.click(screen.getByRole("button", { name: /Quick Practice \(5 words\)/i }));

    await waitFor(() => {
      expect(mocks.startPracticeSession).toHaveBeenCalledWith({
        session_size: 5,
        language_code: "fr",
      });
    });
  });
});
