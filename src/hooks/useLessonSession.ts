import { useCallback, useMemo, useState } from "react";
import {
  createLessonWords,
  isLessonAnswerCorrect,
  isTokenOrderCorrect,
  normalizeLessonAnswer,
  scoreLessonAnswer,
  shuffleLessonTokens,
  tokensToPhrase,
} from "@/lib/lesson";
import { useVoicePrompt } from "@/hooks/useVoicePrompt";
import type {
  LessonAttemptOutcome,
  LessonExerciseKind,
  LessonExerciseResult,
  LessonToken,
  LessonWord,
  LessonWordBank,
} from "@/types";

export type LessonStepNumber = 1 | 2 | 3 | 4;
export type WriteAnswerStatus = "idle" | "correct" | "close" | "incorrect" | "revealed";

export interface WriteAnswerState {
  status: WriteAnswerStatus;
  attempts: number;
  accuracy: number | null;
  normalizedAnswer: string;
  feedback: string | null;
  showHint: boolean;
  canReveal: boolean;
  canContinue: boolean;
}

export interface LessonProgressUpdate {
  wordId: string;
  word: string;
  previousMastery: number;
  nextMastery: number;
  masteryDelta: number;
  correctCount: number;
  totalExercises: number;
  accuracy: number;
  results: LessonExerciseResult[];
  completedAt: string;
}

const INITIAL_STEP: LessonStepNumber = 1;
const EMPTY_LESSON_TOKENS: LessonToken[] = [];
const INITIAL_WRITE_ANSWER: WriteAnswerState = {
  status: "idle",
  attempts: 0,
  accuracy: null,
  normalizedAnswer: "",
  feedback: null,
  showHint: false,
  canReveal: false,
  canContinue: false,
};
const EXERCISE_KIND_BY_STEP: Record<Exclude<LessonStepNumber, 4>, LessonExerciseKind> = {
  1: "VOICE_PROMPT",
  2: "ARRANGE_CHIPS",
  3: "WRITE_SELF",
};
const MASTERY_POINTS_PER_CORRECT_EXERCISE = 2;

function insertTokenBefore(
  tokens: LessonToken[],
  token: LessonToken,
  beforeTokenId?: string
): LessonToken[] {
  if (!beforeTokenId) return [...tokens, token];

  const insertIndex = tokens.findIndex((item) => item.id === beforeTokenId);
  if (insertIndex < 0) return [...tokens, token];

  return [
    ...tokens.slice(0, insertIndex),
    token,
    ...tokens.slice(insertIndex),
  ];
}

function reorderTokens(tokens: LessonToken[], activeId: string, overId: string): LessonToken[] {
  const activeIndex = tokens.findIndex((token) => token.id === activeId);
  const overIndex = tokens.findIndex((token) => token.id === overId);

  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return tokens;

  const nextTokens = [...tokens];
  const [activeToken] = nextTokens.splice(activeIndex, 1);
  if (!activeToken) return tokens;

  nextTokens.splice(overIndex, 0, activeToken);
  return nextTokens;
}

function replaceExerciseResult(
  results: LessonExerciseResult[],
  result: LessonExerciseResult
): LessonExerciseResult[] {
  return [
    ...results.filter((item) => item.exerciseId !== result.exerciseId),
    result,
  ];
}

function getMasteryDelta(results: LessonExerciseResult[]): number {
  return results.reduce((total, result) => (
    result.outcome === "CORRECT"
      ? total + MASTERY_POINTS_PER_CORRECT_EXERCISE
      : total
  ), 0);
}

function getVoiceOutcome(
  voicePrompt: ReturnType<typeof useVoicePrompt>["voicePrompt"]
): LessonAttemptOutcome {
  if (voicePrompt.isCorrect) return "CORRECT";
  if (!voicePrompt.supportsSpeechRecognition || voicePrompt.status === "unsupported") {
    return "UNSUPPORTED";
  }

  return "SKIPPED";
}

