// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { ComposeModal } from "@/components/feed/ComposeModal";
import { PostCard } from "@/components/feed/PostCard";
import { LessonSessionView } from "@/components/learn/LessonSessionView";
import type { Post, SavedWord } from "@/types";
import type { UserProfile } from "@/types/api";
import type { VoicePromptState } from "@/hooks/useVoicePrompt";
import type { WriteAnswerState } from "@/hooks/useLessonSession";

const mocks = vi.hoisted(() => ({
  authUser: null as UserProfile | null,
  commentsApi: {
    getComments: vi.fn(),
    createComment: vi.fn(),
  },
  postsApi: {
    getTranslation: vi.fn(),
    translateText: vi.fn(),
    savePost: vi.fn(),
    unsavePost: vi.fn(),
    deletePost: vi.fn(),
    reportPost: vi.fn(),
  },
  wordsApi: {
    saveWord: vi.fn(),
  },
}));

vi.mock("@/contexts/useAuth", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

vi.mock("@/contexts", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

vi.mock("@/services/api", () => ({
  commentsApi: mocks.commentsApi,
  postsApi: mocks.postsApi,
  wordsApi: mocks.wordsApi,
  LANGUAGES: [
    { code: "en", name: "English", flag: "EN" },
    { code: "es", name: "Spanish", flag: "ES" },
    { code: "ja", name: "Japanese", flag: "JA" },
  ],
}));

vi.mock("@/services/api/scanner", () => ({
  saveDetectedObject: vi.fn(),
  scanPostImage: vi.fn(),
}));

const viewer = (): UserProfile => ({
  id: "viewer",
  email: "viewer@example.com",
  username: "viewer",
  displayName: "Viewer",
  createdAt: "2026-01-01T00:00:00.000Z",
  languages: [
    { code: "en", name: "English", flagEmoji: "EN", proficiency: "NATIVE", isLearning: false },
    { code: "es", name: "Spanish", flagEmoji: "ES", proficiency: "BEGINNER", isLearning: true },
    { code: "ja", name: "Japanese", flagEmoji: "JA", proficiency: "BEGINNER", isLearning: true },
  ],
  roles: [],
  followersCount: 0,
  followingCount: 0,
  postsCount: 0,
});

const post = (overrides: Partial<Post> = {}): Post => ({
  id: "post-1",
  author: {
    id: "author-1",
    name: "Ana",
    avatar: "A",
    language: "Spanish",
    flag: "ES",
  },
  content: "hola mundo",
  originalLanguage: "es",
  translation: "",
  location: "",
  distance: "",
  reactions: { likes: 0, comments: 0 },
  time: "Now",
  ...overrides,
});

const savedWord = (id: string, word: string): SavedWord => ({
  id,
  word,
  translation: `native ${word}`,
  languageCode: "es",
  languageName: "Spanish",
  languageFlag: "ES",
  source: "MANUAL",
  masteryLevel: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const writeAnswer: WriteAnswerState = {
  status: "idle",
  attempts: 0,
  accuracy: null,
  normalizedAnswer: "",
  feedback: null,
  showHint: false,
  canReveal: false,
  canContinue: false,
};

const voicePrompt: VoicePromptState = {
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
};

const renderWithProviders = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  mocks.authUser = viewer();
  mocks.postsApi.getTranslation.mockResolvedValue({ languageCode: "en", translatedContent: "hello world" });
  mocks.postsApi.translateText.mockResolvedValue("hello");
  mocks.wordsApi.saveWord.mockResolvedValue(undefined);
  mocks.commentsApi.getComments.mockResolvedValue({ comments: [] });
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("translation direction flows", () => {
  it("translates feed posts to the viewer native language", async () => {
    renderWithProviders(<PostCard post={post()} />);

    fireEvent.click(screen.getByRole("button", { name: "Translate post to English" }));

    await waitFor(() => {
      expect(mocks.postsApi.getTranslation).toHaveBeenCalledWith("post-1", "en");
    });
    expect(await screen.findByText("hello world")).toBeTruthy();
  });

  it("saves selected phrases as learning-language words with native translations", async () => {
    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "hola" } as Selection);
    renderWithProviders(<PostCard post={post()} />);

    fireEvent.mouseUp(screen.getByText("hola mundo"));
    fireEvent.click(screen.getByRole("button", { name: "Translate phrase to English" }));

    await waitFor(() => {
      expect(mocks.postsApi.translateText).toHaveBeenCalledWith("hola", "es", "en");
    });
    expect(await screen.findByText("hello")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save to vocabulary" }));

    await waitFor(() => {
      expect(mocks.wordsApi.saveWord).toHaveBeenCalledWith({
        word: "hola",
        translation: "hello",
        languageCode: "es",
        postId: "post-1",
        context: "hola mundo",
      });
    });
  });

  it("defaults composer posts to the primary learning language and removes authored translations", () => {
    render(<ComposeModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByText("Write in Spanish")).toBeTruthy();
    expect(screen.queryByText("English translation (optional)")).toBeNull();
  });

  it("defaults lesson share content to learning-language phrases only", () => {
    const words = [savedWord("hola", "hola"), savedWord("adios", "adios")];

    render(
      <LessonSessionView
        bank={{ id: "greetings", label: "Greetings", words }}
        words={words.map((word) => ({
          ...word,
          bankId: "greetings",
          bankLabel: "Greetings",
          promptText: word.translation,
          acceptedAnswer: word.word,
          tokens: [],
        }))}
        word={{
          ...words[0],
          bankId: "greetings",
          bankLabel: "Greetings",
          promptText: words[0].translation,
          acceptedAnswer: words[0].word,
          tokens: [],
        }}
        currentWordIndex={1}
        step={4}
        chipPool={[]}
        placedChips={[]}
        writeInput=""
        writeAnswer={writeAnswer}
        isRecording={false}
        voicePrompt={voicePrompt}
        isArrangeComplete={false}
        isArrangeCorrect={false}
        onExit={vi.fn()}
        onAdvance={vi.fn()}
        onPlayVoicePrompt={vi.fn()}
        onToggleRecording={vi.fn()}
        onPlaceChip={vi.fn()}
        onRemoveChip={vi.fn()}
        onReorderPlacedChips={vi.fn()}
        onWriteInputChange={vi.fn()}
        onSubmitWriteAnswer={vi.fn()}
        onRevealWriteAnswer={vi.fn()}
        isPostingShare={false}
        onSharePost={vi.fn()}
        isShareLocationAttached={false}
        canAttachShareLocation={false}
        onToggleShareLocation={vi.fn()}
      />
    );

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("hola\nadios");
    expect(textarea.value).not.toContain("I finished");
  });
});
