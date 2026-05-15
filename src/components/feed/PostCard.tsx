import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Heart, MessageCircle, Share2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Post, Comment } from "@/types";

export interface PostCardProps {
  post: Post;
  onLikeToggle?: (postId: string, isLiked: boolean) => void;
}

export function PostCard({ post, onLikeToggle }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.reactions.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([
    { id: "1", author: "You", avatar: "U", text: "Great post!", time: "Just now" },
  ]);
  const [newComment, setNewComment] = useState("");
  const [showShareToast, setShowShareToast] = useState(false);

  const handleLike = () => {
    if (onLikeToggle) {
      onLikeToggle(post.id, isLiked);
    } else {
      if (isLiked) {
        setLikesCount((prev) => prev - 1);
      } else {
        setLikesCount((prev) => prev + 1);
      }
      setIsLiked(!isLiked);
    }
  };

  const handleComment = () => {
    setShowComments(!showComments);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`Check out this post from ${post.author.name}!`);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    } catch {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
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
    
    setComments((prev) => [...prev, comment]);
    setNewComment("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
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
        <span className="text-xs text-muted-foreground">{post.time}</span>
      </div>

      {/* Content */}
      <div className="mb-4 space-y-2">
        <p className="text-foreground leading-relaxed text-[15px]">{post.content}</p>
        <p className="text-sm text-muted-foreground italic">{post.translation}</p>
      </div>

      {/* Post Image */}
      {post.image && (
        <div className="mb-4 -mx-4 sm:mx-0 sm:rounded-xl overflow-hidden">
          <img 
            src={post.image} 
            alt="Post" 
            className="w-full h-auto max-h-80 object-cover"
          />
        </div>
      )}

      {/* Actions - larger touch targets */}
      <div className="flex items-center gap-1 border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={`flex items-center gap-1.5 h-10 px-3 rounded-full active:scale-95 transition-all duration-200 ${
            isLiked 
              ? "text-rose-500 active:text-rose-600" 
              : "text-muted-foreground active:text-primary"
          }`}
        >
          <Heart 
            className={`h-5 w-5 transition-transform duration-200 ${isLiked ? "fill-current scale-110" : ""}`} 
          />
          <span className="text-sm font-medium">{likesCount}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleComment}
          className={`flex items-center gap-1.5 h-10 px-3 rounded-full active:scale-95 transition-colors ${
            showComments 
              ? "text-primary" 
              : "text-muted-foreground active:text-primary"
          }`}
        >
          <MessageCircle className={`h-5 w-5 ${showComments ? "fill-primary/20" : ""}`} />
          <span className="text-sm font-medium">{post.reactions.comments + comments.length - 1}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="flex items-center gap-1.5 h-10 px-3 rounded-full text-muted-foreground active:text-primary active:scale-95 transition-all ml-auto"
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

      {/* Comments section */}
      {showComments && (
        <div className="mt-4 space-y-3 border-t border-border pt-4 animate-fade-in">
          {/* Existing comments */}
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

          {/* Add comment input */}
          <div className="flex gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-coral-light text-xs font-semibold text-primary-foreground">
              U
            </div>
            <div className="flex flex-1 gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Write a comment..."
                className="flex-1 rounded-full bg-muted px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button
                size="icon"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="h-8 w-8 rounded-full"
              >
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
