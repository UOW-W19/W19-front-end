import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MapPin, Heart, MessageCircle, Send, X,
  Languages, Trash2, Star, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Post, Comment } from "@/types";

export interface PostCardProps {
  post: Post;
  isOwnPost?: boolean;
  showTranslationByDefault?: boolean;
  onLikeToggle?: (postId: string, isLiked: boolean) => void;
  onDelete?: (postId: string) => void;
  onSaveToWordBank?: (post: Post) => void;
}

export function PostCard({ post, isOwnPost, showTranslationByDefault = false, onLikeToggle, onDelete, onSaveToWordBank }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.reactions.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showTranslation, setShowTranslation] = useState(showTranslationByDefault);
  const [isSaved, setIsSaved] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const images = post.images?.length ? post.images : post.image ? [post.image] : [];

  // Sync with "translate all" toggle from parent — only if a translation exists
  useEffect(() => {
    if (post.translation) setShowTranslation(showTranslationByDefault);
  }, [showTranslationByDefault, post.translation]);

  const handleLike = () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
    onLikeToggle?.(post.id, isLiked);
  };

  const handleSave = () => {
    const newSaved = !isSaved;
    setIsSaved(newSaved);
    if (newSaved) onSaveToWordBank?.(post);
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete?.(post.id);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      author: "You",
      avatar: "U",
      text: newComment,
      time: "Just now",
    };
    setComments(prev => [...prev, comment]);
    setNewComment("");
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-4 transition-all duration-200 animate-fade-in">

      {/* Author header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {post.author.id ? (
            <Link to={`/user/${post.author.id}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-coral-light text-sm font-semibold text-primary-foreground hover:ring-2 hover:ring-primary/50 transition-all">
              {post.author.avatar}
            </Link>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-coral-light text-sm font-semibold text-primary-foreground">
              {post.author.avatar}
            </div>
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
              <span className="text-base">{post.author.flag}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{post.location}</span>
              <span>•</span>
              <span>{post.distance}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{post.time}</span>
          {isOwnPost && (
            <button
              onClick={handleDelete}
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                confirmDelete
                  ? "bg-destructive/15 text-destructive"
                  : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              )}
              title={confirmDelete ? "Tap again to confirm" : "Delete post"}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-3 space-y-1.5">
        <p className="text-foreground leading-relaxed text-[15px]">{post.content}</p>
        {showTranslation && post.translation && (
          <p className="text-sm text-muted-foreground italic animate-in fade-in slide-in-from-top-1 duration-200">
            {post.translation}
          </p>
        )}
      </div>

      {/* Photo carousel */}
      {images.length > 0 && (
        <div className="mb-4 -mx-4 sm:mx-0 sm:rounded-xl overflow-hidden relative group">
          <img
            src={images[imageIndex]}
            alt="Post"
            className="w-full h-auto max-h-80 object-cover"
          />
          {/* Prev / Next — only shown with multiple images */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setImageIndex(i => Math.max(0, i - 1))}
                disabled={imageIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setImageIndex(i => Math.min(images.length - 1, i + 1))}
                disabled={imageIndex === images.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-0"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {/* Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-1 border-t border-border pt-3">
        {/* Like */}
        <Button
          variant="ghost" size="sm"
          onClick={handleLike}
          className={cn(
            "flex items-center gap-1.5 h-10 px-3 rounded-full active:scale-95 transition-all duration-200",
            isLiked ? "text-rose-500" : "text-muted-foreground active:text-primary"
          )}
        >
          <Heart className={cn("h-5 w-5 transition-transform duration-200", isLiked && "fill-current scale-110")} />
          <span className="text-sm font-medium">{likesCount}</span>
        </Button>

        {/* Comment */}
        <Button
          variant="ghost" size="sm"
          onClick={() => setShowComments(!showComments)}
          className={cn(
            "flex items-center gap-1.5 h-10 px-3 rounded-full active:scale-95 transition-colors",
            showComments ? "text-primary" : "text-muted-foreground active:text-primary"
          )}
        >
          <MessageCircle className={cn("h-5 w-5", showComments && "fill-primary/20")} />
          <span className="text-sm font-medium">{post.reactions.comments + comments.length}</span>
        </Button>

        {/* Translate + Save to word bank (right side) */}
        <Button
          variant="ghost" size="sm"
          onClick={() => post.translation && setShowTranslation(!showTranslation)}
          disabled={!post.translation}
          className={cn(
            "flex items-center gap-1.5 h-10 px-3 rounded-full transition-colors ml-auto",
            !post.translation
              ? "text-muted-foreground/30 cursor-not-allowed"
              : showTranslation
                ? "text-primary bg-[#9973CE15]"
                : "text-muted-foreground hover:bg-[#9973CE15] hover:text-primary"
          )}
          title={post.translation ? "Translate" : "No translation available"}
        >
          <Languages className="h-5 w-5" />
        </Button>

        {/* Save to word bank */}
        <button
          onClick={handleSave}
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-95",
            isSaved
              ? "bg-amber-100 dark:bg-amber-900/20 text-amber-500"
              : "text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:text-amber-500"
          )}
          title="Save to word bank"
        >
          <Star className={cn("h-5 w-5 transition-all", isSaved ? "fill-amber-400 text-amber-500" : "")} />
        </button>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-2 text-sm animate-in fade-in duration-200">
          <span className="text-destructive font-medium">Delete this post?</span>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded">
              Cancel
            </button>
            <button onClick={() => { onDelete?.(post.id); setConfirmDelete(false); }} className="bg-destructive text-destructive-foreground text-xs px-3 py-1 rounded-lg font-medium">
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Saved confirmation */}
      {isSaved && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 animate-in fade-in duration-200">
          <Star className="h-3 w-3 fill-current" />
          <span>Saved to word bank</span>
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div className="mt-4 space-y-3 border-t border-border pt-4 animate-fade-in">
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {comment.avatar}
                </div>
                <div className="flex-1 rounded-xl bg-muted/50 px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{comment.author}</span>
                    <span className="text-xs text-muted-foreground">{comment.time}</span>
                  </div>
                  <p className="text-sm text-foreground">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-coral-light text-xs font-semibold text-primary-foreground">
              U
            </div>
            <div className="flex flex-1 gap-2">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                placeholder="Write a comment..."
                className="flex-1 rounded-full bg-muted px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim()} className="h-8 w-8 rounded-full">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default PostCard;
