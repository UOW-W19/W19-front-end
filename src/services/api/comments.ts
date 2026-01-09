
import type { 
  ApiComment, 
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
interface BackendComment {
  id: number;
  postId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    displayName: string;
    avatarUrl?: string;
  };
}

interface BackendCommentsResponse {
  content: BackendComment[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// Transform backend comment to frontend ApiComment
const transformComment = (comment: BackendComment): ApiComment => ({
  id: String(comment.id),
  postId: String(comment.postId),
  authorId: String(comment.author.id),
  author: {
    id: String(comment.author.id),
    displayName: comment.author.displayName,
    avatarUrl: comment.author.avatarUrl,
    nativeLanguage: 'en', // Backend doesn't return this
  },
  content: comment.content,
  createdAt: comment.createdAt,
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
    
    return {
      comments,
      nextCursor: response.last ? undefined : String(response.page + 1),
      hasMore: !response.last,
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
