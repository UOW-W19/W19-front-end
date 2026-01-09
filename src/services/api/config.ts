// API configuration and language data
import type { Language } from '@/types/api';

export const API_BASE_URL = 'https://superconservatively-gildable-paulina.ngrok-free.dev/api';

// Supported languages
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
];

export const getLanguageByCode = (code: string): Language | undefined => 
  LANGUAGES.find(l => l.code === code);

export const getLanguageByName = (name: string): Language | undefined => 
  LANGUAGES.find(l => l.name.toLowerCase() === name.toLowerCase());

// Simulated network delay for mock APIs
export const simulateDelay = (ms: number = 500) => 
  new Promise(resolve => setTimeout(resolve, ms));
