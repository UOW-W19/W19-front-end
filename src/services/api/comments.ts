// Comments API Service - Mock implementation
import type { 
  ApiComment, 
  CreateCommentRequest, 
  CommentsResponse,
  PaginationParams 
} from '@/types/api';
import { mockComments, mockPosts, simulateDelay } from './config';
import { getStoredUser } from './auth';

export const commentsApi = {
  async getComments(postId: string, params?: PaginationParams): Promise<CommentsResponse> {
    await simulateDelay(400);
    
    const comments = mockComments.get(postId) || [];
    
    // Sort by date (newest first)
    const sorted = [...comments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const limit = params?.limit || 20;
    const cursorIndex = params?.cursor 
      ? sorted.findIndex(c => c.id === params.cursor) + 1 
      : 0;
    
    const paginated = sorted.slice(cursorIndex, cursorIndex + limit);
    const hasMore = cursorIndex + limit < sorted.length;
    
    return {
      comments: paginated,
      nextCursor: hasMore ? paginated[paginated.length - 1]?.id : undefined,
      hasMore,
    };
  },

  async createComment(postId: string, data: CreateCommentRequest): Promise<ApiComment> {
    await simulateDelay(500);
    
    const user = getStoredUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const post = mockPosts.find(p => p.id === postId);
    if (!post) {
      throw new Error('Post not found');
    }
    
    const newComment: ApiComment = {
      id: `comment-${Date.now()}`,
      postId,
      authorId: user.id,
      author: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        nativeLanguage: user.nativeLanguage,
      },
      content: data.content,
      createdAt: new Date().toISOString(),
    };
    
    // Add to mock database
    const existing = mockComments.get(postId) || [];
    existing.push(newComment);
    mockComments.set(postId, existing);
    
    // Update post comment count
    post.commentsCount += 1;
    
    return newComment;
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await simulateDelay(300);
    
    const user = getStoredUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const comments = mockComments.get(postId);
    if (!comments) {
      throw new Error('Comment not found');
    }
    
    const commentIndex = comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) {
      throw new Error('Comment not found');
    }
    
    if (comments[commentIndex].authorId !== user.id) {
      throw new Error('Not authorized to delete this comment');
    }
    
    comments.splice(commentIndex, 1);
    
    // Update post comment count
    const post = mockPosts.find(p => p.id === postId);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
    }
  },
};
