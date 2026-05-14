import { useState, useCallback, useEffect, useRef } from "react";
import { Globe, Plus, MessageCircle, ChevronDown, Check, Loader2 } from "lucide-react";
import { PostCard } from "@/components/feed/PostCard";
import { ComposeModal } from "@/components/feed/ComposeModal";
import type { ComposePostPayload } from "@/components/feed/ComposeModal";
import { Button } from "@/components/ui/button";
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
      language: apiPost.author.language ?? lang?.name ?? apiPost.originalLanguage,
      flag: apiPost.author.flagEmoji ?? lang?.flag ?? '🌍',
      location: apiPost.author.location,
    },
    content: apiPost.content,
    originalLanguage: apiPost.originalLanguage,
    translation: apiPost.translation || '',
    location: apiPost.location || '',
    distance: apiPost.distance || '',
    image: apiPost.imageUrl,
    reactions: {
      likes: apiPost.reactions.likes,
      comments: apiPost.reactions.comments,
    },
    time: formatRelativeTime(apiPost.createdAt),
    isLiked: apiPost.userReaction === 'LIKE',
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
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="relative">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
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
                <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedLanguage(null); setShowLanguageDropdown(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors text-left"
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
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors text-left"
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

          <Button
            onClick={() => setIsComposeOpen(true)}
            size="sm"
            className="gap-1.5 h-9 px-4 rounded-full shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Post
          </Button>
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
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
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
