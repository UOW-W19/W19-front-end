// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLessonSession, type LessonProgressUpdate } from "@/hooks/useLessonSession";
import type { LessonWordBank, SavedWord } from "@/types";

function savedWord(
  id: string,
  word: string,
  translation: string,
  masteryLevel: number
): SavedWord {
  return {
    id,
    word,
    translation,
    masteryLevel,
    createdAt: "2026-01-01T00:00:00.000Z",
    languageCode: "es",
    languageName: "Spanish",
    languageFlag: "ES",
    source: "MANUAL",
  };
}

function requireProgress(progress: LessonProgressUpdate | null): LessonProgressUpdate {
  expect(progress).not.toBeNull();
  return progress as LessonProgressUpdate;
}

describe("useLessonSession", () => {
  it("loops listen, arrange, and write steps across every lesson word before sharing", () => {
    const bank: LessonWordBank = {
      id: "greetings",
      label: "Greetings",
      words: [
        savedWord("adios", "adios", "goodbye", 20),
        savedWord("hola", "hola", "hello", 0),
      ],
    };

    const { result } = renderHook(() => useLessonSession());

    act(() => {
      expect(result.current.startLesson(bank)).toBe(true);
    });

    expect(result.current.lessonWords.map((word) => word.id)).toEqual(["hola", "adios"]);
    expect(result.current.currentLessonWord?.id).toBe("hola");
    expect(result.current.currentWordIndex).toBe(0);
    expect(result.current.lessonStep).toBe(1);

    act(() => {
      expect(result.current.advanceStep()).toBeNull();
    });
    expect(result.current.lessonStep).toBe(2);

    const firstToken = result.current.chipPool[0];
    if (!firstToken) throw new Error("Expected first lesson token");

    act(() => {
      result.current.placeChip(firstToken.id);
    });
    expect(result.current.isArrangeCorrect).toBe(true);

    act(() => {
      expect(result.current.advanceStep()).toBeNull();
    });
    expect(result.current.lessonStep).toBe(3);

    act(() => {
      result.current.setWriteInput("hola");
    });
    act(() => {
      result.current.submitWriteAnswer();
    });

    let firstProgress: LessonProgressUpdate | null = null;
    act(() => {
      firstProgress = result.current.advanceStep();
    });
    const firstProgressResult = requireProgress(firstProgress);

    expect(firstProgressResult).toMatchObject({
      wordId: "hola",
      previousMastery: 0,
      nextMastery: 4,
      masteryDelta: 4,
      correctCount: 2,
      totalExercises: 3,
    });
    expect(firstProgressResult.accuracy).toBeCloseTo(2 / 3);
    expect(result.current.currentLessonWord?.id).toBe("adios");
    expect(result.current.currentWordIndex).toBe(1);
    expect(result.current.lessonStep).toBe(1);

    act(() => {
      result.current.advanceStep();
    });

    const secondToken = result.current.chipPool[0];
    if (!secondToken) throw new Error("Expected second lesson token");

    act(() => {
      result.current.placeChip(secondToken.id);
    });
    act(() => {
      result.current.advanceStep();
    });
    act(() => {
      result.current.setWriteInput("adios");
    });
    act(() => {
      result.current.submitWriteAnswer();
    });

    let secondProgress: LessonProgressUpdate | null = null;
    act(() => {
      secondProgress = result.current.advanceStep();
    });
    const secondProgressResult = requireProgress(secondProgress);

    expect(secondProgressResult).toMatchObject({
      wordId: "adios",
      previousMastery: 20,
      nextMastery: 24,
      masteryDelta: 4,
    });
    expect(result.current.lessonStep).toBe(4);
    expect(result.current.currentLessonWord?.id).toBe("adios");
  });

  it("does not award write mastery when the answer is revealed", () => {
    const bank: LessonWordBank = {
      id: "food",
      label: "Food",
      words: [savedWord("pan", "pan", "bread", 10)],
    };

    const { result } = renderHook(() => useLessonSession());

    act(() => {
      result.current.startLesson(bank);
    });
    act(() => {
      result.current.advanceStep();
    });

    const token = result.current.chipPool[0];
    if (!token) throw new Error("Expected lesson token");

    act(() => {
      result.current.placeChip(token.id);
    });
    act(() => {
      result.current.advanceStep();
    });
    act(() => {
      result.current.setWriteInput("wrong");
    });
    act(() => {
      result.current.submitWriteAnswer();
    });
    act(() => {
      result.current.submitWriteAnswer();
    });
    act(() => {
      result.current.revealWriteAnswer();
    });

    let progress: LessonProgressUpdate | null = null;
    act(() => {
      progress = result.current.advanceStep();
    });
    const progressResult = requireProgress(progress);

    expect(progressResult).toMatchObject({
      wordId: "pan",
      previousMastery: 10,
      nextMastery: 12,
      masteryDelta: 2,
      correctCount: 1,
      totalExercises: 3,
    });
    expect(result.current.lessonStep).toBe(4);
  });

  it("lets learners skip the voice prompt and continue to arrange", () => {
    const bank: LessonWordBank = {
      id: "greetings",
      label: "Greetings",
      words: [savedWord("hola", "hola", "hello", 0)],
    };

    const { result } = renderHook(() => useLessonSession());

    act(() => {
      result.current.startLesson(bank);
    });
    act(() => {
      result.current.skipVoicePrompt();
    });

    expect(result.current.voicePrompt.status).toBe("skipped");
    expect(result.current.voicePrompt.canContinue).toBe(true);

    act(() => {
      expect(result.current.advanceStep()).toBeNull();
    });

    expect(result.current.lessonStep).toBe(2);
  });

  it("does not duplicate a chip when placement fires twice", () => {
    const bank: LessonWordBank = {
      id: "greetings",
      label: "Greetings",
      words: [savedWord("hola", "hola", "hello", 0)],
    };

    const { result } = renderHook(() => useLessonSession());

    act(() => {
      result.current.startLesson(bank);
    });
    act(() => {
      result.current.advanceStep();
    });

    const token = result.current.chipPool[0];
    if (!token) throw new Error("Expected lesson token");

    act(() => {
      result.current.placeChip(token.id);
      result.current.placeChip(token.id);
    });

    expect(result.current.placedChips.map((chip) => chip.id)).toEqual([token.id]);
    expect(result.current.chipPool).toEqual([]);
    expect(result.current.isArrangeCorrect).toBe(true);
  });
});
