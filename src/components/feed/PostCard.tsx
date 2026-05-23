import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MapPin, Heart, MessageCircle, Share2, Send, X, Loader2, Languages, MoreHorizontal, Trash2, Flag, BookmarkPlus, UserPlus, UserCheck, Star, ScanLine, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/common/UserAvatar";
import { useAuth } from "@/contexts/useAuth";
import { commentsApi, postsApi, wordsApi, friendsApi } from "@/services/api";
import { saveDetectedObject as saveDetectedObjectById, scanImage } from "@/services/api/scanner";
import { learnKeys } from "@/hooks/useLearnApi";
import type { FriendRequestResponse } from "@/types/api";
import { LANGUAGES } from "@/services/api";
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

const confidenceLabel = (confidence: number) => `${Math.round(confidence * 100)}%`;

const detectedObjectKey = (object: DetectedObject) =>
  object.id ?? `${object.label}:${object.languageCode}:${object.learningWord}`;

const imageUrlToFile = async (imageUrl: string, postId: string): Promise<File> => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Could not load this image for scanning");
  }

  const blob = await response.blob();
  const extension = blob.type.split("/")[1] || "jpg";
  return new File([blob], `post-${postId}.${extension}`, {
    type: blob.type || "image/jpeg",
  });
};

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
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'MISINFORMATION' | 'OTHER'>('SPAM');
  const [isDeleted, setIsDeleted] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [isSaved, setIsSaved] = useState(post.isSaved ?? false);
  const [showPostSavedFeedback, setShowPostSavedFeedback] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendRequestResponse | null | 'loading'>('loading');
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

  useEffect(() => {
    setIsLiked(post.isLiked ?? false);
    setLikesCount(post.reactions.likes);
    setIsSaved(post.isSaved ?? false);
  }, [post.isLiked, post.reactions.likes, post.isSaved]);

  useEffect(() => {
    if (!post.author.id || user?.id === post.author.id) {
      setFriendStatus(null);
      return;
    }
    friendsApi.getFriendStatus(post.author.id)
      .then(setFriendStatus)
      .catch(() => setFriendStatus(null));
  }, [post.author.id, user?.id]);

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

  const learningLanguages = user?.languages?.filter((l) => l.isLearning) ?? [];

  const handleTranslate = () => {
    if (learningLanguages.length === 0) return;
    if (activeTranslationLang) {
      setActiveTranslationLang(null);
      return;
    }
    if (learningLanguages.length === 1) {
      translateTo(learningLanguages[0].code);
    } else {
      setShowLangPicker((prev) => !prev);
    }
  };

  const translateTo = async (langCode: string) => {
    setShowLangPicker(false);
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

  const handleConnect = async () => {
    if (friendStatus === 'loading' || friendStatus !== null) return;
    try {
      const result = await friendsApi.sendFriendRequest(post.author.id);
      setFriendStatus(result);
    } catch (err) {
      console.error('Failed to send friend request:', err);
    }
  };

  const handleAccept = async () => {
    if (!friendStatus || friendStatus === 'loading') return;
    try {
      const result = await friendsApi.respondToRequest(friendStatus.id, 'accept');
      setFriendStatus(result);
    } catch (err) {
      console.error('Failed to accept friend request:', err);
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    try {
      await postsApi.deletePost(post.id);
      setIsDeleted(true);
    } catch (err) {
      console.error("Failed to delete post:", err);
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
        languageCode: phraseTargetLang,
        postId: post.id,
        context: post.content,
      });
      setSavedWordDone(true);
      setTimeout(() => setShowSaveModal(false), 1200);
    } catch (err) {
      console.error('Failed to save word:', err);
    } finally {
      setIsSavingWord(false);
    }
  };

  const handleScanPostImage = async () => {
    if (!post.image || isScanningPostImage) return;

    if (postImageDetections.length > 0) {
      setPostImageScanOpen((current) => !current);
      return;
    }

    setPostImageScanOpen(true);
    setPostImageScanError("");
    setIsScanningPostImage(true);

    try {
      const imageFile = await imageUrlToFile(post.image, post.id);
      const result = await scanImage(imageFile);
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

  if (isDeleted) return null;

  return (
    <>
    <article className="rounded-2xl border border-border bg-card p-4 transition-all duration-200 animate-fade-in">
      {/* Author header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {post.author.id ? (
            <Link
              to={`/user/${post.author.id}`}
              className="rounded-full transition-all hover:ring-2 hover:ring-primary/50"
            >
              <UserAvatar
                name={post.author.name}
                avatarUrl={post.author.avatarUrl}
                className="h-11 w-11"
                fallbackClassName="text-sm font-semibold"
              />
            </Link>
          ) : (
            <UserAvatar
              name={post.author.name}
              avatarUrl={post.author.avatarUrl}
              className="h-11 w-11"
              fallbackClassName="text-sm font-semibold"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              {post.author.id ? (
                <Link to={`/user/${post.author.id}`} className="font-medium text-foreground hover:underline">
                  {post.author.name}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{post.author.name}</span>
              )}
            </div>
            {post.author.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{post.author.location}</span>
              </div>
            )}
            {(post.author.learningLanguages?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">Learning</span>
                {post.author.learningLanguages!.slice(0, 3).map((lang) => (
                  <span
                    key={lang.code}
                    title={lang.name}
                    className="text-sm bg-muted px-1.5 py-0.5 rounded-full"
                  >
                    {lang.flagEmoji}
                  </span>
                ))}
                {post.author.learningLanguages!.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{post.author.learningLanguages!.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOwnPost && friendStatus !== 'loading' && (
            <>
              {friendStatus === null && (
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-1 text-xs font-medium text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-full transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Connect
                </button>
              )}
              {friendStatus !== null && friendStatus.status === 'PENDING' && friendStatus.isSentByMe && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground border border-border px-2.5 py-1 rounded-full">
                  <UserCheck className="h-3.5 w-3.5" />
                  Requested
                </span>
              )}
              {friendStatus !== null && friendStatus.status === 'PENDING' && !friendStatus.isSentByMe && (
                <button
                  onClick={handleAccept}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-600 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full transition-colors"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Accept
                </button>
              )}
              {friendStatus !== null && friendStatus.status === 'ACCEPTED' && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground border border-border px-2.5 py-1 rounded-full">
                  <UserCheck className="h-3.5 w-3.5" />
                  Friends
                </span>
              )}
            </>
          )}
          <span className="text-xs text-muted-foreground">{post.time}</span>
          <div className="relative">
            <button
              onClick={() => setShowMenu((p) => !p)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                  {isOwnPost ? (
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-rose-500 hover:bg-muted transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete post
                    </button>
                  ) : (
                    <button
                      onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Flag className="h-4 w-4" />
                      Report post
                    </button>
                  )}
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
            <Languages className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground italic">{translationCache[activeTranslationLang]}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {learningLanguages.find((l) => l.code === activeTranslationLang)?.flagEmoji}{" "}
                {learningLanguages.find((l) => l.code === activeTranslationLang)?.name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Post Image */}
      {post.image && (
        <>
          <div className="mb-3 -mx-4 sm:mx-0 sm:rounded-xl overflow-hidden">
            <img src={post.image} alt="Post" className="w-full h-auto max-h-80 object-cover" />
          </div>
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScanPostImage}
              disabled={isScanningPostImage}
              className="h-9 rounded-full gap-2"
            >
              {isScanningPostImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4" />
              )}
              {isScanningPostImage
                ? "Scanning"
                : postImageDetections.length > 0 && postImageScanOpen
                  ? "Hide image vocab"
                  : "Scan image vocab"}
            </Button>

            {postImageScanOpen && (
              <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
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
                      const isSaved = saveState === "saved";
                      const isDuplicate = saveState === "duplicate";

                      return (
                        <div key={key} className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{object.learningWord}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {object.nativeWord} - {confidenceLabel(object.confidence)}
                            </p>
                          </div>
                          <Button
                            variant={isSaved || isDuplicate ? "secondary" : "ghost"}
                            size="sm"
                            disabled={isSaved || isDuplicate || isSaving}
                            onClick={() => handleSaveDetectedPostObject(object)}
                            className="h-8 flex-shrink-0 gap-1.5"
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isSaved ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            {isDuplicate ? "Duplicate" : isSaved ? "Saved" : "Save"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
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
          <MessageCircle className={`h-5 w-5 ${showComments ? "fill-primary/20" : ""}`} />
          <span className="text-sm font-medium">{commentsCount}</span>
        </Button>

        {learningLanguages.length > 0 && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTranslate}
              disabled={isTranslating}
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

            {showLangPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-44 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                  {learningLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => translateTo(lang.code)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left ${
                        activeTranslationLang === lang.code ? "text-primary font-medium" : "text-foreground"
                      }`}
                    >
                      <span>{lang.flagEmoji}</span>
                      <span>{lang.name}</span>
                      {activeTranslationLang === lang.code && <span className="ml-auto text-primary">✓</span>}
                    </button>
                  ))}
                </div>
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
                  </p>
                  <p className="font-medium text-foreground">{selectedPhrase}</p>
                </div>

                {/* Translate to: language buttons */}
                {learningLanguages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Translate to:</p>
                    <div className="flex flex-wrap gap-2">
                      {learningLanguages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleTranslatePhrase(lang.code)}
                          disabled={isAutoTranslating}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            phraseTargetLang === lang.code
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted text-foreground border-border hover:bg-muted/80'
                          }`}
                        >
                          <span>{lang.flagEmoji}</span>
                          <span>{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-translation result */}
                {isAutoTranslating && (
                  <div className="mb-4 flex items-center justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
                {!isAutoTranslating && phraseAutoTranslation && phraseTargetLang && (
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
