import { NavLink, useLocation } from "react-router-dom";
import { Home, Compass, Camera, BookOpen, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

const navItems: NavItem[] = [
  { to: "/", icon: Home, label: "Feed" },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/scanner", icon: Camera, label: "Scan" },
  { to: "/messages", icon: MessageCircle, label: "Messages" },
  { to: "/learn", icon: BookOpen, label: "Learn" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-purple/20 bg-card/95 backdrop-blur-md" aria-label="Main navigation">
      <div className="mx-auto flex h-[72px] max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));
          const isScanner = item.to === "/scanner";

          if (isScanner) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-xl py-2 transition-all duration-200",
                  "active:scale-95"
                )}
              >
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full -mt-6 bg-purple text-white shadow-locale-md transition-all",
                  isActive ? "ring-4 ring-purple/20" : "opacity-95"
                )}>
                  <item.icon className="h-6 w-6 stroke-[2px]" />
                </div>
                <span className={cn(
                  "text-[11px] font-medium transition-colors -mt-1",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-xl py-2 transition-all duration-200",
                "active:scale-95"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  isActive ? "bg-purple text-white" : "text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive ? "stroke-[2.5px]" : "stroke-[1.75px]"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium transition-colors",
                  isActive ? "text-purple" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
