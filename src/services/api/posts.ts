// Posts API Service - Mock implementation
import type{ 
  ApiPost, 
  CreatePostRequest, 
  FeedResponse,
  ReactionResponse,
  PaginationParams 
} from '@/types/api';
import { mockPosts, simulateDelay, getLanguageByCode } from './config';
import { getStoredUser } from './auth';

// Posts API functions
export const postsApi = {
  async getFeed(params?: PaginationParams & { language?: string }): Promise<FeedResponse> {
    await simulateDelay(600);
    
    let posts = [...mockPosts];
    
    // Filter by language if specified
    if (params?.language) {
      posts = posts.filter(p => p.language === params.language);
    }
    
    // Sort by date (newest first)
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Pagination
    const limit = params?.limit || 10;
    const cursorIndex = params?.cursor 
      ? posts.findIndex(p => p.id === params.cursor) + 1 
      : 0;
    
    const paginatedPosts = posts.slice(cursorIndex, cursorIndex + limit);
    const hasMore = cursorIndex + limit < posts.length;
    const nextCursor = hasMore ? paginatedPosts[paginatedPosts.length - 1]?.id : undefined;
    
    return {
      posts: paginatedPosts,
      nextCursor,
      hasMore,
    };
  },

  async getPost(postId: string): Promise<ApiPost> {
    await simulateDelay(400);
    
    const post = mockPosts.find(p => p.id === postId);
    if (!post) {
      throw new Error('Post not found');
    }
    
    return post;
  },

  async createPost(data: CreatePostRequest): Promise<ApiPost> {
    await simulateDelay(700);
    
    const user = getStoredUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const language = getLanguageByCode(data.language);
    
    const newPost: ApiPost = {
      id: `post-${Date.now()}`,
      authorId: user.id,
      author: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        nativeLanguage: user.nativeLanguage,
      },
      content: data.content,
      translation: data.translation,
      language: data.language,
      imageUrl: data.imageUrl,
      location: data.location || user.location,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Add to mock database
    mockPosts.unshift(newPost);
    
    return newPost;
  },

  async updatePost(postId: string, data: Partial<CreatePostRequest>): Promise<ApiPost> {
    await simulateDelay(500);
    
    const postIndex = mockPosts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
      throw new Error('Post not found');
    }
    
    const user = getStoredUser();
    if (!user || mockPosts[postIndex].authorId !== user.id) {
      throw new Error('Not authorized to edit this post');
    }
    
    mockPosts[postIndex] = {
      ...mockPosts[postIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    return mockPosts[postIndex];
  },

  async deletePost(postId: string): Promise<void> {
    await simulateDelay(400);
    
    const postIndex = mockPosts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
      throw new Error('Post not found');
    }
    
    const user = getStoredUser();
    if (!user || mockPosts[postIndex].authorId !== user.id) {
      throw new Error('Not authorized to delete this post');
    }
    
    mockPosts.splice(postIndex, 1);
  },

  async likePost(postId: string): Promise<ReactionResponse> {
    await simulateDelay(300);
    
    const post = mockPosts.find(p => p.id === postId);
    if (!post) {
      throw new Error('Post not found');
    }
    
    post.isLiked = true;
    post.likesCount += 1;
    
    return {
      postId,
      type: 'like',
      count: post.likesCount,
      isReacted: true,
    };
  },

  async unlikePost(postId: string): Promise<ReactionResponse> {
    await simulateDelay(300);
    
    const post = mockPosts.find(p => p.id === postId);
    if (!post) {
      throw new Error('Post not found');
    }
    
    post.isLiked = false;
    post.likesCount = Math.max(0, post.likesCount - 1);
    
    return {
      postId,
      type: 'like',
      count: post.likesCount,
      isReacted: false,
    };
  },
};
