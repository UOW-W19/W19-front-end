import { describe, expect, it } from "vitest";
import {
  getLearningLanguages,
  getNativeLanguage,
  getPrimaryLearningLanguage,
  getUserLanguagePreferences,
} from "@/lib/userLanguages";
import type { UserLanguage } from "@/types/api";

const language = (
  code: string,
  proficiency: UserLanguage["proficiency"],
  isLearning: boolean
): UserLanguage => ({
  code,
  name: code.toUpperCase(),
  flagEmoji: code.toUpperCase(),
  proficiency,
  isLearning,
});

describe("user language helpers", () => {
  const languages = [
    language("en", "NATIVE", false),
    language("es", "BEGINNER", true),
    language("fr", "INTERMEDIATE", true),
  ];

  it("finds the native language from non-learning native entries", () => {
    expect(getNativeLanguage(languages)?.code).toBe("en");
    expect(getNativeLanguage([language("en", "NATIVE", true)])).toBeUndefined();
  });

  it("keeps learning languages in profile order", () => {
    expect(getLearningLanguages(languages).map((item) => item.code)).toEqual(["es", "fr"]);
    expect(getPrimaryLearningLanguage(languages)?.code).toBe("es");
  });

  it("derives all user language preferences together", () => {
    expect(getUserLanguagePreferences(languages)).toMatchObject({
      nativeLanguage: { code: "en" },
      learningLanguages: [{ code: "es" }, { code: "fr" }],
      primaryLearningLanguage: { code: "es" },
    });
  });
});
