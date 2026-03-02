import { useState, useEffect } from "react";
import { Edit2, MapPin, Check, X, Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { usersApi } from "@/services/api/users";
import { languagesApi } from "@/services/api/languages";
import { PostCard } from "@/components/feed/PostCard";
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

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Profile fields
  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: user?.location || "",
  });

  // Language editor state
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [editLanguages, setEditLanguages] = useState<LanguageEntry[]>([]);
  const [langSearch, setLangSearch] = useState("");

  // Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  // Load available languages once when component mounts
  useEffect(() => {
    languagesApi.getLanguages().then(setAvailableLanguages).catch(console.error);
  }, []);

  // Load current user's posts
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
            avatar: p.author.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2),
            language: p.author.language ?? "",
            flag: p.author.flagEmoji ?? "",
          },
          content: p.content,
          translation: p.translation ?? "",
          location: p.location ?? "",
          distance: p.distance ?? "",
          image: p.imageUrl,
          reactions: p.reactions,
          time: new Date(p.createdAt).toLocaleDateString(),
          isLiked: p.userReaction != null,
        }));
        setPosts(adapted);
      })
      .catch(console.error)
      .finally(() => setIsLoadingPosts(false));
  }, [user?.id]);

  const handleEdit = () => {
    setEditForm({
      displayName: user?.displayName || "",
      bio: user?.bio || "",
      location: user?.location || "",
    });
    // Pre-populate with current languages
    setEditLanguages(
      (user?.languages || []).map((l) => ({
        code: l.code,
        name: l.name,
        flagEmoji: l.flagEmoji,
        proficiency: l.proficiency as ProficiencyLevel,
        isLearning: l.isLearning,
      }))
    );
    setLangSearch("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save languages first
      await usersApi.updateLanguages(
        editLanguages.map((l) => ({
          code: l.code,
          proficiency: l.proficiency,
          isLearning: l.isLearning,
        }))
      );
      // Then save profile fields
      await updateProfile({
        displayName: editForm.displayName,
        bio: editForm.bio,
        location: editForm.location,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Language editor helpers
  const addLanguage = (lang: Language) => {
    if (editLanguages.find((l) => l.code === lang.code)) return;
    setEditLanguages((prev) => [
      ...prev,
      {
        code: lang.code,
        name: lang.name,
        flagEmoji: (lang as unknown as { flag?: string }).flag ?? "🏳️",
        proficiency: "BEGINNER",
        isLearning: true,
      },
    ]);
    setLangSearch("");
  };

  const removeLanguage = (code: string) => {
    setEditLanguages((prev) => prev.filter((l) => l.code !== code));
  };

  const updateLanguageField = (
    code: string,
    field: "proficiency" | "isLearning",
    value: ProficiencyLevel | boolean
  ) => {
    setEditLanguages((prev) =>
      prev.map((l) => (l.code === code ? { ...l, [field]: value } : l))
    );
  };

  const filteredAvailableLangs = langSearch.trim()
    ? availableLanguages.filter(
      (l) =>
        l.name.toLowerCase().includes(langSearch.toLowerCase()) &&
        !editLanguages.find((el) => el.code === l.code)
    )
    : [];

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const stats = [
    { label: "Posts", value: user?.postsCount ?? 0 },
    { label: "Following", value: user?.followingCount ?? 0 },
    { label: "Followers", value: user?.followersCount ?? 0 },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-2xl px-4 py-6">
      {/* Profile header */}
      <div className="mb-6 text-center">
        <div className="relative mx-auto mb-4 w-fit">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-3xl font-bold text-primary-foreground">
              {getInitials(user.displayName)}
            </div>
          )}
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted hover:bg-muted/80 transition-colors"
            >
              <Edit2 className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {isEditing ? (
          /* ---- EDIT MODE ---- */
          <div className="space-y-4 max-w-md mx-auto text-left">
            {/* Basic fields */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
                Basic Info
              </h3>
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) =>
                  setEditForm({ ...editForm, displayName: e.target.value })
                }
                placeholder="Display name"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm({ ...editForm, location: e.target.value })
                  }
                  placeholder="Location"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <textarea
                value={editForm.bio}
                onChange={(e) =>
                  setEditForm({ ...editForm, bio: e.target.value })
                }
                placeholder="Write a short bio..."
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Language editor */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
                Languages
              </h3>

              {/* Existing language entries */}
              {editLanguages.map((lang) => (
                <div
                  key={lang.code}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
                >
                  <span className="text-xl shrink-0">
                    {lang.flagEmoji || "🏳️"}
                  </span>
                  <span className="font-medium text-sm text-foreground flex-1 truncate">
                    {lang.name}
                  </span>
                  <select
                    value={lang.proficiency}
                    onChange={(e) =>
                      updateLanguageField(
                        lang.code,
                        "proficiency",
                        e.target.value as ProficiencyLevel
                      )
                    }
                    className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {PROFICIENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lang.isLearning}
                      onChange={(e) =>
                        updateLanguageField(
                          lang.code,
                          "isLearning",
                          e.target.checked
                        )
                      }
                      className="accent-primary"
                    />
                    Learning
                  </label>
                  <button
                    onClick={() => removeLanguage(lang.code)}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Add language search */}
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder="Add a language..."
                    className="flex-1 bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {filteredAvailableLangs.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                    {filteredAvailableLangs.slice(0, 8).map((lang) => (
                      <li key={lang.code}>
                        <button
                          type="button"
                          onClick={() => addLanguage(lang)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                        >
                          <span className="text-base">
                            {(lang as unknown as { flag?: string }).flag ?? "🏳️"}
                          </span>
                          <span>{lang.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          /* ---- VIEW MODE ---- */
          <>
            <h1 className="text-xl font-bold text-foreground">
              {user.displayName}
            </h1>
            <p className="text-muted-foreground">@{user.email.split("@")[0]}</p>
            {user.location && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{user.location}</span>
              </div>
            )}
            {user.bio && (
              <p className="mt-3 text-sm text-foreground/80 max-w-sm mx-auto">
                {user.bio}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="mt-4"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              Edit Profile
            </Button>
          </>
        )}
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
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Languages</h2>
        </div>
        <div className="space-y-2">
          {(user.languages || []).map((lang) => (
            <div
              key={lang.code}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flagEmoji}</span>
                <div>
                  <p className="font-medium text-foreground">{lang.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang.proficiency === "NATIVE"
                      ? "Native"
                      : lang.isLearning
                        ? "Learning"
                        : lang.proficiency}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${lang.proficiency === "NATIVE"
                  ? "bg-primary/10 text-primary"
                  : "bg-accent/10 text-accent-foreground"
                  }`}
              >
                {lang.proficiency === "NATIVE" ? "Native" : lang.proficiency}
              </span>
            </div>
          ))}
          {(!user.languages || user.languages.length === 0) && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No languages added yet. Click <strong>Edit Profile</strong> to add some.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Posts */}
      <section>
        <h2 className="mb-3 font-semibold text-foreground">Posts</h2>
        {isLoadingPosts ? (
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
        )}
      </section>
    </div>
  );
}
