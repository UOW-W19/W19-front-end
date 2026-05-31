import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const getOnlineStatus = () =>
  typeof navigator === "undefined" ? true : navigator.onLine;

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(getOnlineStatus);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[120] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-xl border border-border bg-card px-3 py-2 shadow-locale-md">
      <div className="flex items-center gap-3">
        <WifiOff className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
          Offline - showing saved app data.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full"
          onClick={() => window.location.reload()}
          aria-label="Retry connection"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
