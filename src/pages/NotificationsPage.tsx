import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCheck,
  Heart,
  Loader2,
  MessageCircle,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/services/api/notifications";
import type { AppNotification, NotificationType } from "@/types/api";

type Filter = "all" | "unread";

const iconByType: Record<NotificationType, typeof Bell> = {
  FRIEND_REQUEST: UserPlus,
  FRIEND_ACCEPTED: Check,
  MESSAGE: MessageCircle,
  POST_LIKE: Heart,
  POST_COMMENT: MessageSquare,
  MEETUP_JOINED: Calendar,
  MEETUP_UPDATED: Calendar,
  MEETUP_REMINDER: Calendar,
  SAVED_WORD: BookOpen,
  SCAN_DETECTED_WORD: Camera,
};

function targetFor(notification: AppNotification) {
  const target = notification.targetUrl;
  if (!target) return undefined;
  if (target.startsWith("/users/")) return target.replace("/users/", "/user/");
  if (target.startsWith("/friends")) return "/friends";
  if (target.startsWith("/conversations/")) return "/messages";
  if (target.startsWith("/meetups/")) return "/explore";
  if (target.startsWith("/posts/")) return "/";
  if (target.startsWith("/saved-words/")) return "/learn";
  if (target.startsWith("/scan/history/")) return "/scanner";
  return target;
}

function NotificationRow({
  notification,
  onMarkRead,
  isUpdating,
}: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  isUpdating: boolean;
}) {
  const Icon = iconByType[notification.type] ?? Bell;
  const isUnread = !notification.readAt;
  const target = targetFor(notification);
  const content = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          isUnread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {notification.title}
          </p>
          {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
        {notification.body && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {notification.body}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors",
        isUnread && "border-primary/30 bg-primary/5"
      )}
    >
      {target ? (
        <Link to={target} className="min-w-0 flex-1">
          {content}
        </Link>
      ) : (
        content
      )}
      {isUnread && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full"
          disabled={isUpdating}
          onClick={() => onMarkRead(notification.id)}
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const unreadOnly = filter === "unread";

  const queryKey = useMemo(() => ["notifications", unreadOnly], [unreadOnly]);
  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => notificationsApi.getNotifications({ unreadOnly }),
    staleTime: 15_000,
  });

  const summary = useQuery({
    queryKey: ["notifications-summary"],
    queryFn: notificationsApi.getSummary,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const refreshNotifications = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications-summary"] }),
    ]);
  };

  const markRead = async (id: string) => {
    setUpdatingId(id);
    try {
      await notificationsApi.markRead(id);
      await refreshNotifications();
    } finally {
      setUpdatingId(null);
    }
  };

  const markAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      await refreshNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const notifications = data?.notifications ?? [];
  const unreadCount = summary.data?.unreadNotifications ?? 0;

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto pb-24 scrollbar-hide">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0 || isMarkingAll}
            onClick={markAllRead}
          >
            {isMarkingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Mark all read</span>
          </Button>
        </div>
      </div>

      <div className="border-b border-border px-4">
        <div className="flex">
          {(["all", "unread"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={cn(
                "flex-1 border-b-2 py-3 text-sm font-medium capitalize transition-colors",
                filter === option
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">No notifications</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadOnly ? "Unread notifications will appear here." : "New activity will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {isFetching && (
              <div className="flex justify-center py-1">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onMarkRead={markRead}
                isUpdating={updatingId === notification.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
