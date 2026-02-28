import { useState } from "react";
import { Edit2, MapPin, Settings, Check, X, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";



export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: user?.location || "",
  });

  const handleEdit = () => {
    setEditForm({
      displayName: user?.displayName || "",
      bio: user?.bio || "",
      location: user?.location || "",
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const stats = [
    { label: "Posts", value: user?.postsCount || 0 },
    { label: "Following", value: user?.followingCount || 0 },
    { label: "Followers", value: user?.followersCount || 0 },
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
          <div className="space-y-3 max-w-sm mx-auto">
            <input
              type="text"
              value={editForm.displayName}
              onChange={(e) =>
                setEditForm({ ...editForm, displayName: e.target.value })
              }
              placeholder="Display name"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center justify-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={editForm.location}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
                placeholder="Location"
                className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        ) : (
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
          {user.languages?.map((lang) => (
            <div
              key={lang.code}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flagEmoji}</span>
                <div>
                  <p className="font-medium text-foreground">{lang.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang.proficiency === 'NATIVE' ? 'Native' : lang.isLearning ? 'Learning' : lang.proficiency}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${lang.proficiency === 'NATIVE'
                ? 'bg-primary/10 text-primary'
                : 'bg-accent/10 text-accent-foreground'
                }`}>
                {lang.proficiency === 'NATIVE' ? 'Native' : lang.proficiency}
              </span>
            </div>
          ))}
          {(!user.languages || user.languages.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No languages configured yet
            </p>
          )}
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="mb-3 font-semibold text-foreground">Quick Links</h2>
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-foreground">Settings</span>
        </Link>
      </section>
    </div>
  );
}
