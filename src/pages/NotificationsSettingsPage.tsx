import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Calendar, Heart, Loader2, MessageSquare, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pushApi } from "@/services/api/push";
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

const isPushSupported = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

const getNotificationPermission = (): NotificationPermission | "unsupported" => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

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
  const [pushSupported] = useState(isPushSupported);
  const [pushPermission, setPushPermission] = useState(getNotificationPermission);
  const [browserSubscribed, setBrowserSubscribed] = useState<boolean | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["user-settings"],
    queryFn: usersApi.getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: usersApi.updateSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(["user-settings"], updated);
      setOptimisticPrefs(null);
      toast.success("Notification settings saved");
    },
    onError: () => {
      setOptimisticPrefs(null);
    },
    onSettled: () => {
      setSavingKey(null);
    },
  });

  const prefs = settingsQuery.data?.notificationPrefs;
  const visiblePrefs = optimisticPrefs ?? prefs;
  const isSaving = updateMutation.isPending || savingKey !== null;

  useEffect(() => {
    if (!pushSupported) {
      setBrowserSubscribed(false);
      return;
    }

    let cancelled = false;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) {
          setBrowserSubscribed(Boolean(subscription));
          setPushPermission(getNotificationPermission());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBrowserSubscribed(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pushSupported]);

  const enableBrowserPush = async () => {
    if (!pushSupported) {
      throw new Error("Push notifications are not supported by this browser");
    }

    const availability = await pushApi.getVapidPublicKey();
    if (!availability.enabled || !availability.publicKey) {
      throw new Error("Browser push is not configured on the server");
    }

    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    setPushPermission(permission);

    if (permission !== "granted") {
      throw new Error("Notification permission was not granted");
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(availability.publicKey),
      });
    }

    await pushApi.saveSubscription(subscription);
    setBrowserSubscribed(true);
  };

  const disableBrowserPush = async () => {
    if (!pushSupported) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      try {
        await pushApi.deleteSubscription(subscription.endpoint);
      } finally {
        await subscription.unsubscribe();
      }
    }
    setBrowserSubscribed(false);
  };

  const updatePreference = async (key: NotificationPrefKey, nextValue: boolean) => {
    if (!settingsQuery.data || !visiblePrefs || isSaving) return;

    const nextPrefs: NotificationPrefs = {
      ...visiblePrefs,
      [key]: nextValue,
    };

    setSavingKey(key);

    try {
      if (key === "pushEnabled") {
        if (nextValue) {
          await enableBrowserPush();
        } else {
          await disableBrowserPush();
        }
      }

      setOptimisticPrefs(nextPrefs);
      await updateMutation.mutateAsync({
        notificationPrefs: nextPrefs,
      });
    } catch (error) {
      setOptimisticPrefs(null);
      setSavingKey(null);
      toast.error(error instanceof Error ? error.message : "Failed to save notification settings");
    }
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
              const isPushOption = option.key === "pushEnabled";
              const checked = isPushOption
                ? Boolean(visiblePrefs.pushEnabled && browserSubscribed)
                : visiblePrefs[option.key];
              const disabled = isSaving || (isPushOption && !pushSupported);
              const description = isPushOption
                ? !pushSupported
                  ? "This browser does not support web push."
                  : pushPermission === "denied"
                    ? "Notifications are blocked in your browser settings."
                    : browserSubscribed
                      ? "This device is subscribed to browser alerts."
                      : "Subscribe this device to browser alerts."
                : option.description;

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
                      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {optionSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Toggle
                      checked={checked}
                      disabled={disabled}
                      label={option.title}
                      onClick={() => updatePreference(option.key, !checked)}
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
