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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));
          const isScanner = item.to === "/scanner";

          if (isScanner) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 rounded-xl transition-all duration-200",
                  "active:scale-95"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center h-12 w-12 rounded-full -mt-6 shadow-lg transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/90 text-primary-foreground"
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
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 rounded-xl transition-all duration-200",
                "active:scale-95 active:bg-muted/50",
                isActive && "text-primary"
              )}
            >
              <item.icon
                className={cn(
                  "h-6 w-6 transition-all duration-200",
                  isActive ? "stroke-[2.5px]" : "stroke-[1.75px] text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
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
