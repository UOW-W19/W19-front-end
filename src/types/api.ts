// API Types matching Backend contract (Frontend Integration Guide)
// Last Updated: 2026-01-10
// IMPORTANT: Backend uses snake_case, frontend uses camelCase
// Transformation happens in service layer

// ============ AUTH ============
export interface RegisterRequest {
  email: string;
  username?: string;
  password: string;
  displayName: string;
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
export interface UserLanguage {
  code: string;
  name: string;
  flagEmoji: string;
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'NATIVE';
  isLearning: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  createdAt: string;
  languages: UserLanguage[];
  roles: string[];
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
export type PostStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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
  userReaction?: ReactionType | null;
  status?: PostStatus;
  createdAt: string;
}

export interface CreatePostRequest {
  content: string;
  originalLanguage?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface FeedResponse {
  posts: ApiPost[];
  nextCursor?: string;
  hasMore: boolean;
}

// ============ POST TRANSLATION ============
export interface PostTranslationResponse {
  languageCode: string;
  translatedContent: string;
}

// ============ REACTIONS ============
export type ReactionType = 'LIKE' | 'LOVE' | 'HELPFUL' | 'FUNNY';

export interface PostReactionRequest {
  reaction: ReactionType;
}

export interface PostReactionResponse {
  likes: number;
  comments: number;
  userReaction: ReactionType;
}

// Legacy type for backward compatibility
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

// ============ LEARNING CORE ============
export type WordSource = 'POST' | 'MANUAL';

export interface SavedWord {
  id: string;
  word: string;
  translation: string;
  languageCode: string;
  languageName: string;
  languageFlag: string;
  source: WordSource;
  sourceId?: string;
  context?: string;
  masteryLevel: number;
  nextReview?: string;
  createdAt: string;
}

export interface CreateWordRequest {
  word: string;
  translation: string;
  languageCode: string;
  source: WordSource;
  sourceId?: string;
  context?: string;
}

export interface UpdateWordRequest {
  translation?: string;
  context?: string;
}

export interface StartSessionRequest {
  sessionSize: number; // 5, 10, or 15
  languageCode?: string;
}

export interface SessionWord {
  id: string;
  word: string;
  translation: string;
  languageCode: string;
  languageFlag: string;
  masteryLevel: number;
}

export interface StartSessionResponse {
  sessionId: string;
  startedAt: string;
  words: SessionWord[];
}

export interface SubmitResultRequest {
  wordId: string;
  isCorrect: boolean;
  responseTimeMs?: number;
}

export interface SubmitResultResponse {
  wordId: string;
  isCorrect: boolean;
  newMasteryLevel: number;
  masteryChange: number;
}

export interface SessionResult {
  wordId: string;
  word: string;
  isCorrect: boolean;
  oldMastery: number;
  newMastery: number;
}

export interface CompleteSessionResponse {
  sessionId: string;
  wordsPracticed: number;
  correctCount: number;
  accuracy: number;
  durationSeconds: number;
  results: SessionResult[];
}

export interface LanguageStats {
  code: string;
  name: string;
  flag: string;
  wordCount: number;
  averageMastery: number;
}

export interface MasteryDistribution {
  beginner: number;   // 0-25%
  learning: number;   // 26-50%
  familiar: number;   // 51-75%
  mastered: number;   // 76-100%
}

export interface LearningStatsResponse {
  totalWords: number;
  averageMastery: number;
  languages: LanguageStats[];
  masteryDistribution: MasteryDistribution;
}

// ============ REPORTS ============
export type ReportReason = 
  | 'SPAM' 
  | 'HARASSMENT' 
  | 'INAPPROPRIATE' 
  | 'MISINFORMATION' 
  | 'OTHER';

export interface ReportRequest {
  postId?: string;
  commentId?: string;
  reason: ReportReason;
  description?: string;
}

// ============ SETTINGS ============
export interface NotificationPrefs {
  pushEnabled: boolean;
  emailEnabled: boolean;
  likeNotifications: boolean;
  commentNotifications: boolean;
  meetupNotifications: boolean;
}

export interface PrivacySettings {
  showLocation: boolean;
  allowMessages: 'everyone' | 'friends' | 'none';
}

export interface UserSettingsDTO {
  theme?: string;
  notificationPrefs: NotificationPrefs;
  privacySettings: PrivacySettings;
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
  path?: string;
}

// ============ PAGINATION ============
export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

// Legacy alias for backward compatibility
export type PostAuthor = AuthorDto;
