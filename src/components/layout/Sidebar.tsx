import { NavLink, useLocation } from "react-router-dom";
import { MapPin, Compass, Camera, MessageSquare, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

const mainNavItems: NavItem[] = [
  { to: "/explore",  icon: MapPin,        label: "Explore"  },
  { to: "/",         icon: Compass,       label: "Feed"     },
  { to: "/scanner",  icon: Camera,        label: "Scan"     },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/profile",  icon: User,          label: "Profile"  },
];

const secondaryNavItems: NavItem[] = [
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <aside
      className="hidden lg:flex h-screen w-64 flex-col"
      style={{ background: '#FAF8F8', borderRight: '1px solid #9973CE22' }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6"
        style={{ borderBottom: '1px solid #9973CE22' }}>
        <img src="/locale-logo.png" alt="Locale" className="h-9 w-9 object-contain" />
        <span className="text-xl font-black" style={{ color: '#18112C', fontFamily: 'Lexend, sans-serif' }}>
          Locale
        </span>
      </div>

      {/* Nav */}
      <nav className="mt-4 flex-1 space-y-1 px-3" aria-label="Main">
        {mainNavItems.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9973CE]"
              )}
              style={{
                background: active ? '#9973CE1A' : 'transparent',
                color:      active ? '#9973CE'  : '#18112C',
              }}
            >
              <item.icon className={cn("h-5 w-5")}
                style={{ strokeWidth: active ? 2.5 : 1.75, color: active ? '#9973CE' : '#18112C' }} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Secondary */}
      <div className="mt-auto px-3 py-4" style={{ borderTop: '1px solid #9973CE22' }}>
        {secondaryNavItems.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink key={item.to} to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9973CE]"
              )}
              style={{ color: active ? '#9973CE' : '#6B6480' }}>
              <item.icon className="h-5 w-5" style={{ strokeWidth: 1.75 }} />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
}
