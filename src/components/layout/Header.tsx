import { Bell, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts";
import { notificationsApi } from "@/services/api/notifications";

interface HeaderProps {
  title?: string;
}

export function Header({ title = "Feed" }: HeaderProps) {
  const { user } = useAuth();
  const { data: notificationSummary } = useQuery({
    queryKey: ["notifications-summary"],
    queryFn: notificationsApi.getSummary,
    enabled: Boolean(user),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
  const unreadNotifications = notificationSummary?.unreadNotifications ?? 0;
  const unreadLabel = unreadNotifications > 99 ? "99+" : String(unreadNotifications);

  return (
    <header className="sticky top-0 z-40 border-b border-purple/20 bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 lg:hidden" aria-label="Go to feed">
          <img src="/locale-logo.svg" alt="Locale" className="h-8 w-8 object-contain" />
          <span className="text-lg font-black text-foreground">Locale</span>
        </Link>

        {/* Desktop title */}
        <h1 className="hidden text-xl font-black text-foreground lg:block">
          {title}
        </h1>

        {/* Actions - touch-friendly sizes */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full active:scale-95" aria-label="Search">
            <Search className="h-5 w-5 text-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-full active:scale-95" asChild>
            <Link to="/notifications" aria-label="Notifications">
              <Bell className="h-5 w-5 text-foreground" />
              {unreadNotifications > 0 && (
                <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-white">
                  {unreadLabel}
                </span>
              )}
            </Link>
          </Button>

          {/* Mobile Profile Link */}
          <Link to="/profile" className="ml-1 flex touch-target items-center justify-center lg:hidden" aria-label="My profile">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple text-xs font-bold text-white shadow-sm">
              {user?.displayName ? (
                user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
              ) : (
                "?"
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
