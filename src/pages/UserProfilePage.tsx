import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  UserPlus,
  Loader2,
  Lock,
  MessageCircle,
  MoreHorizontal,
  UserCheck,
  UserX,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts";
import { usersApi } from "@/services/api/users";
import { friendsApi } from "@/services/api/friends";
import { geocodingApi } from "@/services/api/geocoding";
import type { PublicUserProfile, UserPostsResponse } from "@/services/api/users";
import type { FriendRequestResponse } from "@/types/api";
import { PostCard } from "@/components/feed/PostCard";
import type { Post } from "@/types/post";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [posts, setPosts] = useState<UserPostsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendRequestResponse | null>(null);
  const [isFriendLoading, setIsFriendLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "activity">("posts");
  const [error, setError] = useState<string | null>(null);
  const [derivedLocation, setDerivedLocation] = useState<string | undefined>();

  const postsRef = useRef<HTMLElement>(null);

  const formatPostDate = (value: string) =>
    new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));

  // Redirect to own profile page if viewing self
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (isOwnProfile) {
      navigate("/profile", { replace: true });
      return;
    }

    const fetchProfile = async () => {
      if (!userId) return;
      setIsLoading(true);
      setError(null);
      try {
        const profileData = await usersApi.getProfile(userId);
        setProfile(profileData);

        try {
          const fs = await friendsApi.getFriendStatus(userId);
          setFriendStatus(fs);
        } catch {
          // not a blocker
        }

        if (profileData.privacySettings.showActivity) {
          setIsLoadingPosts(true);
          const postsData = await usersApi.getUserPosts(userId);
          setPosts(postsData);
          setIsLoadingPosts(false);
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setError("User not found");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId, isOwnProfile, navigate]);

  useEffect(() => {
    setDerivedLocation(undefined);

    if (!profile || profile.location?.trim()) return;
    if (typeof profile.latitude !== "number" || typeof profile.longitude !== "number") return;

    const controller = new AbortController();

    geocodingApi.getCurrentLocationLabel({
      latitude: profile.latitude,
      longitude: profile.longitude,
      signal: controller.signal,
    })
      .then(setDerivedLocation)
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        console.warn("[UserProfilePage] Failed to resolve profile location label:", error);
      });

    return () => controller.abort();
  }, [profile]);

  const loadMorePosts = async () => {
    if (!userId || !posts?.hasMore) return;
    setIsLoadingPosts(true);
    try {
      const morePosts = await usersApi.getUserPosts(userId, posts.nextCursor);
      setPosts({ ...morePosts, posts: [...posts.posts, ...morePosts.posts] });
    } catch (err) {
      console.error("Failed to load more posts:", err);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // ── Friend action handler ─────────────────────────────────────────────
  const handleFriendAction = async (action: "send" | "accept" | "reject" | "remove") => {
    if (!userId) return;
    setIsFriendLoading(true);
    try {
      if (action === "send") {
        const result = await friendsApi.sendFriendRequest(userId);
        setFriendStatus(result);
      } else if ((action === "accept" || action === "reject") && friendStatus) {
        const result = await friendsApi.respondToRequest(friendStatus.id, action);
        setFriendStatus(result);
      } else if (action === "remove") {
        await friendsApi.removeFriend(userId);
        setFriendStatus(null);
      }
    } catch (err) {
      console.error("Friend action failed:", err);
    } finally {
      setIsFriendLoading(false);
    }
  };

  // Derive friend button state
  const friendBtnState = (() => {
    if (friendStatus?.status === "ACCEPTED")
      return { label: "Friends", Icon: UserCheck, active: true };
    if (friendStatus?.status === "PENDING" && friendStatus.isSentByMe)
      return { label: "Requested", Icon: Clock, active: false };
    if (friendStatus?.status === "PENDING" && !friendStatus.isSentByMe)
      return { label: "Accept", Icon: UserCheck, active: false };
    return { label: "Add Friend", Icon: UserPlus, active: false };
  })();

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // ── Loading / error states ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted-foreground mb-4">{error || "User not found"}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const profileLocation = profile.location?.trim() || derivedLocation;

  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-2xl">

      {/* ── Hero ── */}
      <div className="relative h-56">
        {/* Clipping inner layer */}
        <div className="absolute inset-0 overflow-hidden">
          {profile.avatarUrl ? (
            <>
              <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-8xl font-black text-white/20 select-none">{getInitials(profile.displayName)}</span>
            </div>
          )}
        </div>

        {/* Back arrow */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-black/30 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>

        {/* More menu */}
        <div className="absolute top-4 right-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-black/30 transition-colors">
                <MoreHorizontal className="h-5 w-5 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Report User</DropdownMenuItem>
              <DropdownMenuItem>Block User</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Location pill — overlaps bottom edge */}
        {profileLocation && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-card rounded-full px-4 py-2 shadow-md flex items-center gap-2 text-sm whitespace-nowrap border border-border z-10">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground font-medium">{profileLocation}</span>
          </div>
        )}
      </div>

      {/* ── Name + bio ── */}
      <div className={cn("text-center px-4 pb-2", profileLocation ? "pt-10" : "pt-5")}>
        <h1 className="text-lg font-bold text-foreground">{profile.displayName}</h1>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
        {profile.bio && (
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">{profile.bio}</p>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="flex items-center justify-evenly py-4 mb-5 px-4">

        {/* Posts — scrolls to posts section */}
        <button
          onClick={() => postsRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="text-center active:scale-95 transition-transform"
        >
          <p className="text-xl font-bold text-foreground">{posts?.posts.length ?? profile.postsCount}</p>
          <p className="text-xs text-muted-foreground">Posts</p>
        </button>

        <div className="h-8 w-px bg-border" />

        {/* Add Friend / Friends / Requested */}
        {friendStatus?.status === "PENDING" && !friendStatus.isSentByMe ? (
          // Received a pending request → Accept + Decline side by side
          <div className="flex gap-2">
            <button
              onClick={() => handleFriendAction("accept")}
              disabled={isFriendLoading}
              className="flex flex-col items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isFriendLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#F4483F' }} />
              ) : (
                <UserCheck className="h-5 w-5" style={{ color: '#F4483F' }} />
              )}
              <p className="text-xs text-muted-foreground">Accept</p>
            </button>
            <button
              onClick={() => handleFriendAction("reject")}
              disabled={isFriendLoading}
              className="flex flex-col items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
            >
              <UserX className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Decline</p>
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (friendStatus?.status === "ACCEPTED") {
                handleFriendAction("remove");
              } else if (!friendStatus || friendStatus.status !== "PENDING") {
                handleFriendAction("send");
              }
            }}
            disabled={isFriendLoading}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
          >
            {isFriendLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#F4483F' }} />
            ) : (
              <friendBtnState.Icon className="h-5 w-5" style={{ color: '#F4483F' }} />
            )}
            <p className="text-xs text-muted-foreground">{friendBtnState.label}</p>
          </button>
        )}

        <div className="h-8 w-px bg-border" />

        {/* Message */}
        <Link
          to={`/messages?user=${userId}`}
          className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <MessageCircle className="h-5 w-5" style={{ color: '#F4483F' }} />
          <p className="text-xs text-muted-foreground">Message</p>
        </Link>
      </div>

      <div className="px-4">

        {/* Languages */}
        {profile.languages.length > 0 && (
          <section className="mb-6">
            <h2 className="font-semibold text-foreground mb-3">Languages</h2>
            <div className="space-y-2">
              {profile.languages.map((lang) => (
                <div
                  key={lang.code}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{lang.flagEmoji}</span>
                    <div>
                      <p className="font-medium text-foreground">{lang.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lang.proficiency === "NATIVE" ? "Native" : lang.isLearning ? "Learning" : lang.proficiency}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    lang.proficiency === "NATIVE" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-foreground"
                  )}>
                    {lang.proficiency === "NATIVE" ? "Native" : lang.proficiency}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Posts / Activity tabs */}
        <section ref={postsRef} className="mb-4">
          <div className="flex border-b border-border mb-4">
            <button
              onClick={() => setActiveTab("posts")}
              className={cn(
                "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "posts"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={cn(
                "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "activity"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Activity
            </button>
          </div>

          {activeTab === "posts" && (
            <>
              {profile.privacySettings.showActivity ? (
                <>
                  {isLoadingPosts && !posts ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : posts && posts.posts.length > 0 ? (
                    <div className="space-y-4">
                      {posts.posts.map((apiPost) => {
                        const post: Post = {
                          id: apiPost.id,
                          author: {
                            id: apiPost.author.id,
                            name: apiPost.author.displayName,
                            avatar: getInitials(apiPost.author.displayName),
                            avatarUrl: apiPost.author.avatarUrl,
                            language: apiPost.author.language || "en",
                            flag: apiPost.author.flagEmoji || "🌍",
                          },
                          content: apiPost.content,
                          originalLanguage: apiPost.originalLanguage ?? "en",
                          translation: "",
                          location: apiPost.location || "",
                          distance: apiPost.distance || "",
                          image: apiPost.imageUrl,
                          imageUrls: apiPost.imageUrls,
                          reactions: apiPost.reactions,
                          time: formatPostDate(apiPost.createdAt),
                          isLiked: apiPost.userReaction === "LIKE",
                          isSaved: apiPost.isSaved ?? false,
                        };
                        return <PostCard key={post.id} post={post} />;
                      })}

                      {posts.hasMore && (
                        <div className="text-center py-4">
                          <Button variant="outline" onClick={loadMorePosts} disabled={isLoadingPosts}>
                            {isLoadingPosts && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Load More
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No posts yet</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-muted/30 rounded-xl">
                  <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground font-medium">Posts are private</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This user has chosen to keep their posts private
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === "activity" && (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">Activity is private</p>
              <p className="text-sm text-muted-foreground mt-1">
                Recent activity and saved words are not visible
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
