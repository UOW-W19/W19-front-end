// API Types matching Backend contract (Frontend Integration Guide)

// ============ AUTH ============
export interface RegisterRequest {
  email: string;
  username?: string;
  password: string;
  displayName: string;
  nativeLanguage?: string;
  learningLanguages?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: UserProfile; // Populated by frontend after fetching profile
}

export interface RefreshRequest {
  refreshToken: string;
}

// ============ USER PROFILE ============
export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  nativeLanguage: string;
  learningLanguages: string[];
  latitude?: number;
  longitude?: number;
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
  latitude?: number;
  longitude?: number;
  learningLanguages?: string[];
}

// ============ AUTHOR ============
export interface AuthorDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  language?: string;
  flagEmoji?: string;
}

// ============ POSTS ============
export interface PostReactionSummary {
  likes: number;
  comments: number;
}

export interface ApiPost {
  id: string;
  content: string;
  originalLanguage: string;
  translation?: string;
  imageUrl?: string;

  // Location
  latitude?: number;
  longitude?: number;
  distance?: string;
  location?: string;

  // Metadata
  author: AuthorDto;
  reactions: PostReactionSummary;
  userReaction?: string | null;
  createdAt: string;
}

export interface CreatePostRequest {
  content: string;
  originalLanguage: string;
  translation?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface FeedResponse {
  posts: ApiPost[];
  nextCursor?: string;
  hasMore: boolean;
}

// ============ REACTIONS ============
export interface ReactionResponse {
  postId: string;
  profileId: string;
  reaction: string;
}

// ============ COMMENTS ============
export interface ApiComment {
  id: string;
  content: string;
  createdAt: string;
  author: AuthorDto;
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

// Legacy alias for backward compatibility
export type PostAuthor = AuthorDto;
