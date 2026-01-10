// Posts API Service - Real backend integration
import type { 
  ApiPost, 
  AuthorDto,
  PostReactionSummary,
  CreatePostRequest, 
  FeedResponse,
  ReactionResponse,
  PaginationParams 
} from '@/types/api';
import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';

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

// Backend response types (matching snake_case API documentation)
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
  
  // Location
  latitude?: number;
  longitude?: number;
  distance?: string;
  location?: string;
  
  // Metadata
  author: BackendAuthor;
  reactions?: {
    likes?: number;
    comments?: number;
  };
  user_reaction?: string | null;
  created_at?: string;
}

interface BackendFeedResponse {
  content: BackendPost[];
  pageable?: object;
  last: boolean;
  totalPages?: number;
  totalElements?: number;
  number?: number;
  size?: number;
}

interface BackendReactionResponse {
  post_id: string;
  profile_id: string;
  reaction: string;
}

// Transform backend author to frontend AuthorDto
const transformAuthor = (author: BackendAuthor): AuthorDto => ({
  id: String(author.id),
  username: author.username ?? author.display_name ?? 'unknown',
  displayName: author.display_name ?? author.username ?? 'Unknown',
  avatarUrl: author.avatar_url,
  language: author.language,
  flagEmoji: author.flag_emoji,
});

// Transform backend post to frontend ApiPost
const transformPost = (post: BackendPost): ApiPost => {
  const reactions: PostReactionSummary = {
    likes: post.reactions?.likes ?? 0,
    comments: post.reactions?.comments ?? 0,
  };

  // Validate and cast user_reaction to ReactionType or null
  const validReactions = ['LIKE', 'LOVE', 'HELPFUL', 'FUNNY'];
  const userReaction = post.user_reaction && validReactions.includes(post.user_reaction)
    ? (post.user_reaction as 'LIKE' | 'LOVE' | 'HELPFUL' | 'FUNNY')
    : null;

  return {
    id: String(post.id),
    content: post.content,
    originalLanguage: post.original_language ?? 'en',
    imageUrl: post.image_url,
    latitude: post.latitude,
    longitude: post.longitude,
    distance: post.distance,
    location: post.location,
    author: transformAuthor(post.author),
    reactions,
    userReaction,
    createdAt: post.created_at ?? new Date().toISOString(),
  };
};

// Posts API functions
export const postsApi = {
  async getFeed(params?: PaginationParams & { language?: string; latitude?: number; longitude?: number }): Promise<FeedResponse> {
    const queryParams = new URLSearchParams();

    // Pagination (backend uses page/size)
    const page = params?.cursor ? parseInt(params.cursor, 10) : 0;
    queryParams.set('page', String(page));
    queryParams.set('size', String(params?.limit || 20));

    // Language filter
    queryParams.set('language', params?.language ?? 'all');

    // Location for distance calculation (optional)
    if (params?.latitude !== undefined) {
      queryParams.set('latitude', String(params.latitude));
    }
    if (params?.longitude !== undefined) {
      queryParams.set('longitude', String(params.longitude));
    }

    const url = `/posts?${queryParams.toString()}`;
    console.log('[postsApi] Fetching feed:', url);

    const response = await apiRequest<BackendFeedResponse>(url);
    console.log('[postsApi] Raw backend response:', response);

    const posts = response.content.map(transformPost);
    console.log('[postsApi] Transformed posts:', posts);

    const pageNumber = response.number ?? page;
    const hasMore = !response.last;

    return {
      posts,
      nextCursor: hasMore ? String(pageNumber + 1) : undefined,
      hasMore,
    };
  },

  async getPost(postId: string): Promise<ApiPost> {
    const post = await apiRequest<BackendPost>(`/posts/${postId}`);
    return transformPost(post);
  },

  async createPost(data: CreatePostRequest): Promise<ApiPost> {
    // Send snake_case to backend
    const body = {
      content: data.content,
      original_language: data.originalLanguage,
      image_url: data.imageUrl,
      latitude: data.latitude,
      longitude: data.longitude,
    };
    
    const post = await apiRequest<BackendPost>('/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    return transformPost(post);
  },

  async updatePost(postId: string, data: Partial<CreatePostRequest>): Promise<ApiPost> {
    // Send snake_case to backend
    const body: Record<string, unknown> = {};
    if (data.content !== undefined) body.content = data.content;
    if (data.originalLanguage !== undefined) body.original_language = data.originalLanguage;
    if (data.imageUrl !== undefined) body.image_url = data.imageUrl;
    
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
    const response = await apiRequest<BackendReactionResponse>(`/posts/${postId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reaction: 'LIKE' }),
    });
    
    return {
      postId: response.post_id,
      profileId: response.profile_id,
      reaction: response.reaction,
    };
  },

  async unlikePost(postId: string): Promise<ReactionResponse> {
    const response = await apiRequest<BackendReactionResponse>(`/posts/${postId}/reactions`, {
      method: 'DELETE',
    });
    
    return {
      postId: response.post_id,
      profileId: response.profile_id,
      reaction: response.reaction,
    };
  },
};
