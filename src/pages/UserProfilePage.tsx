import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  UserPlus,
  UserMinus,
  Loader2,
  Lock,
  MessageCircle,
  MoreHorizontal,
  UserCheck,
  UserX,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts";
import { usersApi } from "@/services/api/users";
import { friendsApi } from "@/services/api/friends";
import type { PublicUserProfile, UserPostsResponse } from "@/services/api/users";
import type { FriendRequestResponse } from "@/types/api";
import { PostCard } from "@/components/feed/PostCard";
import type { Post } from "@/types/post";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [posts, setPosts] = useState<UserPostsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendRequestResponse | null>(null);
  const [isFriendLoading, setIsFriendLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'activity'>('posts');
  const [error, setError] = useState<string | null>(null);

  // Redirect to own profile page if viewing self
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (isOwnProfile) {
      navigate('/profile', { replace: true });
      return;
    }

    const fetchProfile = async () => {
      if (!userId) return;

      setIsLoading(true);
      setError(null);

      try {
        const profileData = await usersApi.getProfile(userId);
        setProfile(profileData);
        setIsFollowing(profileData.isFollowing);

        // Load friend status
        try {
          const fs = await friendsApi.getFriendStatus(userId);
          setFriendStatus(fs);
        } catch {
          // not a blocker
        }

        // Fetch posts if activity is public
        if (profileData.privacySettings.showActivity) {
          setIsLoadingPosts(true);
          const postsData = await usersApi.getUserPosts(userId);
          setPosts(postsData);
          setIsLoadingPosts(false);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('User not found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId, isOwnProfile, navigate]);

  const handleFollow = async () => {
    if (!userId) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await usersApi.unfollowUser(userId);
        setIsFollowing(false);
        if (profile) {
          setProfile({ ...profile, followersCount: profile.followersCount - 1 });
        }
      } else {
        await usersApi.followUser(userId);
        setIsFollowing(true);
        if (profile) {
          setProfile({ ...profile, followersCount: profile.followersCount + 1 });
        }
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!userId || !posts?.hasMore) return;

    setIsLoadingPosts(true);
    try {
      const morePosts = await usersApi.getUserPosts(userId, posts.nextCursor);
      setPosts({
        ...morePosts,
        posts: [...posts.posts, ...morePosts.posts],
      });
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // ── Friend action handler ─────────────────────────────────────────────
  const handleFriendAction = async (action: 'send' | 'accept' | 'reject' | 'remove') => {
    if (!userId) return;
    setIsFriendLoading(true);
    try {
      if (action === 'send') {
        const result = await friendsApi.sendFriendRequest(userId);
        setFriendStatus(result);
      } else if ((action === 'accept' || action === 'reject') && friendStatus) {
        const result = await friendsApi.respondToRequest(friendStatus.id, action);
        setFriendStatus(result);
      } else if (action === 'remove') {
        await friendsApi.removeFriend(userId);
        setFriendStatus(null);
      }
    } catch (err) {
      console.error('Friend action failed:', err);
    } finally {
      setIsFriendLoading(false);
    }
  };

  // Button label/variant based on current friendship state
  const friendButtonConfig = (() => {
    if (!friendStatus) return { label: 'Add Friend', icon: UserPlus, variant: 'default' as const };
    if (friendStatus.status === 'ACCEPTED') return { label: 'Friends', icon: UserCheck, variant: 'outline' as const };
    if (friendStatus.status === 'PENDING' && friendStatus.isSentByMe) return { label: 'Requested', icon: Clock, variant: 'secondary' as const };
    return { label: 'Add Friend', icon: UserPlus, variant: 'default' as const };
  })();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
        <p className="text-muted-foreground mb-4">{error || 'User not found'}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const stats = [
    { label: "Posts", value: profile.postsCount },
    { label: "Following", value: profile.followingCount },
    { label: "Followers", value: profile.followersCount },
  ];

  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-2xl">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-semibold text-foreground">{profile.displayName}</h1>
          <p className="text-xs text-muted-foreground">@{profile.username}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Report User</DropdownMenuItem>
            <DropdownMenuItem>Block User</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-4 py-6">
        {/* Profile header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 w-fit">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-background"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-coral-light text-3xl font-bold text-primary-foreground ring-4 ring-background">
                {getInitials(profile.displayName)}
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-foreground">
            {profile.displayName}
          </h2>
          <p className="text-muted-foreground">@{profile.username}</p>

          {profile.location && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{profile.location}</span>
            </div>
          )}

          {profile.bio && (
            <p className="mt-3 text-sm text-foreground/80 max-w-sm mx-auto">
              {profile.bio}
            </p>
          )}

          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Joined {format(new Date(profile.createdAt), 'MMMM yyyy')}</span>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex justify-center gap-2 flex-wrap">
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              onClick={handleFollow}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : isFollowing ? (
                <UserMinus className="h-4 w-4 mr-1" />
              ) : (
                <UserPlus className="h-4 w-4 mr-1" />
              )}
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Button>

            {/* ── Add Friend button ── */}
            {friendStatus?.status === 'PENDING' && !friendStatus.isSentByMe ? (
              // Received pending request → show Accept & Decline
              <>
                <Button
                  size="sm"
                  disabled={isFriendLoading}
                  onClick={() => handleFriendAction('accept')}
                >
                  {isFriendLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1" />}
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFriendLoading}
                  onClick={() => handleFriendAction('reject')}
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              </>
            ) : friendStatus?.status === 'ACCEPTED' ? (
              // Already friends → show Remove Friend
              <Button
                variant="outline"
                size="sm"
                disabled={isFriendLoading}
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => handleFriendAction('remove')}
              >
                {isFriendLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserMinus className="h-4 w-4 mr-1" />}
                Remove Friend
              </Button>
            ) : (
              // No relationship or pending sent → single button
              <Button
                variant={friendButtonConfig.variant}
                size="sm"
                disabled={isFriendLoading}
                className={friendStatus?.status === 'PENDING' ? "cursor-default" : ""}
                onClick={() => {
                  if (!friendStatus) handleFriendAction('send');
                }}
              >
                {isFriendLoading && !friendStatus ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <friendButtonConfig.icon className="h-4 w-4 mr-1" />
                )}
                {friendButtonConfig.label}
              </Button>
            )}

            <Button variant="outline" size="sm" asChild>
              <Link to={`/messages?user=${userId}`}>
                <MessageCircle className="h-4 w-4 mr-1" />
                Message
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4 rounded-xl border border-border bg-card p-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Languages */}
        {profile.languages.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-3 font-semibold text-foreground">Languages</h3>
            <div className="space-y-2">
              {profile.languages.map((lang) => (
                <div
                  key={lang.code}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span className="text-xl shrink-0">{lang.flagEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{lang.name}</p>
                    <p className="text-xs text-muted-foreground">{lang.isLearning ? 'Learning' : 'Native'}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lang.proficiency === 'NATIVE'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground uppercase tracking-wide'
                    }`}>
                    {lang.proficiency === 'NATIVE' ? 'Native' : lang.proficiency.charAt(0) + lang.proficiency.slice(1).toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-4">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'posts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            Activity
          </button>
        </div>

        {/* Content based on privacy */}
        {activeTab === 'posts' && (
          <>
            {profile.privacySettings.showActivity ? (
              <div className="space-y-4">
                {posts?.posts.map((apiPost) => {
                  // Transform ApiPost to Post format for PostCard
                  const post: Post = {
                    id: apiPost.id,
                    author: {
                      id: apiPost.author.id,
                      name: apiPost.author.displayName,
                      avatar: apiPost.author.avatarUrl || "",
                      language: apiPost.author.language || "en",
                      flag: apiPost.author.flagEmoji || "🌍",
                    },
                    content: apiPost.content,
                    translation: "",
                    location: apiPost.location || "",
                    distance: apiPost.distance || "",
                    image: apiPost.imageUrl,
                    reactions: apiPost.reactions,
                    time: apiPost.createdAt,
                    isLiked: apiPost.userReaction === 'LIKE',
                  };
                  return <PostCard key={post.id} post={post} />;
                })}

                {posts?.hasMore && (
                  <div className="text-center py-4">
                    <Button
                      variant="outline"
                      onClick={loadMorePosts}
                      disabled={isLoadingPosts}
                    >
                      {isLoadingPosts ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Load More
                    </Button>
                  </div>
                )}

                {posts?.posts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No posts yet</p>
                  </div>
                )}
              </div>
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

        {activeTab === 'activity' && (
          <div className="text-center py-12 bg-muted/30 rounded-xl">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">Activity is private</p>
            <p className="text-sm text-muted-foreground mt-1">
              Recent activity and saved words are not visible
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
