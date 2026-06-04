import { describe, expect, it } from 'vitest';
import {
  canSpeakTextInLocale,
  getSpeechLocale,
  hasJapaneseScript,
  selectSpeechVoice,
} from './speech';

function voice(lang: string): SpeechSynthesisVoice {
  return { lang, name: lang } as SpeechSynthesisVoice;
}

describe('speech helpers', () => {
  it('maps app language codes to browser speech locales', () => {
    expect(getSpeechLocale('ja')).toBe('ja-JP');
    expect(getSpeechLocale('zh')).toBe('zh-CN');
    expect(getSpeechLocale('fr-CA')).toBe('fr-ca');
  });

  it('detects Japanese script before playback', () => {
    expect(hasJapaneseScript('ください')).toBe(true);
    expect(hasJapaneseScript('りんご')).toBe(true);
    expect(hasJapaneseScript('please')).toBe(false);
  });

  it('blocks romanized Japanese text but allows native script text', () => {
    expect(canSpeakTextInLocale('please', 'ja-JP')).toBe(false);
    expect(canSpeakTextInLocale('ください', 'ja-JP')).toBe(true);
    expect(canSpeakTextInLocale('please', 'en-US')).toBe(true);
  });

  it('selects exact voices before language-prefix fallbacks', () => {
    const voices = [voice('ja'), voice('ja-JP'), voice('en-US')];

    expect(selectSpeechVoice(voices, 'ja-JP')?.lang).toBe('ja-JP');
    expect(selectSpeechVoice(voices, 'ja-AU')?.lang).toBe('ja-JP');
    expect(selectSpeechVoice(voices, 'fr-FR')).toBeNull();
  });
});
