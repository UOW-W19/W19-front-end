import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Compass,
  MessageCircle,
  BookOpen,
  User,
  Settings,
  Globe,
  Camera
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

const mainNavItems: NavItem[] = [
  { to: "/", icon: Home, label: "Feed" },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/scanner", icon: Camera, label: "Scan" },
  { to: "/messages", icon: MessageCircle, label: "Messages" },
  { to: "/learn", icon: BookOpen, label: "Learn" },
  { to: "/profile", icon: User, label: "Profile" },
];

const secondaryNavItems: NavItem[] = [
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <Globe className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold text-sidebar-foreground">Locale</span>
      </div>

      {/* Main navigation */}
      <nav className="mt-6 flex-1 space-y-1 px-3">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
              "hover:bg-sidebar-accent/50",
              isActive(item.to)
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground"
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5",
                isActive(item.to) ? "stroke-[2.5px]" : "stroke-[1.75px]"
              )}
            />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Secondary navigation */}
      <div className="mt-auto border-t border-sidebar-border px-3 py-4">
        {secondaryNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
              "hover:bg-sidebar-accent/50",
              isActive(item.to)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5 stroke-[1.75px]" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
