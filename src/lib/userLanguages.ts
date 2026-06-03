import type { UserLanguage } from "@/types/api";

export const getNativeLanguage = (languages: readonly UserLanguage[] | null | undefined) =>
  languages?.find((language) => language.proficiency === "NATIVE" && !language.isLearning);

export const getLearningLanguages = (languages: readonly UserLanguage[] | null | undefined) =>
  languages?.filter((language) => language.isLearning) ?? [];

export const getPrimaryLearningLanguage = (languages: readonly UserLanguage[] | null | undefined) =>
  getLearningLanguages(languages)[0];

export const getUserLanguagePreferences = (languages: readonly UserLanguage[] | null | undefined) => {
  const learningLanguages = getLearningLanguages(languages);

  return {
    nativeLanguage: getNativeLanguage(languages),
    learningLanguages,
    primaryLearningLanguage: learningLanguages[0],
  };
};
