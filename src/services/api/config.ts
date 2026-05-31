// API configuration and language data
import type { Language } from '@/types/api';

const getNonEmptyEnvValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

const getSameOriginWebSocketUrl = (): string => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${wsProtocol}://${window.location.host}/ws-native`;
};

const resolveWebSocketUrl = (): string => {
  const configuredWsUrl = getNonEmptyEnvValue(import.meta.env.VITE_WS_URL);
  if (configuredWsUrl) return trimTrailingSlashes(configuredWsUrl);

  const configuredApiUrl = getNonEmptyEnvValue(import.meta.env.VITE_API_BASE_URL);
  if (configuredApiUrl && !configuredApiUrl.startsWith('/')) {
    try {
      const apiUrl = new URL(configuredApiUrl);
      apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      apiUrl.pathname = '/ws-native';
      apiUrl.search = '';
      apiUrl.hash = '';
      return trimTrailingSlashes(apiUrl.toString());
    } catch {
      // Fall back to the same-origin proxy below.
    }
  }

  return getSameOriginWebSocketUrl();
};

// Vite injects VITE_* values at build time. Defaults support the Docker/Nginx same-origin proxy.
export const API_BASE_URL = trimTrailingSlashes(
  getNonEmptyEnvValue(import.meta.env.VITE_API_BASE_URL) || '/api',
);
export const WS_URL = resolveWebSocketUrl();

// Supported languages
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
];

export const getLanguageByCode = (code: string): Language | undefined =>
  LANGUAGES.find(l => l.code === code);

export const getLanguageByName = (name: string): Language | undefined =>
  LANGUAGES.find(l => l.name.toLowerCase() === name.toLowerCase());
