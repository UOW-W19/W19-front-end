
import type { 
  ApiPost, 
  CreatePostRequest, 
  FeedResponse,
  ReactionResponse,
  PaginationParams 
} from '@/types/api';
import { API_BASE_URL, getLanguageByCode } from './config';
import { getStoredToken } from './auth';

// Helper for API requests
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getStoredToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
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

// Backend response types
interface BackendPost {
  id: string;
  content: string;
  originalLanguage: string;
  translation?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  distance?: string; // already formatted by backend
  location?: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    language?: string;
    flagEmoji?: string;
  };
  reactions: {
    likes: number;
    comments: number;
  };
  userReaction?: string | null; // e.g. "LIKE"
}

interface BackendFeedResponse {
  content: BackendPost[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// Transform backend post to frontend ApiPost
const transformPost = (post: BackendPost): ApiPost => {
  const language = getLanguageByCode(post.originalLanguage);

  return {
    id: String(post.id),
    authorId: String(post.author.id),
    author: {
      id: String(post.author.id),
      displayName: post.author.displayName,
      avatarUrl: post.author.avatarUrl,
      nativeLanguage: post.author.language || post.originalLanguage,
    },
    content: post.content,
    translation: post.translation,
    language: post.originalLanguage,
    imageUrl: post.imageUrl,
    location: post.location,
    likesCount: post.reactions?.likes ?? 0,
    commentsCount: post.reactions?.comments ?? 0,
    isLiked: (post.userReaction || '').toUpperCase() === 'LIKE',
    createdAt: post.createdAt,
    updatedAt: post.createdAt,
  };
};

// Posts API functions
export const postsApi = {
  async getFeed(params?: PaginationParams & { language?: string }): Promise<FeedResponse> {
    const queryParams = new URLSearchParams();
    
    // Pagination (backend uses page/size, not cursor)
    const page = params?.cursor ? parseInt(params.cursor, 10) : 0;
    queryParams.set('page', String(page));
    queryParams.set('size', String(params?.limit || 20));
    
    // Language filter
    if (params?.language && params.language !== 'all') {
      queryParams.set('language', params.language);
    }
    
    const response = await apiRequest<BackendFeedResponse>(
      `/posts?${queryParams.toString()}`
    );
    
    const posts = response.content.map(transformPost);
    
    return {
      posts,
      nextCursor: response.last ? undefined : String(response.page + 1),
      hasMore: !response.last,
    };
  },

  async getPost(postId: string): Promise<ApiPost> {
    const post = await apiRequest<BackendPost>(`/posts/${postId}`);
    return transformPost(post);
  },

  async createPost(data: CreatePostRequest): Promise<ApiPost> {
    const body = {
      content: data.content,
      originalLanguage: data.language,
      translation: data.translation,
      imageUrl: data.imageUrl,
      // Location can be added if we have lat/lng
    };
    
    const post = await apiRequest<BackendPost>('/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    return transformPost(post);
  },

  async updatePost(postId: string, data: Partial<CreatePostRequest>): Promise<ApiPost> {
    const body: Record<string, unknown> = {};
    if (data.content !== undefined) body.content = data.content;
    if (data.language !== undefined) body.originalLanguage = data.language;
    if (data.translation !== undefined) body.translation = data.translation;
    if (data.imageUrl !== undefined) body.imageUrl = data.imageUrl;
    
    const post = await apiRequest<BackendPost>(`/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    
    return transformPost(post);
  },

  async deletePost(postId: string): Promise<void> {
    await apiRequest<void>(`/posts/${postId}`, {
      method: 'DELETE',
    });
  },

  async likePost(postId: string): Promise<ReactionResponse> {
    await apiRequest<void>(`/posts/${postId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reaction: 'LIKE' }),
    });
    
    // Backend may not return count, so we return optimistic response
    return {
      postId,
      type: 'like',
      count: 0, // Will be updated on next fetch
      isReacted: true,
    };
  },

  async unlikePost(postId: string): Promise<ReactionResponse> {
    await apiRequest<void>(`/posts/${postId}/reactions`, {
      method: 'DELETE',
    });
    
    return {
      postId,
      type: 'like',
      count: 0,
      isReacted: false,
    };
  },
};
