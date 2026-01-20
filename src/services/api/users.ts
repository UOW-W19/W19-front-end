// Users API Service - Fetch public user profiles
import type { ApiPost } from '@/types/api';
import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';

// Backend response types (snake_case)
interface BackendPublicProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  created_at: string;
  languages: Array<{
    code: string;
    name: string;
    flag_emoji: string;
    proficiency: string;
    is_learning: boolean;
  }>;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;
  is_followed_by: boolean;
  privacy_settings?: {
    show_activity: boolean;
    show_saved_words: boolean;
  };
}

interface BackendAuthor {
  id: string | number;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  language?: string;
  flag_emoji?: string;
}

interface BackendPost {
  id: string | number;
  content: string;
  original_language?: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
  location?: string;
  author: BackendAuthor;
  reactions?: {
    likes?: number;
    comments?: number;
  };
  user_reaction?: string | null;
  created_at?: string;
}

interface BackendUserPostsResponse {
  content: BackendPost[];
  last: boolean;
  number?: number;
}

// Frontend types
export interface PublicUserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  createdAt: string;
  languages: Array<{
    code: string;
    name: string;
    flagEmoji: string;
    proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'NATIVE';
    isLearning: boolean;
  }>;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
  privacySettings: {
    showActivity: boolean;
    showSavedWords: boolean;
  };
}

export interface UserPostsResponse {
  posts: ApiPost[];
  hasMore: boolean;
  nextCursor?: string;
}

// Helper for API requests
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getStoredToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
};

// Transform backend profile to frontend
const transformPublicProfile = (profile: BackendPublicProfile): PublicUserProfile => ({
  id: profile.id,
  username: profile.username,
  displayName: profile.display_name,
  avatarUrl: profile.avatar_url,
  bio: profile.bio,
  location: profile.location,
  createdAt: profile.created_at,
  languages: (profile.languages || []).map(lang => ({
    code: lang.code,
    name: lang.name,
    flagEmoji: lang.flag_emoji,
    proficiency: lang.proficiency as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'NATIVE',
    isLearning: lang.is_learning,
  })),
  followersCount: profile.followers_count,
  followingCount: profile.following_count,
  postsCount: profile.posts_count,
  isFollowing: profile.is_following,
  isFollowedBy: profile.is_followed_by ?? false,
  privacySettings: {
    showActivity: profile.privacy_settings?.show_activity ?? true,
    showSavedWords: profile.privacy_settings?.show_saved_words ?? false,
  },
});

// Transform backend post to frontend
const transformPost = (post: BackendPost): ApiPost => ({
  id: String(post.id),
  content: post.content,
  originalLanguage: post.original_language ?? 'en',
  imageUrl: post.image_url,
  latitude: post.latitude,
  longitude: post.longitude,
  distance: post.distance,
  location: post.location,
  author: {
    id: String(post.author.id),
    username: post.author.username ?? post.author.display_name ?? 'unknown',
    displayName: post.author.display_name ?? post.author.username ?? 'Unknown',
    avatarUrl: post.author.avatar_url,
    language: post.author.language,
    flagEmoji: post.author.flag_emoji,
  },
  reactions: {
    likes: post.reactions?.likes ?? 0,
    comments: post.reactions?.comments ?? 0,
  },
  userReaction: null,
  createdAt: post.created_at ?? new Date().toISOString(),
});

