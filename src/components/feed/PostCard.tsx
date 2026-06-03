import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MapPin, Heart, MessageCircle, Share2, Send, X, Loader2, Languages, MoreHorizontal, Trash2, Flag, BookmarkPlus, Star, ScanLine, Save, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/common/UserAvatar";
import { useAuth } from "@/contexts/useAuth";
import { commentsApi, postsApi, wordsApi } from "@/services/api";
import { saveDetectedObject as saveDetectedObjectById, scanPostImage } from "@/services/api/scanner";
import { learnKeys } from "@/hooks/useLearnApi";
import { LANGUAGES } from "@/services/api";
import { getScannerConfidenceLabel } from "@/lib/scannerPrecision";
import { getUserLanguagePreferences } from "@/lib/userLanguages";
import type { Post } from "@/types";
import type { ApiComment } from "@/types/api";
import type { DetectedObject } from "@/types/scanner";

export interface PostCardProps {
  post: Post;
  onLikeToggle?: (postId: string, isLiked: boolean) => void;
}

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

const confidenceLabel = getScannerConfidenceLabel;

const detectedObjectKey = (object: DetectedObject) =>
  object.id ?? `${object.label}:${object.languageCode}:${object.learningWord}`;

export function PostCard({ post, onLikeToggle }: PostCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.reactions.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsCount, setCommentsCount] = useState(post.reactions.comments);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const [activeTranslationLang, setActiveTranslationLang] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'MISINFORMATION' | 'OTHER'>('SPAM');
  const [isDeleted, setIsDeleted] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [isSaved, setIsSaved] = useState(post.isSaved ?? false);
  const [showPostSavedFeedback, setShowPostSavedFeedback] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [phraseTargetLang, setPhraseTargetLang] = useState<string | null>(null);
  const [phraseAutoTranslation, setPhraseAutoTranslation] = useState('');
  const [isAutoTranslating, setIsAutoTranslating] = useState(false);
  const [isSavingWord, setIsSavingWord] = useState(false);
  const [savedWordDone, setSavedWordDone] = useState(false);
  const [isScanningPostImage, setIsScanningPostImage] = useState(false);
  const [postImageScanOpen, setPostImageScanOpen] = useState(false);
  const [postImageScanError, setPostImageScanError] = useState("");
  const [postImageDetections, setPostImageDetections] = useState<DetectedObject[]>([]);
  const [postImageSaveStates, setPostImageSaveStates] = useState<Record<string, 'saved' | 'duplicate' | 'error'>>({});
  const [postImageSavingKeys, setPostImageSavingKeys] = useState<Set<string>>(new Set());
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(null);

  const postImages = post.imageUrls?.length ? post.imageUrls : post.image ? [post.image] : [];
  const hasMultipleImages = postImages.length > 1;
  const activeImage = postImages[activeImageIndex] ?? postImages[0];
  const lightboxImage = lightboxImageIndex !== null ? postImages[lightboxImageIndex] : undefined;

  useEffect(() => {
    setIsLiked(post.isLiked ?? false);
    setLikesCount(post.reactions.likes);
    setIsSaved(post.isSaved ?? false);
  }, [post.isLiked, post.reactions.likes, post.isSaved]);

  useEffect(() => {
    setActiveImageIndex(0);
    setLightboxImageIndex(null);
    setPostImageScanOpen(false);
    setPostImageScanError("");
    setPostImageDetections([]);
  }, [post.id, post.image, post.imageUrls]);

  const handleSavePost = async () => {
    const next = !isSaved;
    setIsSaved(next);
    try {
      if (next) {
        await postsApi.savePost(post.id);
        setShowPostSavedFeedback(true);
        window.setTimeout(() => setShowPostSavedFeedback(false), 1800);
      } else {
        await postsApi.unsavePost(post.id);
        setShowPostSavedFeedback(false);
      }
    } catch {
      setIsSaved(!next);
      setShowPostSavedFeedback(false);
    }
  };

  const handleLike = () => {
    const next = !isLiked;
    setIsLiked(next);
    setLikesCount((prev) => prev + (next ? 1 : -1));
    onLikeToggle?.(post.id, isLiked);
  };

  const handleToggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setIsLoadingComments(true);
      try {
        const res = await commentsApi.getComments(post.id);
        setComments(res.comments);
      } catch (err) {
        console.error("Failed to load comments:", err);
      } finally {
        setIsLoadingComments(false);
      }
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`Check out this post from ${post.author.name}!`);
    } catch {
      // clipboard unavailable
    }
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await commentsApi.createComment(post.id, { content: newComment.trim() });
      setComments((prev) => [...prev, created]);
      setCommentsCount((prev) => prev + 1);
      setNewComment("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const { nativeLanguage } = getUserLanguagePreferences(user?.languages);
  const canTranslatePost = Boolean(nativeLanguage && nativeLanguage.code !== post.originalLanguage);

  const handleTranslate = () => {
    if (!nativeLanguage || !canTranslatePost) return;
    if (activeTranslationLang) {
      setActiveTranslationLang(null);
      return;
    }
    translateTo(nativeLanguage.code);
  };

  const translateTo = async (langCode: string) => {
    if (activeTranslationLang === langCode) {
      setActiveTranslationLang(null);
      return;
    }
    if (translationCache[langCode]) {
      setActiveTranslationLang(langCode);
      return;
    }
    setIsTranslating(true);
    try {
      const result = await postsApi.getTranslation(post.id, langCode);
      setTranslationCache((prev) => ({ ...prev, [langCode]: result.translatedContent }));
      setActiveTranslationLang(langCode);
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const isOwnPost = user?.id === post.author.id;

  const handleDelete = async () => {
    setShowMenu(false);
    setIsDeleted(true);
    try {
      await postsApi.deletePost(post.id);
    } catch (err) {
      console.error("Failed to delete post:", err);
      setIsDeleted(false);
    }
  };

  const handleReport = async () => {
    setIsReporting(true);
    try {
      await postsApi.reportPost(post.id, reportReason);
      setReportDone(true);
      setTimeout(() => setShowReportModal(false), 1500);
    } catch (err) {
      console.error("Failed to report post:", err);
    } finally {
      setIsReporting(false);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';
    if (text.length > 0) {
      setSelectedPhrase(text);
      setPhraseTargetLang(null);
      setPhraseAutoTranslation('');
      setSavedWordDone(false);
      setShowSaveModal(true);
    }
  };

  const handleTranslatePhrase = async (langCode: string) => {
    if (phraseTargetLang === langCode) return;
    setPhraseTargetLang(langCode);
    setPhraseAutoTranslation('');
    setIsAutoTranslating(true);
    try {
      const translated = await postsApi.translateText(selectedPhrase, post.originalLanguage, langCode);
      setPhraseAutoTranslation(translated);
    } catch (err) {
      console.error('Failed to translate phrase:', err);
    } finally {
      setIsAutoTranslating(false);
    }
  };

  const handleSaveWord = async () => {
    if (!phraseAutoTranslation || !phraseTargetLang) return;
    setIsSavingWord(true);
    try {
      await wordsApi.saveWord({
        word: selectedPhrase,
        translation: phraseAutoTranslation,
        languageCode: post.originalLanguage,
        postId: post.id,
        context: post.content,
      });
      queryClient.invalidateQueries({ queryKey: learnKeys.words() });
      queryClient.invalidateQueries({ queryKey: learnKeys.stats() });
      setSavedWordDone(true);
      setTimeout(() => setShowSaveModal(false), 1200);
    } catch (err) {
      console.error('Failed to save word:', err);
    } finally {
      setIsSavingWord(false);
    }
  };

  const handleScanPostImage = async () => {
    if (isScanningPostImage) return;

    if (postImageDetections.length > 0) {
      setPostImageScanOpen((current) => !current);
      return;
    }

    setPostImageScanOpen(true);
    setPostImageScanError("");
    setIsScanningPostImage(true);

    try {
      const result = await scanPostImage(post.id);
      setPostImageDetections(result.detectedObjects);
    } catch (err) {
      setPostImageScanError(err instanceof Error ? err.message : "Failed to scan post image");
    } finally {
      setIsScanningPostImage(false);
    }
  };

  const handleSaveDetectedPostObject = async (object: DetectedObject) => {
    const key = detectedObjectKey(object);
    if (!object.id) {
      setPostImageSaveStates((current) => ({ ...current, [key]: "error" }));
      return;
    }

    setPostImageSavingKeys((current) => new Set(current).add(key));

    try {
      await saveDetectedObjectById(object.id);
      setPostImageSaveStates((current) => ({ ...current, [key]: "saved" }));
      queryClient.invalidateQueries({ queryKey: learnKeys.words() });
      queryClient.invalidateQueries({ queryKey: learnKeys.stats() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setPostImageSaveStates((current) => ({
        ...current,
        [key]: message === "Word already saved" ? "duplicate" : "error",
      }));
    } finally {
      setPostImageSavingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const langInfo = LANGUAGES.find((l) => l.code === post.originalLanguage);

  const currentUserInitial = user?.displayName?.charAt(0).toUpperCase() ?? "U";
  const showPreviousImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveImageIndex((current) => (current - 1 + postImages.length) % postImages.length);
  };
  const showNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveImageIndex((current) => (current + 1) % postImages.length);
  };
  const showPreviousLightboxImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxImageIndex((current) =>
      current === null ? 0 : (current - 1 + postImages.length) % postImages.length
    );
  };
  const showNextLightboxImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxImageIndex((current) =>
      current === null ? 0 : (current + 1) % postImages.length
    );
  };

  if (isDeleted) return null;

  return (
    <>
    <article className="rounded-2xl border border-border bg-card p-3 transition-all duration-200 animate-fade-in">
      {/* Author header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {post.author.id ? (
            <Link
              to={`/user/${post.author.id}`}
              className="rounded-full transition-all hover:ring-2 hover:ring-primary/50"
            >
              <UserAvatar
                name={post.author.name}
                avatarUrl={post.author.avatarUrl}
                className="h-9 w-9"
                fallbackClassName="bg-gradient-to-br from-coral to-coral/70 text-white text-xs font-semibold"
              />
            </Link>
          ) : (
            <UserAvatar
              name={post.author.name}
              avatarUrl={post.author.avatarUrl}
              className="h-9 w-9"
              fallbackClassName="text-xs font-semibold"
            />
          )}
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              {post.author.id ? (
                <Link to={`/user/${post.author.id}`} className="truncate text-sm font-medium leading-tight text-foreground hover:underline">
                  {post.author.name}
                </Link>
              ) : (
                <span className="truncate text-sm font-medium leading-tight text-foreground">{post.author.name}</span>
              )}
            </div>
            {(post.author.location || (post.author.learningLanguages?.length ?? 0) > 0) && (
              <div className="mt-0.5 flex min-w-0 items-center gap-2 overflow-hidden text-[11px] leading-tight text-muted-foreground">
                {post.author.location && (
                  <div className="flex min-w-0 items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{post.author.location}</span>
                  </div>
                )}
                {(post.author.learningLanguages?.length ?? 0) > 0 && (
                  <div className="flex shrink-0 items-center gap-1">
                    <span>Learning</span>
                    {post.author.learningLanguages!.slice(0, 3).map((lang) => (
                      <span
                        key={lang.code}
                        title={lang.name}
                        className="rounded-full bg-muted px-1 py-0.5 text-xs leading-none"
                      >
                        {lang.flagEmoji}
                      </span>
                    ))}
                    {post.author.learningLanguages!.length > 3 && (
                      <span>+{post.author.learningLanguages!.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs text-muted-foreground">{post.time}</span>
          <div className="relative">
            <button
              onClick={() => setShowMenu((p) => !p)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                  <>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-rose-500 hover:bg-muted transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete post
                    </button>
                    {!isOwnPost && (
                    <button
                      onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Flag className="h-4 w-4" />
                      Report post
                    </button>
                    )}
                  </>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4 space-y-2">
        <p
          className="text-foreground leading-relaxed text-[15px] select-text cursor-text"
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
        >
          {post.content}
        </p>
        {activeTranslationLang && translationCache[activeTranslationLang] && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
                {nativeLanguage?.flagEmoji} {nativeLanguage?.name}
              <p className="text-sm text-muted-foreground italic">{translationCache[activeTranslationLang]}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {learningLanguages.find((l) => l.code === activeTranslationLang)?.flagEmoji}{" "}
                {learningLanguages.find((l) => l.code === activeTranslationLang)?.name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Post Images */}
      {activeImage && (
        <div
          className="relative mb-4"
          style={{ height: hasMultipleImages ? "220px" : undefined }}
        >
          <div
            onClick={() => setLightboxImageIndex(activeImageIndex)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setLightboxImageIndex(activeImageIndex);
              }
            }}
            role="button"
            tabIndex={0}
            className={`group block cursor-zoom-in overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              hasMultipleImages
                ? "absolute inset-y-0 left-0 right-4 z-30 rounded-2xl shadow-md"
                : "w-full rounded-xl"
            }`}
            aria-label="Open post image"
          >
            <img
              src={activeImage}
              alt="Post"
              className={`w-full object-cover transition-transform duration-200 group-hover:scale-[1.01] ${
                hasMultipleImages ? "h-full" : "h-auto max-h-80"
              }`}
            />
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={showPreviousImage}
                  className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg transition-colors hover:bg-black/70"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg transition-colors hover:bg-black/70"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {postImages.map((image, index) => (
                    <button
                      type="button"
                      key={`${image}-${index}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveImageIndex(index);
                      }}
                      className={`h-1.5 rounded-full transition-all ${
                        index === activeImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                      }`}
                      aria-label={`Show photo ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          {hasMultipleImages && activeImageIndex < postImages.length - 1 && (
            <div
              className="absolute inset-y-1 left-2 right-2 z-20 overflow-hidden rounded-2xl shadow"
              aria-hidden="true"
            >
              <img
                src={postImages[activeImageIndex + 1]}
                alt=""
                className="h-full w-full object-cover opacity-75"
              />
            </div>
          )}
          {hasMultipleImages && activeImageIndex < postImages.length - 2 && (
            <div
              className="absolute inset-y-2 left-4 right-0 z-10 overflow-hidden rounded-2xl shadow-sm"
              aria-hidden="true"
            >
              <img
                src={postImages[activeImageIndex + 2]}
                alt=""
                className="h-full w-full object-cover opacity-55"
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={`flex items-center gap-1.5 h-10 px-3 rounded-full active:scale-95 transition-all duration-200 ${
            isLiked ? "text-rose-500" : "text-muted-foreground active:text-primary"
          }`}
        >
          <Heart className={`h-5 w-5 transition-transform duration-200 ${isLiked ? "fill-current scale-110" : ""}`} />
          <span className="text-sm font-medium">{likesCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleComments}
          className={`flex items-center gap-1.5 h-10 px-3 rounded-full active:scale-95 transition-colors ${
            showComments ? "text-primary" : "text-muted-foreground active:text-primary"
          }`}
        >
        {canTranslatePost && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTranslate}
              disabled={isTranslating}
              aria-label={activeTranslationLang ? "Hide translation" : `Translate post to ${nativeLanguage?.name ?? "native language"}`}
              title={activeTranslationLang ? "Hide translation" : `Translate post to ${nativeLanguage?.name ?? "native language"}`}
              className={`flex items-center gap-1.5 h-10 px-3 rounded-full active:scale-95 transition-colors ${
                activeTranslationLang ? "text-primary" : "text-muted-foreground active:text-primary"
              }`}
            >
              {isTranslating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Languages className="h-5 w-5" />
              )}
            </Button>

          </div>
        )}
              </>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSavePost}
          aria-label={isSaved ? "Post saved" : "Save post"}
          title={isSaved ? "Post saved" : "Save post"}
          className={`h-10 px-3 rounded-full active:scale-95 transition-all ml-auto ${
            isSaved
              ? "bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700"
              : "text-muted-foreground"
          }`}
        >
          <Star className={`h-5 w-5 transition-all ${isSaved ? "fill-amber-400 stroke-amber-600" : ""}`} />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="flex items-center gap-1.5 h-10 px-3 rounded-full text-muted-foreground active:text-primary active:scale-95 transition-all"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Share toast */}
      {showShareToast && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary animate-fade-in">
          <span>Link copied to clipboard!</span>
          <button onClick={() => setShowShareToast(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {showPostSavedFeedback && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 animate-fade-in">
          <Star className="h-4 w-4 fill-amber-400 stroke-amber-600" />
          <span>Post saved</span>
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div className="mt-4 space-y-3 border-t border-border pt-4 animate-fade-in">
          {isLoadingComments ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-2">No comments yet. Be the first!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {comment.author.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 rounded-xl bg-muted/50 px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium">{comment.author.displayName}</span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Add comment input */}
          <div className="flex gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-coral-light text-xs font-semibold text-primary-foreground">
              {currentUserInitial}
            </div>
            <div className="flex flex-1 gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a comment..."
                className="flex-1 rounded-full bg-muted px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button
                size="icon"
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmitting}
                className="h-8 w-8 rounded-full"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>

      {lightboxImage && lightboxImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={() => setLightboxImageIndex(null)}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{post.author.name}</p>
              {hasMultipleImages && (
                <p className="text-xs text-white/70">
                  Photo {lightboxImageIndex + 1} of {postImages.length}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lightboxImageIndex === 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleScanPostImage();
                  }}
                  disabled={isScanningPostImage}
                  className="h-9 gap-2 rounded-full bg-white text-foreground hover:bg-white/90"
                >
                  {isScanningPostImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="h-4 w-4" />
                  )}
                  {isScanningPostImage
                    ? "Scanning"
                    : postImageDetections.length > 0 && postImageScanOpen
                      ? "Hide vocab"
                      : "Scan image vocab"}
                </Button>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightboxImageIndex(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Close image viewer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={showPreviousLightboxImage}
                  className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={showNextLightboxImage}
                  className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <img
              src={lightboxImage}
              alt="Post full size"
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>

          {postImageScanOpen && lightboxImageIndex === 0 && (
            <div
              className="max-h-[42vh] shrink-0 overflow-y-auto border-t border-white/10 bg-background p-4 text-foreground shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              {postImageScanError ? (
                <p className="text-sm text-destructive">{postImageScanError}</p>
              ) : isScanningPostImage ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Identifying objects...</span>
                </div>
              ) : postImageDetections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No objects detected in this image.</p>
              ) : (
                <div className="space-y-2">
                  {postImageDetections.map((object) => {
                    const key = detectedObjectKey(object);
                    const saveState = postImageSaveStates[key];
                    const isSaving = postImageSavingKeys.has(key);
                    const isSavedObject = saveState === "saved";
                    const isDuplicate = saveState === "duplicate";

                    return (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{object.learningWord}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {object.nativeWord} - {confidenceLabel(object.confidence)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSavedObject || isDuplicate || isSaving}
                          onClick={() => handleSaveDetectedPostObject(object)}
                          className={`h-8 flex-shrink-0 gap-1.5 ${
                            isSavedObject || isDuplicate
                              ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50"
                              : ""
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isSavedObject ? (
                            <Check className="h-3.5 w-3.5 text-amber-600" />
                          ) : (
                            <Save className={`h-3.5 w-3.5 ${isDuplicate ? "text-amber-600" : ""}`} />
                          )}
                          {isDuplicate ? "Duplicate" : isSavedObject ? "Saved" : "Save"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Save phrase modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSaveModal(false)} />
          <div className="relative z-50 w-full max-w-sm mx-4 bg-card rounded-2xl p-5 shadow-xl">
            {savedWordDone ? (
              <div className="py-4 text-center">
                <BookmarkPlus className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-semibold text-foreground">Word saved to word bank!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Save phrase</h3>
                  <button onClick={() => setShowSaveModal(false)}>
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Selected phrase */}
                <div className="mb-4 rounded-xl bg-muted/50 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground mb-1">
                    {langInfo ? `${langInfo.flag} ${langInfo.name}` : post.originalLanguage}
                {/* Translate to native language */}
                {nativeLanguage && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Translate to native:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleTranslatePhrase(nativeLanguage.code)}
                        disabled={isAutoTranslating}
                        aria-label={`Translate phrase to ${nativeLanguage.name}`}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          phraseTargetLang === nativeLanguage.code
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-foreground border-border hover:bg-muted/80'
                        }`}
                      >
                        <span>{nativeLanguage.flagEmoji}</span>
                        <span>{nativeLanguage.name}</span>
                      </button>
                    </div>
                  </div>
                )}
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-translation result */}
                {isAutoTranslating && (
                  <div className="mb-4 flex items-center justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                      {nativeLanguage?.flagEmoji} {nativeLanguage?.name}
                  <div className="mb-4 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground mb-1">
                      {learningLanguages.find(l => l.code === phraseTargetLang)?.flagEmoji}{' '}
                      {learningLanguages.find(l => l.code === phraseTargetLang)?.name}
                    </p>
                    <p className="font-medium text-foreground">{phraseAutoTranslation}</p>
                  </div>
                )}

                <Button
                  onClick={handleSaveWord}
                  disabled={!phraseAutoTranslation || isSavingWord}
                  className="w-full rounded-xl"
                >
                  {isSavingWord ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save to vocabulary'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowReportModal(false)} />
          <div className="relative z-50 w-full max-w-sm mx-4 bg-card rounded-2xl p-5 shadow-xl">
            {reportDone ? (
              <div className="py-4 text-center">
                <p className="text-base font-semibold text-foreground">Report submitted</p>
                <p className="text-sm text-muted-foreground mt-1">Thanks for letting us know.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Report post</h3>
                  <button onClick={() => setShowReportModal(false)}>
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
                <div className="space-y-2 mb-4">
                  {(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'MISINFORMATION', 'OTHER'] as const).map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                        reportReason === reason
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      {reason.charAt(0) + reason.slice(1).toLowerCase().replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={handleReport}
                  disabled={isReporting}
                  className="w-full rounded-xl"
                >
                  {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit report'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default PostCard;
