import { useState, useEffect, useRef } from "react";
import { MapPin, Check, X, Loader2, Trash2, Settings, Pencil, Award, Crown, BookOpen, Users, Camera } from "lucide-react";
import { useAuth } from "@/contexts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { usersApi } from "@/services/api/users";
import { languagesApi } from "@/services/api/languages";
import { postsApi } from "@/services/api/posts";
import { AvatarPickerModal } from "@/components/profile/AvatarPickerModal";
import { PostCard } from "@/components/feed/PostCard";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/api";
import type { Post } from "@/types";

type ProficiencyLevel = "NATIVE" | "ADVANCED" | "INTERMEDIATE" | "BEGINNER";

interface LanguageEntry {
  code: string;
  name: string;
  flagEmoji: string;
  proficiency: ProficiencyLevel;
  isLearning: boolean;
}

const PROFICIENCY_OPTIONS: { value: ProficiencyLevel; label: string }[] = [
  { value: "NATIVE", label: "Native" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "BEGINNER", label: "Beginner" },
];

const initialsFor = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

const formatPostDate = (value: string) =>
  new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: user?.location || "",
  });

  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [editLanguages, setEditLanguages] = useState<LanguageEntry[]>([]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");

  const [showFriends, setShowFriends] = useState(false);
  const [friendsTab, setFriendsTab] = useState<"friends" | "requests">("friends");
  const postsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    languagesApi.getLanguages().then(setAvailableLanguages).catch(console.error);
  }, []);

  useEffect(() => {
    if (!user) return;
    setIsLoadingPosts(true);
    usersApi
      .getUserPosts(user.id)
      .then(({ posts: apiPosts }) => {
        const adapted: Post[] = apiPosts.map((p) => ({
          id: p.id,
          author: {
            id: p.author.id,
            name: p.author.displayName,
            avatar: initialsFor(p.author.displayName),
            avatarUrl: p.author.avatarUrl,
            language: p.author.language ?? "",
            flag: p.author.flagEmoji ?? "",
            location: p.author.location,
            learningLanguages: p.author.learningLanguages ?? [],
          },
          content: p.content,
          originalLanguage: p.originalLanguage ?? "en",
          translation: p.translation ?? "",
          location: p.location ?? "",
          distance: p.distance ?? "",
          image: p.imageUrl,
          imageUrls: p.imageUrls,
          reactions: p.reactions,
          time: formatPostDate(p.createdAt),
          isLiked: p.userReaction != null,
          isSaved: p.isSaved ?? false,
        }));
        setPosts(adapted);
      })
      .catch(console.error)
      .finally(() => setIsLoadingPosts(false));
  }, [user?.id]);

  useEffect(() => {
    if (activeTab !== "saved" || savedPosts.length > 0) return;
    setIsLoadingSaved(true);
    postsApi.getSavedPosts(0)
      .then(({ posts: apiPosts }) => {
        const adapted: Post[] = apiPosts.map((p) => ({
          id: p.id,
          author: {
            id: p.author.id,
            name: p.author.displayName,
            avatar: initialsFor(p.author.displayName),
            avatarUrl: p.author.avatarUrl,
            language: p.author.language ?? "",
            flag: p.author.flagEmoji ?? "",
            location: p.author.location,
            learningLanguages: p.author.learningLanguages ?? [],
          },
          content: p.content,
          originalLanguage: p.originalLanguage ?? "en",
          translation: p.translation ?? "",
          location: p.location ?? "",
          distance: p.distance ?? "",
          image: p.imageUrl,
          imageUrls: p.imageUrls,
          reactions: p.reactions,
          time: formatPostDate(p.createdAt),
          isLiked: p.userReaction != null,
          isSaved: p.isSaved ?? true,
        }));
        setSavedPosts(adapted);
      })
      .catch(console.error)
      .finally(() => setIsLoadingSaved(false));
  }, [activeTab, savedPosts.length]);

  const handleEdit = () => {
    setEditForm({
      displayName: user?.displayName || "",
      bio: user?.bio || "",
      location: user?.location || "",
    });
    setEditLanguages(
      (user?.languages || []).map((l) => ({
        code: l.code,
        name: l.name,
        flagEmoji: l.flagEmoji,
        proficiency: l.proficiency as ProficiencyLevel,
        isLearning: l.isLearning,
      }))
    );
    setIsEditing(true);
  };

  const handleCancel = () => setIsEditing(false);

  const handleAvatarSave = async (file: File) => {
    try {
      await updateProfile({ avatar: file });
      toast.success("Profile picture updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload photo");
      throw error;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await usersApi.updateLanguages(
        editLanguages.map((l) => ({ code: l.code, proficiency: l.proficiency, isLearning: l.isLearning }))
      );
      await updateProfile({ displayName: editForm.displayName, bio: editForm.bio, location: editForm.location });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to save profile changes");
    } finally {
      setIsSaving(false);
    }
  };

  const addLanguage = (lang: Language) => {
    if (editLanguages.find((l) => l.code === lang.code)) return;
    setEditLanguages((prev) => [
      ...prev,
      { code: lang.code, name: lang.name, flagEmoji: (lang as unknown as { flag?: string }).flag ?? "🏳️", proficiency: "BEGINNER", isLearning: true },
    ]);
  };

  const removeLanguage = (code: string) => setEditLanguages((prev) => prev.filter((l) => l.code !== code));

  const updateLanguageField = (code: string, field: "proficiency" | "isLearning", value: ProficiencyLevel | boolean) => {
    setEditLanguages((prev) => prev.map((l) => (l.code === code ? { ...l, [field]: value } : l)));
  };

  const unselectedLanguages = availableLanguages.filter((l) => !editLanguages.find((el) => el.code === l.code));

  const getInitials = initialsFor;

  const handle = user?.email.split("@")[0] ?? "";

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-2xl">

      {/* ── Hero ── */}
      {/* Outer div allows the location pill to overflow the bottom edge */}
      <div className="relative h-56">
        {/* Inner div clips the image/gradient */}
        <div
          className="absolute inset-0 overflow-hidden cursor-pointer"
          onClick={() => setIsAvatarModalOpen(true)}
        >
          {user.avatarUrl ? (
            <>
              <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-8xl font-black text-white/20 select-none">{getInitials(user.displayName)}</span>
            </div>
          )}
        </div>

        {/* @username overlay */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <p className="text-white text-2xl font-black drop-shadow-lg tracking-tight">@{handle}</p>
        </div>

        {/* Settings icon */}
        <Link
          to="/settings"
          className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-black/30 transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5 text-white" />
        </Link>

        {/* Location pill — overlaps bottom edge */}
        {user.location && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-card rounded-full px-4 py-2 shadow-md flex items-center gap-2 text-sm whitespace-nowrap border border-border z-10">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground font-medium">{user.location}</span>
          </div>
        )}
      </div>

      <AvatarPickerModal
        open={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        user={user}
        onSave={handleAvatarSave}
      />

      {/* ── Name + bio ── */}
      <div className={cn("text-center px-4 pb-2", user.location ? "pt-10" : "pt-5")}>
        <h1 className="text-lg font-bold text-foreground">{user.displayName}</h1>
        {user.bio && <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">{user.bio}</p>}
      </div>

      {isEditing ? (

        /* ── Edit form ── */
        <div className="px-4 pt-2 space-y-4 max-w-md mx-auto">

          {/* Profile picture */}
          <div className="flex flex-col items-center gap-3 py-2">
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              className="relative group"
              aria-label="Change profile photo"
            >
              {/* Avatar preview */}
              <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-border shadow-sm">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <span className="text-3xl font-black text-white/40 select-none">{getInitials(user.displayName)}</span>
                  </div>
                )}
              </div>
              {/* Camera overlay on hover/tap */}
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                <Camera className="h-6 w-6 text-white" />
              </div>
              {/* Camera badge */}
              <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center border-2 border-card shadow-sm">
                <Camera className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </button>
            <p className="text-sm text-muted-foreground">Tap to change photo</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">Basic Info</h3>
            <input
              type="text"
              value={editForm.displayName}
              onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
              placeholder="Display name"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="Location"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              placeholder="Write a short bio..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">Languages</h3>
            {editLanguages.map((lang) => (
              <div key={lang.code} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                <span className="text-xl shrink-0">{lang.flagEmoji || "🏳️"}</span>
                <span className="font-medium text-sm text-foreground flex-1 truncate">{lang.name}</span>
                <select
                  value={lang.proficiency}
                  onChange={(e) => updateLanguageField(lang.code, "proficiency", e.target.value as ProficiencyLevel)}
                  className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {PROFICIENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lang.isLearning}
                    onChange={(e) => updateLanguageField(lang.code, "isLearning", e.target.checked)}
                    className="accent-primary"
                  />
                  Learning
                </label>
                <button onClick={() => removeLanguage(lang.code)} className="text-destructive hover:text-destructive/80 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {unselectedLanguages.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  const lang = availableLanguages.find((l) => l.code === e.target.value);
                  if (lang) addLanguage(lang);
                  e.target.value = "";
                }}
                className="w-full rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="" disabled>Add a language…</option>
                {unselectedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {(lang as unknown as { flag?: string }).flag ?? ""} {lang.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2 pt-1 pb-4">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving} className="flex-1">
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Save Changes
            </Button>
          </div>
        </div>

      ) : (

        /* ── View mode ── */
        <div className="px-4">

          {/* Stats row */}
          <div className="flex items-center justify-evenly py-4 mb-5">
            <button
              onClick={() => postsRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="text-center active:scale-95 transition-transform"
            >
              <p className="text-xl font-bold text-foreground">{user.postsCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </button>
            <div className="h-8 w-px bg-border" />
            <button
              onClick={() => setShowFriends((s) => !s)}
              className="text-center active:scale-95 transition-transform"
            >
              <p className="text-xl font-bold text-foreground">{user.followersCount ?? 0}</p>
              <p className={cn("text-xs font-medium transition-colors", showFriends ? "text-primary" : "text-muted-foreground")}>
                Friends
              </p>
            </button>
            <div className="h-8 w-px bg-border" />
            <button onClick={handleEdit} className="text-center group">
              <div className="flex justify-center mb-1">
                <Pencil className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground">Edit</p>
            </button>
          </div>

          {/* Friends / Requests panel */}
          {showFriends && (
            <div className="mb-5 rounded-2xl border border-border bg-card overflow-hidden animate-scale-in">
              {/* Tabs */}
              <div className="flex border-b border-border">
                {(["friends", "requests"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFriendsTab(tab)}
                    className={cn(
                      "flex-1 py-3 text-sm font-medium capitalize transition-colors",
                      friendsTab === tab
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === "friends" ? `Friends${user.followersCount ? ` (${user.followersCount})` : ""}` : "Requests"}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-4">
                {friendsTab === "friends" ? (
                  user.followersCount && user.followersCount > 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-4">
                      {user.followersCount} {user.followersCount === 1 ? "friend" : "friends"}
                    </p>
                  ) : (
                    <div className="text-center py-6">
                      <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No friends yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Connect with people in the Feed!</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-6">
                    <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No pending requests</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2×2 tiles */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Badges */}
            <button className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 text-left hover:bg-muted/30 active:scale-95 transition-all">
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#BDE6FF' }}
              >
                <Award className="h-5 w-5" style={{ fill: '#33B1FF', color: '#2391D4', stroke: '#2391D4' }} />
              </div>
              <span className="font-semibold text-sm text-foreground leading-snug">Badges</span>
            </button>

            {/* Word Bank */}
            <Link to="/learn" className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 hover:bg-muted/30 active:scale-95 transition-all">
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#D088B8' }}
              >
                <BookOpen className="h-5 w-5" style={{ fill: '#E7126B', color: '#B5004C', stroke: '#B5004C' }} />
              </div>
              <span className="font-semibold text-sm text-foreground leading-snug">Word Bank</span>
            </Link>

            {/* Meetups */}
            <Link to="/explore#upcoming-meetups" className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 hover:bg-muted/30 active:scale-95 transition-all">
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#F3F898' }}
              >
                <Users className="h-5 w-5" style={{ fill: '#CDDD01', color: '#99A403', stroke: '#99A403' }} />
              </div>
              <span className="font-semibold text-sm text-foreground leading-snug">Meetups</span>
            </Link>

            {/* Upgrade */}
            <Link to="/scanner?step=subscribe" className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 hover:bg-muted/30 active:scale-95 transition-all">
              <div className="h-11 w-11 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Crown className="h-5 w-5 fill-amber-400 text-amber-500" />
              </div>
              <span className="font-semibold text-sm text-foreground leading-snug">Upgrade</span>
            </Link>
          </div>

          {/* Languages */}
          <section className="mb-6">
            <h2 className="font-semibold text-foreground mb-3">Languages</h2>
            <div className="space-y-2">
              {(user.languages || []).map((lang) => (
                <div key={lang.code} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
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
              {(!user.languages || user.languages.length === 0) && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No languages added yet. Tap <strong>Edit</strong> to add some.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section ref={postsRef} className="mb-4">
            <div className="mb-4 flex border-b border-border">
              {(["posts", "saved"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 border-b-2 py-3 text-sm font-medium capitalize transition-colors",
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "posts" && (
              isLoadingPosts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">No posts yet.</p>
                </div>
              )
            )}

            {activeTab === "saved" && (
              isLoadingSaved ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : savedPosts.length > 0 ? (
                <div className="space-y-4">
                  {savedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">No saved posts yet.</p>
                </div>
              )
            )}
          </section>

        </div>
      )}
    </div>
  );
}
