// Mock data and API configuration
import type { ApiPost, UserProfile, Language, ApiComment } from '@/types/api';

export const API_BASE_URL = 'http://localhost:8080/api';

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

// Mock users database
export const mockUsers: Map<string, UserProfile & { password: string }> = new Map([
  ['user-1', {
    id: 'user-1',
    email: 'demo@locale.app',
    password: 'demo123',
    displayName: 'Demo User',
    nativeLanguage: 'en',
    learningLanguages: ['es', 'ja'],
    location: 'San Francisco, CA',
    bio: 'Language enthusiast exploring new cultures!',
    createdAt: '2024-01-15T10:00:00Z',
    followersCount: 128,
    followingCount: 89,
    postsCount: 24,
  }],
]);

// Mock posts database
export const mockPosts: ApiPost[] = [
  {
    id: 'post-1',
    authorId: 'author-1',
    author: {
      id: 'author-1',
      displayName: 'Maria Garcia',
      avatarUrl: undefined,
      nativeLanguage: 'es',
    },
    content: '¡Hola amigos! Hoy visité un café nuevo en el centro. El café con leche estaba delicioso.',
    translation: 'Hello friends! Today I visited a new café downtown. The café con leche was delicious.',
    language: 'es',
    location: 'Madrid, Spain',
    likesCount: 24,
    commentsCount: 8,
    isLiked: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-2',
    authorId: 'author-2',
    author: {
      id: 'author-2',
      displayName: 'Yuki Tanaka',
      avatarUrl: undefined,
      nativeLanguage: 'ja',
    },
    content: '今日は公園で桜を見ました。とても綺麗でした！',
    translation: 'Today I saw cherry blossoms in the park. They were very beautiful!',
    language: 'ja',
    location: 'Tokyo, Japan',
    likesCount: 56,
    commentsCount: 12,
    isLiked: true,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-3',
    authorId: 'author-3',
    author: {
      id: 'author-3',
      displayName: 'Pierre Dubois',
      avatarUrl: undefined,
      nativeLanguage: 'fr',
    },
    content: 'Le marché aux fleurs ce matin était magnifique. J\'ai acheté des tulipes pour ma mère.',
    translation: 'The flower market this morning was beautiful. I bought tulips for my mother.',
    language: 'fr',
    location: 'Paris, France',
    likesCount: 18,
    commentsCount: 3,
    isLiked: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-4',
    authorId: 'author-4',
    author: {
      id: 'author-4',
      displayName: 'Kim Soo-yeon',
      avatarUrl: undefined,
      nativeLanguage: 'ko',
    },
    content: '오늘 한강에서 자전거를 탔어요. 날씨가 너무 좋았어요!',
    translation: 'I rode a bike at Han River today. The weather was so nice!',
    language: 'ko',
    location: 'Seoul, Korea',
    likesCount: 42,
    commentsCount: 6,
    isLiked: false,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-5',
    authorId: 'author-5',
    author: {
      id: 'author-5',
      displayName: 'Luca Bianchi',
      avatarUrl: undefined,
      nativeLanguage: 'it',
    },
    content: 'Ho fatto la pizza margherita per la prima volta. Era deliziosa!',
    translation: 'I made margherita pizza for the first time. It was delicious!',
    language: 'it',
    location: 'Rome, Italy',
    likesCount: 38,
    commentsCount: 15,
    isLiked: true,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock comments
export const mockComments: Map<string, ApiComment[]> = new Map([
  ['post-1', [
    {
      id: 'comment-1',
      postId: 'post-1',
      authorId: 'author-2',
      author: { id: 'author-2', displayName: 'Yuki Tanaka', nativeLanguage: 'ja' },
      content: '¡Qué rico! Me encanta el café con leche también.',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'comment-2',
      postId: 'post-1',
      authorId: 'author-3',
      author: { id: 'author-3', displayName: 'Pierre Dubois', nativeLanguage: 'fr' },
      content: '¿Cómo se llama el café?',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  ]],
  ['post-2', [
    {
      id: 'comment-3',
      postId: 'post-2',
      authorId: 'author-1',
      author: { id: 'author-1', displayName: 'Maria Garcia', nativeLanguage: 'es' },
      content: '桜はとても美しいですね！',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ]],
]);

// Simulated network delay
export const simulateDelay = (ms: number = 500) => 
  new Promise(resolve => setTimeout(resolve, ms));