// ============ MOCK DATA (Remove when backend is ready) ============
const MOCK_PROFILES: Record<string, BackendPublicProfile> = {
  'user-1': {
    id: 'user-1',
    username: 'maria_garcia',
    display_name: 'María García',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    bio: '🇪🇸 Native Spanish speaker from Madrid. Learning English and Japanese. Love helping others learn!',
    location: 'Madrid, Spain',
    created_at: '2023-06-15T10:30:00Z',
    languages: [
      { code: 'es', name: 'Spanish', flag_emoji: '🇪🇸', proficiency: 'NATIVE', is_learning: false },
      { code: 'en', name: 'English', flag_emoji: '🇬🇧', proficiency: 'ADVANCED', is_learning: true },
      { code: 'ja', name: 'Japanese', flag_emoji: '🇯🇵', proficiency: 'BEGINNER', is_learning: true },
    ],
    followers_count: 234,
    following_count: 156,
    posts_count: 47,
    is_following: false,
    is_followed_by: false,
    privacy_settings: { show_activity: true, show_saved_words: true },
  },
  'user-2': {
    id: 'user-2',
    username: 'tanaka_yuki',
    display_name: '田中ゆき (Yuki)',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    bio: 'Japanese teacher 📚 | Helping you master Hiragana, Katakana & Kanji | 日本語を一緒に学びましょう！',
    location: 'Tokyo, Japan',
    created_at: '2023-03-20T08:00:00Z',
    languages: [
      { code: 'ja', name: 'Japanese', flag_emoji: '🇯🇵', proficiency: 'NATIVE', is_learning: false },
      { code: 'en', name: 'English', flag_emoji: '🇬🇧', proficiency: 'ADVANCED', is_learning: false },
      { code: 'ko', name: 'Korean', flag_emoji: '🇰🇷', proficiency: 'INTERMEDIATE', is_learning: true },
    ],
    followers_count: 1024,
    following_count: 89,
    posts_count: 156,
    is_following: true,
    is_followed_by: true,
    privacy_settings: { show_activity: true, show_saved_words: false },
  },
  'user-3': {
    id: 'user-3',
    username: 'pierre_dubois',
    display_name: 'Pierre Dubois',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Parisian 🗼 | French & English | Currently exploring German and Italian for my European travels!',
    location: 'Paris, France',
    created_at: '2024-01-10T14:00:00Z',
    languages: [
      { code: 'fr', name: 'French', flag_emoji: '🇫🇷', proficiency: 'NATIVE', is_learning: false },
      { code: 'en', name: 'English', flag_emoji: '🇬🇧', proficiency: 'ADVANCED', is_learning: false },
      { code: 'de', name: 'German', flag_emoji: '🇩🇪', proficiency: 'BEGINNER', is_learning: true },
    ],
    followers_count: 78,
    following_count: 112,
    posts_count: 23,
    is_following: false,
    is_followed_by: false,
    privacy_settings: { show_activity: false, show_saved_words: false },
  },
};

