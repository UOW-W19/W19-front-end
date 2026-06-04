import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";

const routeTitles: Record<string, string> = {
  "/": "Feed",
  "/explore": "Explore",
  "/messages": "Messages",
  "/learn": "Learn",
  "/profile": "Profile",
  "/settings": "Settings",
  "/settings/notifications": "Notifications",
  "/install": "Install App",
  "/notifications": "Notifications",
  "/admin": "Admin",
};

export function AppLayout() {
  const location = useLocation();
  const title = routeTitles[location.pathname] || "Locale";

  return (
    <div className="flex h-dvh min-h-dvh w-full overflow-hidden bg-background">
      {/* Desktop sidebar - hidden on mobile/tablet */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 flex-col min-w-0">
        <Header title={title} />

        <main className="relative min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Mobile/tablet bottom navigation */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