export function useLessonSession() {
  const [lessonBank, setLessonBank] = useState<LessonWordBank | null>(null);
  const [lessonWords, setLessonWords] = useState<LessonWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [lessonStep, setLessonStep] = useState<LessonStepNumber>(INITIAL_STEP);
  const [chipPool, setChipPool] = useState<LessonToken[]>([]);
  const [placedChips, setPlacedChips] = useState<LessonToken[]>([]);
  const [writeInput, setWriteInput] = useState("");
  const [writeAnswer, setWriteAnswer] = useState<WriteAnswerState>(INITIAL_WRITE_ANSWER);
  const [lessonResults, setLessonResults] = useState<LessonExerciseResult[]>([]);

  const currentLessonWord = lessonWords[currentWordIndex] ?? null;
  const lessonTokens = currentLessonWord?.tokens ?? EMPTY_LESSON_TOKENS;
  const {
    voicePrompt,
    playPrompt,
    toggleListening,
    resetVoicePrompt,
  } = useVoicePrompt(currentLessonWord);

  const resetExerciseState = useCallback((word: LessonWord | null) => {
    resetVoicePrompt();
    setChipPool(word ? shuffleLessonTokens(word.tokens) : []);
    setPlacedChips([]);
    setWriteInput("");
    setWriteAnswer(INITIAL_WRITE_ANSWER);
  }, [resetVoicePrompt]);

  const startLesson = useCallback((bank: LessonWordBank) => {
    const words = createLessonWords(bank);
    const firstWord = words[0] ?? null;

    if (!firstWord) return false;

    setLessonBank(bank);
    setLessonWords(words);
    setCurrentWordIndex(0);
    setLessonStep(INITIAL_STEP);
    setLessonResults([]);
    resetExerciseState(firstWord);

    return true;
  }, [resetExerciseState]);

  const exitLesson = useCallback(() => {
    setLessonBank(null);
    setLessonWords([]);
    setCurrentWordIndex(0);
    setLessonStep(INITIAL_STEP);
    setLessonResults([]);
    resetExerciseState(null);
  }, [resetExerciseState]);

  const createExerciseResult = useCallback((
    kind: LessonExerciseKind,
    outcome: LessonAttemptOutcome,
    submittedAnswer?: string,
    accuracy?: number | null
  ): LessonExerciseResult | null => {
    if (!currentLessonWord) return null;

    const completedAt = new Date().toISOString();
    const expectedAnswer = currentLessonWord.acceptedAnswer;

    return {
      exerciseId: `${currentLessonWord.id}-${kind}`,
      wordId: currentLessonWord.id,
      kind,
      outcome,
      attempts: [
        {
          exerciseId: `${currentLessonWord.id}-${kind}`,
          wordId: currentLessonWord.id,
          kind,
          attemptNumber: 1,
          outcome,
          submittedAnswer,
          normalizedSubmittedAnswer: submittedAnswer
            ? normalizeLessonAnswer(submittedAnswer)
            : undefined,
          expectedAnswer,
          normalizedExpectedAnswer: normalizeLessonAnswer(expectedAnswer),
          accuracy: accuracy ?? undefined,
          usedHint: kind === "WRITE_SELF" ? writeAnswer.showHint : false,
          createdAt: completedAt,
        },
      ],
      accuracy: accuracy ?? undefined,
      completedAt,
    };
  }, [currentLessonWord, writeAnswer.showHint]);

  const createProgressUpdate = useCallback((
    results: LessonExerciseResult[]
  ): LessonProgressUpdate | null => {
    if (!currentLessonWord) return null;

    const masteryDelta = getMasteryDelta(results);
    const correctCount = results.filter((result) => result.outcome === "CORRECT").length;
    const totalExercises = results.length || 1;
    const completedAt = new Date().toISOString();

    return {
      wordId: currentLessonWord.id,
      word: currentLessonWord.word,
      previousMastery: currentLessonWord.masteryLevel,
      nextMastery: Math.min(100, currentLessonWord.masteryLevel + masteryDelta),
      masteryDelta,
      correctCount,
      totalExercises,
      accuracy: correctCount / totalExercises,
      results,
      completedAt,
    };
  }, [currentLessonWord]);

  const expectedPhrase = useMemo(() => tokensToPhrase(lessonTokens), [lessonTokens]);
  const arrangedPhrase = useMemo(() => tokensToPhrase(placedChips), [placedChips]);
  const isArrangeComplete = chipPool.length === 0 && placedChips.length === lessonTokens.length;
  const isArrangeCorrect = isArrangeComplete && isTokenOrderCorrect(placedChips, lessonTokens);

  const advanceStep = useCallback((): LessonProgressUpdate | null => {
    if (!currentLessonWord) return null;

    const kind = lessonStep === 4
      ? null
      : EXERCISE_KIND_BY_STEP[lessonStep];
    let result: LessonExerciseResult | null = null;

    if (kind === "VOICE_PROMPT") {
      result = createExerciseResult(
        kind,
        getVoiceOutcome(voicePrompt),
        voicePrompt.transcript || undefined,
        voicePrompt.accuracy
      );
    } else if (kind === "ARRANGE_CHIPS") {
      result = createExerciseResult(
        kind,
        isArrangeCorrect ? "CORRECT" : "INCORRECT",
        arrangedPhrase,
        isArrangeCorrect ? 1 : 0
      );
    } else if (kind === "WRITE_SELF") {
      result = createExerciseResult(
        kind,
        writeAnswer.status === "correct" ? "CORRECT" : "SKIPPED",
        writeInput,
        writeAnswer.accuracy
      );
    }

    const nextResults = result
      ? replaceExerciseResult(lessonResults, result)
      : lessonResults;

    if (result) {
      setLessonResults(nextResults);
    }

    if (lessonStep === 3) {
      const progressUpdate = createProgressUpdate(nextResults);
      const nextWordIndex = currentWordIndex + 1;
      const nextWord = lessonWords[nextWordIndex] ?? null;

      if (nextWord) {
        setCurrentWordIndex(nextWordIndex);
        setLessonStep(INITIAL_STEP);
        setLessonResults([]);
        resetExerciseState(nextWord);
      } else {
        setLessonStep(4);
      }

      return progressUpdate;
    }

    setLessonStep((step) => (step < 4 ? ((step + 1) as LessonStepNumber) : step));
    return null;
  }, [
    arrangedPhrase,
    createExerciseResult,
    createProgressUpdate,
    currentWordIndex,
    currentLessonWord,
    isArrangeCorrect,
    lessonResults,
    lessonStep,
    lessonWords,
    resetExerciseState,
    voicePrompt,
    writeAnswer.accuracy,
    writeAnswer.status,
    writeInput,
  ]);

  const placeChip = useCallback((tokenId: string, beforeTokenId?: string) => {
    setChipPool((pool) => {
      const selectedToken = pool.find((token) => token.id === tokenId);
      if (!selectedToken) return pool;

      setPlacedChips((placed) => insertTokenBefore(placed, selectedToken, beforeTokenId));
      return pool.filter((token) => token.id !== tokenId);
    });
  }, []);

  const removeChip = useCallback((tokenId: string) => {
    setPlacedChips((placed) => {
      const selectedToken = placed.find((token) => token.id === tokenId);
      if (!selectedToken) return placed;

      setChipPool((pool) => [...pool, selectedToken]);
      return placed.filter((token) => token.id !== tokenId);
    });
  }, []);

  const reorderPlacedChips = useCallback((activeId: string, overId: string) => {
    setPlacedChips((placed) => reorderTokens(placed, activeId, overId));
  }, []);

  const updateWriteInput = useCallback((value: string) => {
    setWriteInput(value);
    setWriteAnswer((current) => {
      if (current.status === "revealed") return current;

      return {
        ...current,
        status: "idle",
        accuracy: null,
        normalizedAnswer: normalizeLessonAnswer(value),
        feedback: null,
        canContinue: false,
      };
    });
  }, []);

  const submitWriteAnswer = useCallback(() => {
    if (!currentLessonWord) return;

    const expectedAnswer = currentLessonWord.acceptedAnswer;
    const normalizedAnswer = normalizeLessonAnswer(writeInput);
    const accuracy = scoreLessonAnswer(writeInput, expectedAnswer);
    const isCorrect = isLessonAnswerCorrect(writeInput, expectedAnswer);

    setWriteAnswer((current) => {
      const attempts = current.attempts + 1;
      const isClose = !isCorrect && accuracy >= 0.67;
      const showHint = !isCorrect && attempts >= 2;
      const canReveal = !isCorrect && attempts >= 2;

      return {
        status: isCorrect ? "correct" : isClose ? "close" : "incorrect",
        attempts,
        accuracy,
        normalizedAnswer,
        feedback: isCorrect
          ? "Correct!"
          : isClose
            ? "Close. Check the spelling or word order."
            : "Not quite. Try again.",
        showHint,
        canReveal,
        canContinue: isCorrect,
      };
    });
  }, [currentLessonWord, writeInput]);

  const revealWriteAnswer = useCallback(() => {
    if (!currentLessonWord) return;

    const expectedAnswer = currentLessonWord.acceptedAnswer;
    setWriteInput(expectedAnswer);
    setWriteAnswer((current) => ({
      status: "revealed",
      attempts: current.attempts,
      accuracy: null,
      normalizedAnswer: normalizeLessonAnswer(expectedAnswer),
      feedback: "Answer revealed.",
      showHint: true,
      canReveal: false,
      canContinue: true,
    }));
  }, [currentLessonWord]);

  return {
    lessonBank,
    lessonWords,
    currentLessonWord,
    currentWordIndex,
    lessonStep,
    lessonTokens,
    lessonResults,
    chipPool,
    placedChips,
    writeInput,
    writeAnswer,
    isRecording: voicePrompt.isListening,
    voicePrompt,
    expectedPhrase,
    arrangedPhrase,
    isArrangeComplete,
    isArrangeCorrect,
    startLesson,
    exitLesson,
    advanceStep,
    placeChip,
    removeChip,
    reorderPlacedChips,
    setWriteInput: updateWriteInput,
    submitWriteAnswer,
    revealWriteAnswer,
    playVoicePrompt: playPrompt,
    toggleRecording: toggleListening,
  };
}
