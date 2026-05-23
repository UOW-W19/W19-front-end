// API configuration and language data
import type { Language } from '@/types/api';

// Use environment variable if set, otherwise default to localhost backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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
