import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Calendar, Heart, Loader2, MessageSquare, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usersApi } from "@/services/api/users";
import type { NotificationPrefs } from "@/types/api";

type NotificationPrefKey = keyof Pick<
  NotificationPrefs,
  "pushEnabled" | "likeNotifications" | "commentNotifications" | "meetupNotifications"
>;

const notificationOptions: Array<{
  key: NotificationPrefKey;
  title: string;
  description: string;
  icon: typeof Bell;
}> = [
  {
    key: "pushEnabled",
    title: "Push notifications",
    description: "Receive app alerts for activity that matters.",
    icon: Smartphone,
  },
  {
    key: "likeNotifications",
    title: "Post reactions",
    description: "Know when someone reacts to your posts.",
    icon: Heart,
  },
  {
    key: "commentNotifications",
    title: "Comments",
    description: "Know when someone comments on your posts.",
    icon: MessageSquare,
  },
  {
    key: "meetupNotifications",
    title: "Meetups",
    description: "Receive updates about meetup activity.",
    icon: Calendar,
  },
];

function Toggle({
  checked,
  disabled,
  label,
  onClick,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState<NotificationPrefKey | null>(null);
  const [optimisticPrefs, setOptimisticPrefs] = useState<NotificationPrefs | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["user-settings"],
    queryFn: usersApi.getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: usersApi.updateSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(["user-settings"], updated);
      setOptimisticPrefs(updated.notificationPrefs);
      toast.success("Notification settings saved");
    },
    onError: (error) => {
      setOptimisticPrefs(settingsQuery.data?.notificationPrefs ?? null);
      toast.error(error instanceof Error ? error.message : "Failed to save notification settings");
    },
    onSettled: () => {
      setSavingKey(null);
    },
  });

  const prefs = settingsQuery.data?.notificationPrefs;
  const visiblePrefs = optimisticPrefs ?? prefs;
  const isSaving = updateMutation.isPending;

  useEffect(() => {
    if (!isSaving) {
      setOptimisticPrefs(prefs ?? null);
    }
  }, [isSaving, prefs]);

  const updatePreference = (key: NotificationPrefKey) => {
    if (!settingsQuery.data || !visiblePrefs || isSaving) return;

    const nextPrefs: NotificationPrefs = {
      ...visiblePrefs,
      [key]: !visiblePrefs[key],
    };

    setSavingKey(key);
    setOptimisticPrefs(nextPrefs);
    updateMutation.mutate({
      notificationPrefs: nextPrefs,
    });
  };

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto pb-24 scrollbar-hide">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Back to settings">
            <Link to="/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">Manage notification preferences</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        {settingsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : settingsQuery.isError || !visiblePrefs ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium text-foreground">Could not load notification settings</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try again when your connection is available.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {notificationOptions.map((option) => {
              const Icon = option.icon;
              const optionSaving = savingKey === option.key && isSaving;

              return (
                <div
                  key={option.key}
                  className="flex items-center justify-between gap-4 border-b border-border p-4 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{option.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {optionSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Toggle
                      checked={visiblePrefs[option.key]}
                      disabled={isSaving}
                      label={option.title}
                      onClick={() => updatePreference(option.key)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
