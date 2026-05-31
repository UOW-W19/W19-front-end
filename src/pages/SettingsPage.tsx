import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Sun,
  MapPin,
  Loader2,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts";
import { usersApi } from "@/services/api/users";
import type { LocationVisibility } from "@/types/api";

const settingsSections = [
  {
    title: "Account",
    items: [
      { icon: User,       label: "Edit Profile",        to: "/settings/profile",        ready: false },
      { icon: Globe,      label: "Languages",            to: "/settings/languages",      ready: false },
      { icon: Shield,     label: "Privacy & Security",   to: "/settings/privacy",        ready: false },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: Download,   label: "Install App",           to: "/install",                 ready: true  },
      { icon: Bell,       label: "Notifications",        to: "/settings/notifications",  ready: true  },
      { icon: Palette,    label: "Appearance",           to: "/settings/appearance",     ready: false },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: HelpCircle, label: "Help & FAQ",           to: "/help",                    ready: false },
    ],
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [locationVisibility, setLocationVisibility] = useState<LocationVisibility>('PUBLIC');
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);

  // Load current privacy settings on mount
  useEffect(() => {
    usersApi.getPrivacySettings().then((s) => {
      setLocationVisibility(s.locationVisibility ?? 'PUBLIC');
    }).catch(() => {/* ignore */ });
  }, []);

  const handleVisibilityChange = async (value: LocationVisibility) => {
    setLocationVisibility(value);
    setIsSavingVisibility(true);
    try {
      await usersApi.updatePrivacySettings({ locationVisibility: value });
    } catch {
      // silently fail
    } finally {
      setIsSavingVisibility(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-2xl px-4 py-6">
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

      {/* Location Visibility control */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <MapPin className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Location Visibility</p>
            <p className="text-sm text-muted-foreground">Who can see you on the map</p>
          </div>
          {isSavingVisibility && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex rounded-xl border border-border overflow-hidden">
          {(['PUBLIC', 'FRIENDS_ONLY', 'NOBODY'] as LocationVisibility[]).map((opt) => (
            <button
              key={opt}
              onClick={() => handleVisibilityChange(opt)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${locationVisibility === opt
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                }`}
            >
              {opt === 'PUBLIC' ? 'Public' : opt === 'FRIENDS_ONLY' ? 'Friends' : 'Nobody'}
            </button>
          ))}
        </div>
      </div>


      {settingsSections.map((section) => (
        <section key={section.title} className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {section.title}
          </h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {section.items.map((item) => {
              const inner = (
                <>
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{item.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </>
              );
              return item.ready ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex w-full items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={item.label}
                  className="flex w-full items-center justify-between p-4 cursor-not-allowed opacity-50"
                >
                  {inner}
                </div>
              );
            })}
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
