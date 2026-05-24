import { useState, useCallback, useEffect } from "react";
import { Globe, Plus, MessageCircle, ChevronDown, Check, Loader2, Languages } from "lucide-react";
import { PostCard } from "@/components/feed/PostCard";
import { ComposeModal } from "@/components/feed/ComposeModal";
import type { ComposePostPayload } from "@/components/feed/ComposeModal";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { postsApi, LANGUAGES, getLanguageByCode } from "@/services/api";
import { getStoredUser } from "@/services/api/auth";
import { createSavedWord } from "@/services/api/learn";
import { toast } from "sonner";
import type { ApiPost, CreatePostRequest, Post } from "@/types";

// Convert API post to UI post format
const toUiPost = (apiPost: ApiPost): Post => {
  const lang = getLanguageByCode(apiPost.originalLanguage);
  return {
    id: apiPost.id,
    author: {
      id: apiPost.author.id,
      name: apiPost.author.displayName,
      avatar: apiPost.author.avatarUrl
        ? apiPost.author.displayName.charAt(0).toUpperCase()
        : apiPost.author.displayName.charAt(0).toUpperCase(),
      language: apiPost.author.language ?? lang?.name ?? apiPost.originalLanguage,
      flag: apiPost.author.flagEmoji ?? lang?.flag ?? '🌍',
    },
    content: apiPost.content,
    translation: apiPost.translation || '',
    location: apiPost.location || '',
    distance: apiPost.distance || '',
    image: apiPost.imageUrl,
    images: apiPost.imageUrl ? [apiPost.imageUrl] : undefined,
    languageCode: apiPost.originalLanguage,
    reactions: {
      likes: apiPost.reactions.likes,
      comments: apiPost.reactions.comments
    },
    time: formatRelativeTime(apiPost.createdAt),
    isLiked: apiPost.userReaction === 'LIKE',
  };
};

// Format relative time
const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [translateAll, setTranslateAll] = useState(false);

  const currentUser = getStoredUser();

  // Fetch posts on mount and when language filter changes
  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const langCode = selectedLanguage
        ? LANGUAGES.find((l) => l.name === selectedLanguage)?.code
        : undefined;
      const response = await postsApi.getFeed({ language: langCode });
      console.log("[FeedPage] getFeed response:", response);
      setPosts(response.posts.map(toUiPost));
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async (newPostData: ComposePostPayload) => {
    const langCode = LANGUAGES.find(l => l.name === newPostData.author.language)?.code || 'en';
    const payload: CreatePostRequest = {
      content: newPostData.content,
      originalLanguage: langCode,
      image: newPostData.imageFile || undefined,
    };
    console.log('[FeedPage] Creating post:', payload);
    try {
      const apiPost = await postsApi.createPost(payload);
      console.log('[FeedPage] Post created:', apiPost);
      const uiPost = toUiPost(apiPost);
      // Preserve user-provided translation if backend didn't return one
      if (!uiPost.translation && newPostData.translation) {
        uiPost.translation = newPostData.translation;
      }
      // Preserve all local image previews (backend only stores the first)
      if (newPostData.images && newPostData.images.length > 0) {
        uiPost.images = newPostData.images;
        uiPost.image = newPostData.images[0];
      }
      setPosts(prev => [uiPost, ...prev]);
    } catch (error) {
      console.error('[FeedPage] Failed to create post:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await postsApi.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleSaveToWordBank = async (post: Post) => {
    try {
      await createSavedWord({
        word: post.content,
        translation: post.translation,
        language_code: post.languageCode || 'en',
        source: 'POST',
        source_id: post.id,
        context: post.content,
      });
      toast.success('Saved to word bank');
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Word already saved') {
        toast.info('Already in your word bank');
      } else {
        toast.error('Failed to save to word bank');
      }
    }
  };

  const handleLikeToggle = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await postsApi.unlikePost(postId);
      } else {
        await postsApi.likePost(postId);
      }
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
            ...post,
            isLiked: !isLiked,
            reactions: {
              ...post.reactions,
              likes: post.reactions.likes + (isLiked ? -1 : 1)
            }
          }
          : post
      ));
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const filteredPosts = posts;

  const languageOptions = LANGUAGES.map(l => l.name);
  const languageFlags: Record<string, string> = Object.fromEntries(
    LANGUAGES.map(l => [l.name, l.flag])
  );

  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
      <div className="h-full overflow-y-auto pb-24 scrollbar-hide w-full max-w-2xl mx-auto px-4 py-4 overflow-x-hidden">
        {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Community</h1>
      </div>
        {/* What's on your mind + language filter */}
        <div className="mb-4 space-y-3">
          {/* Compose prompt */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-coral-light text-sm font-semibold text-primary-foreground">
              {currentUser?.displayName?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <span className="text-sm text-muted-foreground flex-1">
              What's on your mind{currentUser?.displayName ? `, ${currentUser.displayName.split(' ')[0]}` : ''}?
            </span>
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
              <Plus className="h-4 w-4 text-primary" />
            </div>
          </button>

          {/* Language filter + Translate all */}
          <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-card hover:bg-muted/50 transition-colors text-sm font-medium"
            >
              <span className="text-base">
                {selectedLanguage ? languageFlags[selectedLanguage] : "🌍"}
              </span>
              <span className="text-foreground">
                {selectedLanguage || "All Languages"}
              </span>
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

          <button
            onClick={() => setTranslateAll(t => !t)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-colors ${
              translateAll
                ? 'text-primary bg-[#9973CE15] border-primary/30'
                : 'border-border bg-card text-foreground'
            }`}
          >
            <Languages className="h-4 w-4" />
            Translate all
          </button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          /* Posts */
          <div className="space-y-4">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isOwnPost={!!currentUser && post.author.id === currentUser.id}
                  showTranslationByDefault={translateAll}
                  onLikeToggle={handleLikeToggle}
                  onDelete={handleDeletePost}
                  onSaveToWordBank={handleSaveToWordBank}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No posts yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {selectedLanguage
                    ? `No posts in ${selectedLanguage} yet. Be the first to share something!`
                    : 'Be the first to share something!'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Compose modal */}
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          onSubmit={handleCreatePost}
        />
      </div>
    </PullToRefresh>
  );
}
