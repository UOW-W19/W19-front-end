// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVoicePrompt } from "@/hooks/useVoicePrompt";
import type { LessonWord } from "@/types";

class FakeSpeechRecognition {
  static instance: FakeSpeechRecognition | null = null;

  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string; message?: string }) => void) | null = null;
  onnomatch: (() => void) | null = null;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } | undefined } | undefined; length: number } }) => void) | null = null;
  onstart: (() => void) | null = null;
  abort = vi.fn();
  stop = vi.fn();
  start = vi.fn(() => {
    this.onstart?.();
  });

  constructor() {
    FakeSpeechRecognition.instance = this;
  }
}

const lessonWord: LessonWord = {
  id: "hola",
  word: "hola",
  translation: "hello",
  masteryLevel: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  languageCode: "es",
  languageName: "Spanish",
  languageFlag: "ES",
  source: "MANUAL",
  bankId: "greetings",
  bankLabel: "Greetings",
  promptText: "hello",
  acceptedAnswer: "hola",
  tokens: [],
};

const installFakeRecognition = () => {
  Object.defineProperty(window, "webkitSpeechRecognition", {
    configurable: true,
    value: FakeSpeechRecognition,
  });
};

afterEach(() => {
  delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition;
  delete (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  FakeSpeechRecognition.instance = null;
  vi.restoreAllMocks();
});

describe("useVoicePrompt", () => {
  it("allows continuing when speech recognition is unsupported", () => {
    const { result } = renderHook(() => useVoicePrompt(lessonWord));

    expect(result.current.voicePrompt.supportsSpeechRecognition).toBe(false);
    expect(result.current.voicePrompt.canContinue).toBe(true);
  });

  it("allows learners to explicitly skip the voice check", () => {
    const { result } = renderHook(() => useVoicePrompt(lessonWord));

    act(() => {
      result.current.skipVoicePrompt();
    });

    expect(result.current.voicePrompt.status).toBe("skipped");
    expect(result.current.voicePrompt.canContinue).toBe(true);
  });

  it("treats recognition ending without a result as recoverable", () => {
    installFakeRecognition();
    const { result } = renderHook(() => useVoicePrompt(lessonWord));

    act(() => {
      result.current.startListening();
    });
    expect(result.current.voicePrompt.status).toBe("listening");

    act(() => {
      FakeSpeechRecognition.instance?.onend?.();
    });

    expect(result.current.voicePrompt.status).toBe("skipped");
    expect(result.current.voicePrompt.error).toBe("I did not catch anything. You can continue or try again.");
    expect(result.current.voicePrompt.canContinue).toBe(true);
  });

  it("keeps incorrect speech recoverable even when the browser immediately ends recognition", () => {
    installFakeRecognition();
    const { result } = renderHook(() => useVoicePrompt(lessonWord));

    act(() => {
      result.current.startListening();
    });
    act(() => {
      FakeSpeechRecognition.instance?.onresult?.({
        results: {
          0: { 0: { transcript: "adios" } },
          length: 1,
        },
      });
      FakeSpeechRecognition.instance?.onend?.();
    });

    expect(result.current.voicePrompt.status).toBe("incorrect");
    expect(result.current.voicePrompt.transcript).toBe("adios");
    expect(result.current.voicePrompt.canContinue).toBe(true);
  });
});
