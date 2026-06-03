import { describe, expect, it } from "vitest";
import {
  createLessonWords,
  isLessonAnswerCorrect,
  isTokenOrderCorrect,
  normalizeLessonAnswer,
  scoreLessonAnswer,
  shuffleLessonTokens,
  tokenizeLessonPhrase,
  tokensToPhrase,
} from "@/lib/lesson";
import type { LessonWordBank, SavedWord } from "@/types";

function savedWord(
  id: string,
  word: string,
  translation: string,
  masteryLevel: number,
  createdAt: string
): SavedWord {
  return {
    id,
    word,
    translation,
    masteryLevel,
    createdAt,
    languageCode: "es",
    languageName: "Spanish",
    languageFlag: "ES",
    source: "MANUAL",
  };
}

describe("lesson utilities", () => {
  it("tokenizes phrases and rebuilds them in order", () => {
    const tokens = tokenizeLessonPhrase("  buenos   dias  ");

    expect(tokens).toEqual([
      { id: "0-buenos", text: "buenos", sourceIndex: 0 },
      { id: "1-dias", text: "dias", sourceIndex: 1 },
    ]);
    expect(tokensToPhrase(tokens)).toBe("buenos dias");
    expect(isTokenOrderCorrect(tokens, tokens)).toBe(true);
    expect(isTokenOrderCorrect([tokens[1], tokens[0]], tokens)).toBe(false);
  });

  it("normalizes punctuation, spacing, casing, and accents for answer checks", () => {
    expect(normalizeLessonAnswer("  \u00bfD\u00f3nde est\u00e1?  ")).toBe("donde esta");
    expect(isLessonAnswerCorrect("DONDE   ESTA!", "donde esta")).toBe(true);
  });

  it("scores partial written answers by expected word coverage", () => {
    expect(scoreLessonAnswer("buenos dias", "buenos dias")).toBe(1);
    expect(scoreLessonAnswer("buenos", "buenos dias")).toBe(0.5);
    expect(scoreLessonAnswer("hola", "buenos dias")).toBe(0);
  });

  it("keeps shuffled tokens as the same answer set", () => {
    const tokens = tokenizeLessonPhrase("uno dos tres cuatro");
    const shuffled = shuffleLessonTokens(tokens);

    expect(shuffled).toHaveLength(tokens.length);
    expect(new Set(shuffled.map((token) => token.id))).toEqual(new Set(tokens.map((token) => token.id)));
  });

  it("creates a focused lesson from the lowest mastery words first", () => {
    const bank: LessonWordBank = {
      id: "travel",
      label: "Travel",
      words: [
        savedWord("high", "gracias", "thanks", 90, "2026-01-01T00:00:00.000Z"),
        savedWord("tie-old", "hola", "hello", 10, "2026-01-01T00:00:00.000Z"),
        savedWord("middle", "tren", "train", 40, "2026-01-02T00:00:00.000Z"),
        savedWord("lowest", "boleto", "ticket", 0, "2026-01-03T00:00:00.000Z"),
        savedWord("tie-new", "hotel", "hotel", 10, "2026-01-04T00:00:00.000Z"),
        savedWord("extra", "mapa", "map", 70, "2026-01-05T00:00:00.000Z"),
      ],
    };

    const lessonWords = createLessonWords(bank, 4);

    expect(lessonWords.map((word) => word.id)).toEqual(["lowest", "tie-new", "tie-old", "middle"]);
    expect(lessonWords[0]).toMatchObject({
      bankId: "travel",
      bankLabel: "Travel",
      promptText: "ticket",
      acceptedAnswer: "boleto",
    });
    expect(lessonWords[0].tokens.map((token) => token.text)).toEqual(["boleto"]);
  });
});