const MOCK_POSTS: Record<string, BackendPost[]> = {
  'user-1': [
    {
      id: 'post-1',
      content: '¡Hoy aprendí la diferencia entre "affect" y "effect"! 📝 Always confusing but finally got it.',
      original_language: 'es',
      image_url: undefined,
      location: 'Madrid, Spain',
      author: { id: 'user-1', username: 'maria_garcia', display_name: 'María García', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', flag_emoji: '🇪🇸' },
      reactions: { likes: 42, comments: 8 },
      created_at: '2024-01-14T16:30:00Z',
    },
    {
      id: 'post-2',
      content: 'My favorite Spanish idiom: "No hay mal que por bien no venga" - Every cloud has a silver lining ☁️✨',
      original_language: 'es',
      image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      location: 'Madrid, Spain',
      author: { id: 'user-1', username: 'maria_garcia', display_name: 'María García', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', flag_emoji: '🇪🇸' },
      reactions: { likes: 89, comments: 15 },
      created_at: '2024-01-12T10:00:00Z',
    },
  ],
  'user-2': [
    {
      id: 'post-3',
      content: '今日の単語: 木漏れ日 (komorebi) - sunlight filtering through trees 🌳☀️ One of my favorite untranslatable words!',
      original_language: 'ja',
      image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800',
      location: 'Tokyo, Japan',
      author: { id: 'user-2', username: 'tanaka_yuki', display_name: '田中ゆき (Yuki)', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', flag_emoji: '🇯🇵' },
      reactions: { likes: 156, comments: 23 },
      created_at: '2024-01-15T09:00:00Z',
    },
    {
      id: 'post-4',
      content: 'Quick tip: ありがとう vs ありがとうございます - Use ございます in formal situations! 🎌',
      original_language: 'ja',
      author: { id: 'user-2', username: 'tanaka_yuki', display_name: '田中ゆき (Yuki)', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', flag_emoji: '🇯🇵' },
      reactions: { likes: 234, comments: 31 },
      created_at: '2024-01-13T14:00:00Z',
    },
    {
      id: 'post-5',
      content: 'Started learning Korean this week! 안녕하세요 🇰🇷 Any tips from Korean speakers?',
      original_language: 'ja',
      author: { id: 'user-2', username: 'tanaka_yuki', display_name: '田中ゆき (Yuki)', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', flag_emoji: '🇯🇵' },
      reactions: { likes: 67, comments: 45 },
      created_at: '2024-01-10T11:00:00Z',
    },
  ],
  'user-3': [
    {
      id: 'post-6',
      content: 'Bonjour! Just discovered that "Schadenfreude" has no direct French equivalent. German is fascinating! 🇩🇪',
      original_language: 'fr',
      author: { id: 'user-3', username: 'pierre_dubois', display_name: 'Pierre Dubois', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', flag_emoji: '🇫🇷' },
      reactions: { likes: 28, comments: 12 },
      created_at: '2024-01-14T18:00:00Z',
    },
  ],
};

let mockFollowState: Record<string, boolean> = {
  'user-1': false,
  'user-2': true,
  'user-3': false,
};
// ============ END MOCK DATA ============

export const usersApi = {
  // Get public profile by user ID
  async getProfile(userId: string): Promise<PublicUserProfile> {
    // Try real API first
    try {
      const profile = await apiRequest<BackendPublicProfile>(`/users/${userId}`);
      return transformPublicProfile(profile);
    } catch (error) {
      // Check if it's a 404 - endpoint might not exist yet
      // MOCK FALLBACK: Remove this block when backend is fully ready
      const mockProfile = MOCK_PROFILES[userId];
      if (mockProfile) {
        console.log('[usersApi] Using mock profile for:', userId);
        return transformPublicProfile({
          ...mockProfile,
          is_following: mockFollowState[userId] ?? false,
        });
      }
      
      // Try to get basic profile from /users/me if it's the current user's ID
      // Otherwise, return a minimal profile based on available data
      console.warn('[usersApi] Profile endpoint not available, returning minimal profile');
      
      // Return a minimal "unknown user" profile when endpoint doesn't exist
      // The UI will show basic info, and full profile will work once backend implements the endpoint
      return {
        id: userId,
        username: 'user',
        displayName: 'User',
        avatarUrl: undefined,
        bio: undefined,
        location: undefined,
        createdAt: new Date().toISOString(),
        languages: [],
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        isFollowing: false,
        isFollowedBy: false,
        privacySettings: {
          showActivity: true,
          showSavedWords: false,
        },
      };
    }
  },

  // Get user's posts
  async getUserPosts(userId: string, cursor?: string): Promise<UserPostsResponse> {
    const page = cursor ? parseInt(cursor, 10) : 0;
    
    // Try real API first
    try {
      const response = await apiRequest<BackendUserPostsResponse>(
        `/users/${userId}/posts?page=${page}&size=10`
      );
      
      return {
        posts: response.content.map(transformPost),
        hasMore: !response.last,
        nextCursor: !response.last ? String((response.number ?? page) + 1) : undefined,
      };
    } catch (error) {
      // MOCK FALLBACK: Remove this block when backend is fully ready
      const mockPosts = MOCK_POSTS[userId];
      if (mockPosts) {
        console.log('[usersApi] Using mock posts for:', userId);
        return {
          posts: mockPosts.map(transformPost),
          hasMore: false,
          nextCursor: undefined,
        };
      }
      // If no mock data and API failed, rethrow
      throw error;
    }
  },

  // Follow a user - uses POST /follow with body { following_id }
  async followUser(userId: string): Promise<void> {
    // MOCK: Remove this block when backend is ready
    if (MOCK_PROFILES[userId]) {
      await new Promise(resolve => setTimeout(resolve, 200));
      mockFollowState[userId] = true;
      MOCK_PROFILES[userId].followers_count++;
      return;
    }
    // END MOCK

    await apiRequest<void>('/follow', {
      method: 'POST',
      body: JSON.stringify({ following_id: userId }),
    });
  },

  // Unfollow a user - uses DELETE /follow with body { following_id }
  async unfollowUser(userId: string): Promise<void> {
    // MOCK: Remove this block when backend is ready
    if (MOCK_PROFILES[userId]) {
      await new Promise(resolve => setTimeout(resolve, 200));
      mockFollowState[userId] = false;
      MOCK_PROFILES[userId].followers_count = Math.max(0, MOCK_PROFILES[userId].followers_count - 1);
      return;
    }
    // END MOCK

    await apiRequest<void>('/follow', {
      method: 'DELETE',
      body: JSON.stringify({ following_id: userId }),
    });
  },
};
