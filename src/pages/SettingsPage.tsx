import { useNavigate } from "react-router-dom";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Moon,
  Sun
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const settingsSections = [
  {
    title: "Account",
    items: [
      { icon: User, label: "Edit Profile", to: "/settings/profile" },
      { icon: Globe, label: "Languages", to: "/settings/languages" },
      { icon: Shield, label: "Privacy & Security", to: "/settings/privacy" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: Bell, label: "Notifications", to: "/settings/notifications" },
      { icon: Palette, label: "Appearance", to: "/settings/appearance" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: HelpCircle, label: "Help & FAQ", to: "/help" },
    ],
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* User info card */}
      {user && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-semibold">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{user.displayName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Theme toggle card */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Sun className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Appearance</p>
              <p className="text-sm text-muted-foreground">Light mode</p>
            </div>
          </div>
          <button className="rounded-full bg-muted p-2 hover:bg-muted/80 transition-colors">
            <Moon className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Settings sections */}
      {settingsSections.map((section) => (
        <section key={section.title} className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {section.title}
          </h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {section.items.map((item) => (
              <button
                key={item.label}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* Logout */}
      <button 
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="h-5 w-5" />
        <span className="font-medium">Log Out</span>
      </button>
    </div>
  );
}
