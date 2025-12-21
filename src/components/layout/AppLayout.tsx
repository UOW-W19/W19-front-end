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
};

export function AppLayout() {
  const location = useLocation();
  const title = routeTitles[location.pathname] || "Locale";

  return (
    <div className="flex min-h-[100dvh] w-full bg-background overflow-x-hidden">
      {/* Desktop sidebar - hidden on mobile/tablet */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header title={title} />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile/tablet bottom navigation */}
      <BottomNav />
    </div>
  );
}
