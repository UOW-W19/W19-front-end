import { NavLink, useLocation } from "react-router-dom";
import { MapPin, Compass, Plus, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Figma design: 5 icons — MapPin, Compass, + (scanner, raised purple circle), MessageSquare, User
// Active icon gets a purple filled circle background
// Scanner (+) is always elevated in a purple pill regardless of active state

const navItems = [
  { to: "/explore",  icon: MapPin,        label: "Explore"  },
  { to: "/",         icon: Compass,       label: "Feed"     },
  { to: "/scanner",  icon: Plus,          label: "Scan"     },  // centre elevated
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/profile",  icon: User,          label: "Profile"  },
];

export function BottomNav() {
  const location = useLocation();

  const isActive = (to: string) =>
    to === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(to);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{ background: '#FAF8F8', borderTop: '1px solid #9973CE22' }}
      aria-label="Main navigation"
    >
      <div className="flex h-[72px] items-center justify-around px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active    = isActive(item.to);
          const isScanner = item.to === "/scanner";

          if (isScanner) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center justify-center touch-target min-w-[48px] gap-0.5 active:scale-95 transition-transform"
              >
                {/* Always-purple elevated circle for scanner */}
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-full shadow-md -mt-5"
                  style={{ background: '#9973CE' }}
                  aria-hidden="true"
                >
                  <item.icon className="h-6 w-6 text-white stroke-[2.5px]" />
                </div>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center touch-target min-w-[48px] gap-0.5",
                "transition-transform active:scale-95"
              )}
            >
              {/* Icon — active gets purple circle background */}
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full transition-colors"
                )}
                style={{
                  background: active ? '#9973CE' : 'transparent',
                }}
                aria-hidden="true"
              >
                <item.icon
                  className={cn("h-6 w-6 transition-all")}
                  style={{
                    color:       active ? '#ffffff' : '#18112C',
                    strokeWidth: active ? 2.5 : 1.75,
                  }}
                />
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
