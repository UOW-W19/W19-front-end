import { useState, useCallback, useEffect, useRef } from "react";
import { Globe, Plus, MessageCircle, ChevronDown, Check, Loader2 } from "lucide-react";
import { PostCard } from "@/components/feed/PostCard";
import { ComposeModal } from "@/components/feed/ComposeModal";
import type { ComposePostPayload } from "@/components/feed/ComposeModal";
import UserAvatar from "@/components/common/UserAvatar";
import { useAuth } from "@/contexts/useAuth";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { postsApi, LANGUAGES, getLanguageByCode } from "@/services/api";
import type { ApiPost, CreatePostRequest, Post } from "@/types";

const toUiPost = (apiPost: ApiPost): Post => {
  const lang = getLanguageByCode(apiPost.originalLanguage);
  return {
    id: apiPost.id,
    author: {
      id: apiPost.author.id,
      name: apiPost.author.displayName,
      avatar: apiPost.author.displayName.charAt(0).toUpperCase(),
      avatarUrl: apiPost.author.avatarUrl,
      language: apiPost.author.language ?? lang?.name ?? apiPost.originalLanguage,
      flag: apiPost.author.flagEmoji ?? lang?.flag ?? '🌍',
      location: apiPost.author.location,
      learningLanguages: apiPost.author.learningLanguages ?? [],
    },
    content: apiPost.content,
    originalLanguage: apiPost.originalLanguage,
    translation: apiPost.translation || '',
    location: apiPost.location || '',
    distance: apiPost.distance || '',
    image: apiPost.imageUrl,
    imageUrls: apiPost.imageUrls,
    reactions: {
      likes: apiPost.reactions.likes,
      comments: apiPost.reactions.comments,
    },
    time: formatRelativeTime(apiPost.createdAt),
    isLiked: apiPost.userReaction === 'LIKE',
    isSaved: apiPost.isSaved ?? false,
  };
};

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  const getLangCode = useCallback(() =>
    selectedLanguage ? LANGUAGES.find((l) => l.name === selectedLanguage)?.code : undefined,
    [selectedLanguage]
  );

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await postsApi.getFeed({ language: getLangCode() });
      setPosts(response.posts.map(toUiPost));
      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getLangCode]);

  const fetchMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore || !nextCursor) return;
    isFetchingRef.current = true;
    setIsFetchingMore(true);
    try {
      const response = await postsApi.getFeed({
        language: getLangCode(),
        cursor: nextCursor,
      });
      setPosts((prev) => [...prev, ...response.posts.map(toUiPost)]);
      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (error) {
      console.error("Failed to fetch more posts:", error);
    } finally {
      setIsFetchingMore(false);
      isFetchingRef.current = false;
    }
  }, [hasMore, nextCursor, getLangCode]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Infinite scroll listener
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        fetchMore();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [fetchMore]);

  const handleRefresh = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async (newPostData: ComposePostPayload) => {
    const langCode = LANGUAGES.find((l) => l.name === newPostData.author.language)?.code || 'en';
    const payload: CreatePostRequest = {
      content: newPostData.content,
      originalLanguage: langCode,
      images: newPostData.imageFiles?.length ? newPostData.imageFiles : undefined,
      image: newPostData.imageFile || undefined,
    };
    try {
      const apiPost = await postsApi.createPost(payload);
      setPosts((prev) => [toUiPost(apiPost), ...prev]);
    } catch (error) {
      console.error('[FeedPage] Failed to create post:', error);
    }
  };

  const handleLikeToggle = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await postsApi.unlikePost(postId);
      } else {
        await postsApi.likePost(postId);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const languageOptions = LANGUAGES.map((l) => l.name);
  const languageFlags: Record<string, string> = Object.fromEntries(
    LANGUAGES.map((l) => [l.name, l.flag])
  );

  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto pb-24 scrollbar-hide w-full max-w-2xl mx-auto px-4 py-4 overflow-x-hidden"
      >
        {/* Compose prompt */}
        <button
          onClick={() => setIsComposeOpen(true)}
          className="mb-4 flex w-full items-center gap-3 rounded-[28px] border border-purple/15 bg-card px-4 py-3 text-left shadow-locale-sm transition-colors hover:bg-purple/10"
        >
          <UserAvatar
            name={user?.displayName ?? "You"}
            avatarUrl={user?.avatarUrl}
            className="h-10 w-10"
            fallbackClassName="text-sm font-semibold"
          />
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            What&apos;s on your mind{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}?
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-primary">
            <Plus className="h-4 w-4" />
          </span>
        </button>

        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="relative">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-2 rounded-pill border border-purple/15 bg-card px-3 py-2 text-sm font-medium shadow-locale-sm transition-colors hover:bg-purple/10"
            >
              <span className="text-base">
                {selectedLanguage ? languageFlags[selectedLanguage] : "🌍"}
              </span>
              <span className="text-foreground">{selectedLanguage || "All Languages"}</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showLanguageDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLanguageDropdown(false)} />
                <div className="absolute left-0 top-full z-50 mt-2 max-h-64 w-48 overflow-y-auto rounded-2xl border border-purple/15 bg-card py-1 shadow-locale-md">
                  <button
                    onClick={() => { setSelectedLanguage(null); setShowLanguageDropdown(false); }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-purple/10"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">All Languages</span>
                    </div>
                    {selectedLanguage === null && <Check className="h-4 w-4 text-primary" />}
                  </button>
                  {languageOptions.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setSelectedLanguage(lang); setShowLanguageDropdown(false); }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-purple/10"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{languageFlags[lang]}</span>
                        <span className="text-sm text-foreground">{lang}</span>
                      </div>
                      {selectedLanguage === lang && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <span className="text-xs font-medium text-muted-foreground">Community feed</span>
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {posts.length > 0 ? (
              <>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onLikeToggle={handleLikeToggle} />
                ))}
                {isFetchingMore && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                )}
                {!hasMore && posts.length > 0 && (
                  <p className="text-center text-xs text-muted-foreground py-6">
                    You've reached the end
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-purple/20 bg-card/70 px-6 py-16 text-center shadow-locale-sm">
                <div className="mb-4 rounded-2xl bg-purple/10 p-4">
                  <MessageCircle className="h-8 w-8 text-purple" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No posts yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {selectedLanguage
                    ? `No posts in ${selectedLanguage} yet. Be the first to share something!`
                    : 'Be the first to share something!'}
                </p>
              </div>
            )}
          </div>
        )}

        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          onSubmit={handleCreatePost}
        />
      </div>
    </PullToRefresh>
  );
}
