// Comments API Service - Real backend integration
import type { 
  ApiComment, 
  AuthorDto,
  CreateCommentRequest, 
  CommentsResponse,
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
}

interface BackendComment {
  id: string | number;
  content: string;
  created_at?: string;
  author: BackendAuthor;
}

interface BackendCommentsResponse {
  content: BackendComment[];
  pageable?: object;
  last: boolean;
  totalPages?: number;
  totalElements?: number;
  number?: number;
  size?: number;
}

// Transform backend author to frontend AuthorDto
const transformAuthor = (author: BackendAuthor): AuthorDto => ({
  id: String(author.id),
  username: author.username ?? author.display_name ?? 'unknown',
  displayName: author.display_name ?? author.username ?? 'Unknown',
  avatarUrl: author.avatar_url,
});

// Transform backend comment to frontend ApiComment
const transformComment = (comment: BackendComment): ApiComment => ({
  id: String(comment.id),
  content: comment.content,
  createdAt: comment.created_at ?? new Date().toISOString(),
  author: transformAuthor(comment.author),
});

export const commentsApi = {
  async getComments(postId: string, params?: PaginationParams): Promise<CommentsResponse> {
    const queryParams = new URLSearchParams();
    
    const page = params?.cursor ? parseInt(params.cursor, 10) : 0;
    queryParams.set('page', String(page));
    queryParams.set('size', String(params?.limit || 20));
    
    const response = await apiRequest<BackendCommentsResponse>(
      `/posts/${postId}/comments?${queryParams.toString()}`
    );
    
    const comments = response.content.map(transformComment);
    const pageNumber = response.number ?? page;
    const hasMore = !response.last;
    
    return {
      comments,
      nextCursor: hasMore ? String(pageNumber + 1) : undefined,
      hasMore,
    };
  },

  async createComment(postId: string, data: CreateCommentRequest): Promise<ApiComment> {
    const comment = await apiRequest<BackendComment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: data.content }),
    });
    
    return transformComment(comment);
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await apiRequest<void>(`/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },
};
