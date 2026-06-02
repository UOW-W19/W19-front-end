// Users API Service - Fetch public user profiles
import type { ApiPost } from '@/types/api';
import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';

// Backend response types (snake_case)
export interface BackendPublicProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
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
  image_urls?: string[];
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
  latitude?: number;
  longitude?: number;
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

type PublicProfileLanguage = PublicUserProfile['languages'][number];

const dedupeLanguagesByCode = (languages: PublicProfileLanguage[]) => {
  const byCode = new Map<string, PublicProfileLanguage>();
  for (const language of languages) {
    const code = language.code.trim().toLowerCase();
    if (!byCode.has(code)) {
      byCode.set(code, { ...language, code });
    }
  }
  return Array.from(byCode.values());
};

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

  // Handle empty body responses (e.g. follow/unfollow returns 200 with no body)
  const contentType = response.headers.get('content-type');
  const contentLength = response.headers.get('content-length');
  if (!contentType?.includes('application/json') || contentLength === '0') {
    return {} as T;
  }

  return response.json();
};

// Transform backend profile to frontend
export const transformPublicProfile = (profile: BackendPublicProfile): PublicUserProfile => ({
  id: profile.id,
  username: profile.username,
  displayName: profile.display_name,
  avatarUrl: profile.avatar_url,
  bio: profile.bio,
  location: profile.location,
  latitude: profile.latitude ?? undefined,
  longitude: profile.longitude ?? undefined,
  createdAt: profile.created_at,
  languages: dedupeLanguagesByCode((profile.languages || []).map(lang => ({
    code: lang.code,
    name: lang.name,
    flagEmoji: lang.flag_emoji,
    proficiency: lang.proficiency as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'NATIVE',
    isLearning: lang.is_learning,
  }))),
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
  imageUrl: post.image_url ?? post.image_urls?.[0],
  imageUrls: post.image_urls?.length
    ? post.image_urls
    : post.image_url
      ? [post.image_url]
      : [],
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

export const usersApi = {
  // Get public profile by user ID
  async getProfile(userId: string): Promise<PublicUserProfile> {
    const profile = await apiRequest<BackendPublicProfile>(`/users/${userId}`);
    return transformPublicProfile(profile);
  },

  // Get user's posts
  async getUserPosts(userId: string, cursor?: string): Promise<UserPostsResponse> {
    const page = cursor ? parseInt(cursor, 10) : 0;
    const response = await apiRequest<BackendUserPostsResponse>(
      `/users/${userId}/posts?page=${page}&size=10`
    );
    return {
      posts: response.content.map(transformPost),
      hasMore: !response.last,
      nextCursor: !response.last ? String((response.number ?? page) + 1) : undefined,
    };
  },

  // Follow a user - RESTful pattern: POST /users/{id}/follow
  async followUser(userId: string): Promise<void> {
    await apiRequest<void>(`/users/${userId}/follow`, {
      method: 'POST',
    });
  },

  // Unfollow a user - RESTful pattern: DELETE /users/{id}/follow
  async unfollowUser(userId: string): Promise<void> {
    await apiRequest<void>(`/users/${userId}/follow`, {
      method: 'DELETE',
    });
  },

  // ============ SETTINGS MANAGEMENT ============

  /**
   * Get current user's settings
   * @returns User settings including theme, notifications, and privacy
   */
  async getSettings(): Promise<import('@/types/api').UserSettingsDTO> {
    const response = await apiRequest<{
      theme?: string;
      notification_prefs: {
        push_enabled: boolean;
        email_enabled: boolean;
        like_notifications: boolean;
        comment_notifications: boolean;
        meetup_notifications: boolean;
      };
      privacy_settings: {
        location_visibility: 'PUBLIC' | 'FRIENDS_ONLY' | 'NOBODY';
        allow_messages: 'everyone' | 'friends' | 'none';
      };
    }>('/users/me/settings');

    return {
      theme: response.theme,
      notificationPrefs: {
        pushEnabled: response.notification_prefs.push_enabled,
        emailEnabled: response.notification_prefs.email_enabled,
        likeNotifications: response.notification_prefs.like_notifications,
        commentNotifications: response.notification_prefs.comment_notifications,
        meetupNotifications: response.notification_prefs.meetup_notifications,
      },
      privacySettings: {
        locationVisibility: response.privacy_settings.location_visibility ?? 'PUBLIC',
        allowMessages: response.privacy_settings.allow_messages,
      },
    };
  },

  /**
   * Update current user's settings
   * @param settings - Settings to update (partial)
   * @returns Updated settings
   */
  async updateSettings(settings: Partial<import('@/types/api').UserSettingsDTO>): Promise<import('@/types/api').UserSettingsDTO> {
    const body: Record<string, unknown> = {};

    if (settings.theme !== undefined) {
      body.theme = settings.theme;
    }
    if (settings.notificationPrefs) {
      body.notification_prefs = {
        push_enabled: settings.notificationPrefs.pushEnabled,
        email_enabled: settings.notificationPrefs.emailEnabled,
        like_notifications: settings.notificationPrefs.likeNotifications,
        comment_notifications: settings.notificationPrefs.commentNotifications,
        meetup_notifications: settings.notificationPrefs.meetupNotifications,
      };
    }
    if (settings.privacySettings) {
      body.privacy_settings = {
        location_visibility: settings.privacySettings.locationVisibility,
        allow_messages: settings.privacySettings.allowMessages,
      };
    }

    const response = await apiRequest<{
      theme?: string;
      notification_prefs: {
        push_enabled: boolean;
        email_enabled: boolean;
        like_notifications: boolean;
        comment_notifications: boolean;
        meetup_notifications: boolean;
      };
      privacy_settings: {
        location_visibility: 'PUBLIC' | 'FRIENDS_ONLY' | 'NOBODY';
        allow_messages: 'everyone' | 'friends' | 'none';
      };
    }>('/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    return {
      theme: response.theme,
      notificationPrefs: {
        pushEnabled: response.notification_prefs.push_enabled,
        emailEnabled: response.notification_prefs.email_enabled,
        likeNotifications: response.notification_prefs.like_notifications,
        commentNotifications: response.notification_prefs.comment_notifications,
        meetupNotifications: response.notification_prefs.meetup_notifications,
      },
      privacySettings: {
        locationVisibility: response.privacy_settings.location_visibility ?? 'PUBLIC',
        allowMessages: response.privacy_settings.allow_messages,
      },
    };
  },

  // ============ LANGUAGE MANAGEMENT ============

  /**
   * Update user's native and learning languages
   * @param languages - Array of language preferences
   */
  async updateLanguages(languages: Array<{
    code: string;
    proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'NATIVE';
    isLearning: boolean;
  }>): Promise<void> {
    const body = languages.map(lang => ({
      code: lang.code,
      proficiency: lang.proficiency,
      is_learning: lang.isLearning,
    }));

    await apiRequest<void>('/users/me/languages', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  // ============ SOCIAL FEATURES ============

  /**
   * Get list of user's followers
   * @param userId - User ID
   * @returns Array of follower profiles
   */
  async getFollowers(userId: string): Promise<PublicUserProfile[]> {
    const response = await apiRequest<BackendPublicProfile[]>(`/users/${userId}/followers`);
    return response.map(transformPublicProfile);
  },

  /**
   * Get list of users that a user is following
   * @param userId - User ID
   * @returns Array of following profiles
   */
  async getFollowing(userId: string): Promise<PublicUserProfile[]> {
    const response = await apiRequest<BackendPublicProfile[]>(`/users/${userId}/following`);
    return response.map(transformPublicProfile);
  },

  // ============ USER SAFETY ============

  /**
   * Block a user
   * @param userId - User ID to block
   */
  async blockUser(userId: string): Promise<void> {
    await apiRequest<void>(`/users/${userId}/block`, {
      method: 'POST',
    });
  },

  /**
   * Unblock a user
   * @param userId - User ID to unblock
   */
  async unblockUser(userId: string): Promise<void> {
    await apiRequest<void>(`/users/${userId}/block`, {
      method: 'DELETE',
    });
  },

  // ============ PRIVACY SETTINGS ============
  /**
   * Get current user's privacy settings (location_visibility + allow_messages)
   */
  async getPrivacySettings(): Promise<{
    locationVisibility: 'PUBLIC' | 'FRIENDS_ONLY' | 'NOBODY';
    allowMessages: 'everyone' | 'friends' | 'none';
  }> {
    const raw = await apiRequest<{
      location_visibility: string;
      allow_messages: string;
    }>('/users/me/privacy');
    return {
      locationVisibility: (raw.location_visibility ?? 'PUBLIC') as 'PUBLIC' | 'FRIENDS_ONLY' | 'NOBODY',
      allowMessages: (raw.allow_messages ?? 'everyone') as 'everyone' | 'friends' | 'none',
    };
  },

  /**
   * Update current user's privacy settings
   */
  async updatePrivacySettings(settings: {
    locationVisibility?: 'PUBLIC' | 'FRIENDS_ONLY' | 'NOBODY';
    allowMessages?: 'everyone' | 'friends' | 'none';
  }): Promise<void> {
    const body: Record<string, unknown> = {};
    if (settings.locationVisibility !== undefined) {
      body.location_visibility = settings.locationVisibility;
    }
    if (settings.allowMessages !== undefined) {
      body.allow_messages = settings.allowMessages;
    }
    await apiRequest<void>('/users/me/privacy', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
};
