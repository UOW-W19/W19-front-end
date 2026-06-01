import type { LessonToken, LessonWord, LessonWordBank } from "@/types";

const MAX_SHUFFLE_ATTEMPTS = 8;
const DEFAULT_LESSON_SIZE = 5;

export function tokenizeLessonPhrase(phrase: string): LessonToken[] {
  return phrase
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((text, index) => ({
      id: `${index}-${text}`,
      text,
      sourceIndex: index,
    }));
}

export function tokensToPhrase(tokens: LessonToken[]): string {
  return tokens.map((token) => token.text).join(" ");
}

export function isTokenOrderCorrect(
  placedTokens: LessonToken[],
  expectedTokens: LessonToken[]
): boolean {
  return (
    placedTokens.length === expectedTokens.length &&
    placedTokens.every((token, index) => token.id === expectedTokens[index]?.id)
  );
}

export function shuffleLessonTokens(tokens: LessonToken[]): LessonToken[] {
  if (tokens.length <= 1) return [...tokens];

  let shuffled = [...tokens];
  let attempts = 0;

  while (attempts < MAX_SHUFFLE_ATTEMPTS) {
    shuffled = [...tokens];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    if (!isTokenOrderCorrect(shuffled, tokens)) return shuffled;
    attempts += 1;
  }

  return [...tokens.slice(1), tokens[0]];
}

export function normalizeLessonAnswer(answer: string): string {
  return answer
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isLessonAnswerCorrect(submittedAnswer: string, expectedAnswer: string): boolean {
  return normalizeLessonAnswer(submittedAnswer) === normalizeLessonAnswer(expectedAnswer);
}

export function scoreLessonAnswer(submittedAnswer: string, expectedAnswer: string): number {
  const submitted = normalizeLessonAnswer(submittedAnswer);
  const expected = normalizeLessonAnswer(expectedAnswer);

  if (!expected) return submitted ? 0 : 1;
  if (submitted === expected) return 1;

  const submittedParts = new Set(submitted.split(" ").filter(Boolean));
  const expectedParts = expected.split(" ").filter(Boolean);
  const matchingParts = expectedParts.filter((part) => submittedParts.has(part));

  return matchingParts.length / expectedParts.length;
}

export function createLessonWords(bank: LessonWordBank, lessonSize = DEFAULT_LESSON_SIZE): LessonWord[] {
  return [...bank.words]
    .sort((a, b) => {
      if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, lessonSize)
    .map((word) => ({
    ...word,
    bankId: bank.id,
    bankLabel: bank.label,
    promptText: word.translation,
    acceptedAnswer: word.word,
    tokens: tokenizeLessonPhrase(word.word),
    }));
}
