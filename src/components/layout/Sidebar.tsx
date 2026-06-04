import { NavLink, useLocation } from "react-router-dom";
import {
  Compass,
  MapPin,
  MessageCircle,
  BookOpen,
  User,
  Settings,
  Camera,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "@/contexts";
import { isAdminUser } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

const mainNavItems: NavItem[] = [
  { to: "/explore", icon: MapPin, label: "Explore" },
  { to: "/messages", icon: MessageCircle, label: "Messages" },
  { to: "/scanner", icon: Camera, label: "Scan" },
  { to: "/", icon: Compass, label: "Feed" },
  { to: "/learn", icon: BookOpen, label: "Learn" },
  { to: "/profile", icon: User, label: "Profile" },
];

const secondaryNavItems: NavItem[] = [
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const navItems = isAdminUser(user)
    ? [...mainNavItems, { to: "/admin", icon: ShieldCheck, label: "Admin" }]
    : mainNavItems;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden h-dvh min-h-dvh w-64 flex-col border-r border-purple/20 bg-card lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-purple/20 px-6">
        <img src="/locale-logo.svg" alt="Locale" className="h-9 w-9 object-contain" />
        <span className="text-xl font-black text-sidebar-foreground">Locale</span>
      </div>

      {/* Main navigation */}
      <nav className="mt-4 flex-1 space-y-1 px-3" aria-label="Main navigation">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                "hover:bg-purple/10 focus-visible:ring-purple",
                active ? "bg-purple/10 text-purple" : "text-sidebar-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon
                className={cn("h-5 w-5", active ? "stroke-[2.5px]" : "stroke-[1.75px]")}
              />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Secondary navigation */}
      <div className="mt-auto border-t border-purple/20 px-3 py-4">
        {secondaryNavItems.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                "hover:bg-purple/10 focus-visible:ring-purple",
                active ? "bg-purple/10 text-purple" : "text-muted-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="h-5 w-5 stroke-[1.75px]" />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
}
