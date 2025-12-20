import { MapPin, Calendar, Edit2, Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { UserLanguage } from "@/types";

const userLanguages: UserLanguage[] = [
  { code: "en", name: "English", flag: "🇬🇧", level: "Native", isLearning: false },
  { code: "es", name: "Spanish", flag: "🇪🇸", level: "B2", isLearning: true },
  { code: "ja", name: "Japanese", flag: "🇯🇵", level: "A2", isLearning: true },
];

const stats = [
  { label: "Words Learned", value: "847" },
  { label: "Posts", value: "24" },
  { label: "Following", value: "156" },
  { label: "Followers", value: "89" },
];

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Profile header */}
      <div className="mb-6 text-center">
        <div className="relative mx-auto mb-4 w-fit">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-coral-light text-3xl font-bold text-primary-foreground">
            JD
          </div>
          <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted hover:bg-muted/80 transition-colors">
            <Edit2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <h1 className="text-xl font-bold text-foreground">John Doe</h1>
        <p className="text-muted-foreground">@johndoe</p>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>New York, USA</span>
        </div>
        <p className="mt-3 text-sm text-foreground/80 max-w-sm mx-auto">
          Language enthusiast exploring the world through words. Currently focused on Japanese and Spanish!
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Languages */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Languages</h2>
          <button className="text-sm font-medium text-primary hover:underline">Edit</button>
        </div>
        <div className="space-y-2">
          {userLanguages.map((lang) => (
            <div
              key={lang.code}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <div>
                  <p className="font-medium text-foreground">{lang.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang.isLearning ? "Learning" : "Native"}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {lang.level}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section>
        <Link
          to="/settings"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:shadow-soft"
        >
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-foreground">Settings</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </section>
    </div>
  );
}
