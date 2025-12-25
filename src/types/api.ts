// API Types matching Spring Boot backend contract

// ============ AUTH ============
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  nativeLanguage: string;
  learningLanguages: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface RefreshRequest {
  refreshToken: string;
}

// ============ USER PROFILE ============
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  nativeLanguage: string;
  learningLanguages: string[];
  location?: string;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  learningLanguages?: string[];
}

// ============ POSTS ============
export interface ApiPost {
  id: string;
  authorId: string;
  author: PostAuthor;
  content: string;
  translation?: string;
  language: string;
  imageUrl?: string;
  location?: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostAuthor {
  id: string;
  displayName: string;
  avatarUrl?: string;
  nativeLanguage: string;
}

export interface CreatePostRequest {
  content: string;
  translation?: string;
  language: string;
  imageUrl?: string;
  location?: string;
}

export interface FeedResponse {
  posts: ApiPost[];
  nextCursor?: string;
  hasMore: boolean;
}

// ============ REACTIONS ============
export interface ReactionResponse {
  postId: string;
  type: 'like';
  count: number;
  isReacted: boolean;
}

// ============ COMMENTS ============
export interface ApiComment {
  id: string;
  postId: string;
  authorId: string;
  author: PostAuthor;
  content: string;
  createdAt: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface CommentsResponse {
  comments: ApiComment[];
  nextCursor?: string;
  hasMore: boolean;
}

// ============ LANGUAGES ============
export interface Language {
  code: string;
  name: string;
  flag: string;
}

// ============ ERROR ============
export interface ApiError {
  error: string;
  message: string;
  status: number;
  timestamp: string;
}

// ============ PAGINATION ============
export interface PaginationParams {
  cursor?: string;
  limit?: number;
}
