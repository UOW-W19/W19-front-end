import { Globe, Bell, Search, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  title?: string;
}

export function Header({ title = "Feed" }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Logo - always visible on mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-glow">
            <Globe className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">Locale</span>
        </div>

        {/* Desktop title */}
        <h1 className="hidden text-xl font-semibold text-foreground lg:block">
          {title}
        </h1>

        {/* Actions - touch-friendly sizes */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full active:scale-95">
            <Search className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 flex lg:hidden rounded-full relative active:scale-95" asChild>
            <Link to="/friends">
              <Users className="h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 flex rounded-full relative active:scale-95" asChild>
            <Link to="/friends" className="hidden lg:flex">
              <Users className="h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full relative active:scale-95">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" />
          </Button>

          {/* Mobile Profile Link */}
          <Link to="/profile" className="ml-1 lg:hidden">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-xs font-bold text-primary-foreground shadow-sm">
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
