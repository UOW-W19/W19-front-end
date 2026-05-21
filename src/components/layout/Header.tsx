import { Bell, Search, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  title?: string;
}

export function Header({ title = "Feed" }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header
      className="sticky top-0 z-40 pt-[env(safe-area-inset-top)]"
      style={{ background: '#FAF8F8', borderBottom: '1px solid #9973CE22' }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {/* Logo — mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <img
            src="/locale-logo.svg"
            alt="Locale"
            className="h-8 w-8 object-contain"
          />
          <span className="text-lg font-black" style={{ color: '#18112C', fontFamily: 'Lexend, sans-serif' }}>
            Locale
          </span>
        </div>

        {/* Desktop title */}
        <h1 className="hidden text-xl font-black text-foreground lg:block" style={{ color: '#18112C' }}>
          {title}
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon"
            className="h-11 w-11 rounded-full active:scale-95"
            aria-label="Search">
            <Search className="h-5 w-5" style={{ color: '#18112C' }} />
          </Button>

          <Button variant="ghost" size="icon" asChild
            className="h-11 w-11 rounded-full active:scale-95">
            <Link to="/friends" aria-label="Friends">
              <Users className="h-5 w-5" style={{ color: '#18112C' }} />
            </Link>
          </Button>

          <Button variant="ghost" size="icon"
            className="h-11 w-11 rounded-full relative active:scale-95"
            aria-label="Notifications">
            <Bell className="h-5 w-5" style={{ color: '#18112C' }} />
            {/* Coral notification dot */}
            <span
              className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full"
              style={{ background: '#F4483F' }}
              aria-hidden="true"
            />
          </Button>

          {/* Profile avatar */}
          <Link
            to="/profile"
            className="ml-1 lg:hidden touch-target flex items-center justify-center"
            aria-label="My profile"
          >
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
              style={{ background: '#9973CE' }}
            >
              {user?.displayName
                ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                : "?"}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
