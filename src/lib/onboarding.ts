import type { UserProfile } from "@/types/api";

export const hasCompletedOnboarding = (user: UserProfile | null | undefined) => {
  const languages = user?.languages ?? [];
  const hasNativeLanguage = languages.some(
    (language) => !language.isLearning && language.proficiency === "NATIVE",
  );
  const hasLearningLanguage = languages.some((language) => language.isLearning);

  return hasNativeLanguage && hasLearningLanguage;
};
