const LANGUAGE_SPEECH_LOCALES: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  it: 'it-IT',
};

export function getSpeechLocale(languageCode?: string | null, fallbackLocale = 'en-US'): string {
  if (!languageCode) return fallbackLocale;

  const normalizedCode = languageCode.toLowerCase();
  if (normalizedCode.includes('-')) return normalizedCode;

  return LANGUAGE_SPEECH_LOCALES[normalizedCode] ?? fallbackLocale;
}

export function hasJapaneseScript(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/u.test(text);
}

export function canSpeakTextInLocale(text: string, locale: string): boolean {
  if (locale.toLowerCase().startsWith('ja')) {
    return hasJapaneseScript(text);
  }

  return true;
}

export function getUnsupportedSpeechTextMessage(locale: string): string {
  if (locale.toLowerCase().startsWith('ja')) {
    return 'Japanese audio needs Japanese characters. Save the Japanese text, such as ください, instead of romanized English letters.';
  }

  return 'Audio playback is unavailable for this text.';
}

export function selectSpeechVoice(
  voices: SpeechSynthesisVoice[],
  locale: string
): SpeechSynthesisVoice | null {
  const normalizedLocale = locale.toLowerCase();
  const languagePrefix = normalizedLocale.split('-')[0];

  return voices.find(voice => voice.lang.toLowerCase() === normalizedLocale)
    ?? voices.find(voice => voice.lang.toLowerCase().startsWith(`${languagePrefix}-`))
    ?? null;
}
