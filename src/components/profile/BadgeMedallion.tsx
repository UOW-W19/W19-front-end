import { BookOpen, Lock, MapPin, MessageCircle, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BadgeDefinition, BadgeIcon } from "@/data/badges";

type BadgeMedallionProps = {
  badge: Pick<BadgeDefinition, "icon" | "name" | "unlocked">;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const iconMap: Record<BadgeIcon, typeof Sparkles> = {
  sparkles: Sparkles,
  message: MessageCircle,
  book: BookOpen,
  users: Users,
  map: MapPin,
};

const sizeClasses = {
  sm: {
    outer: "h-16 w-16 p-1",
    inner: "h-14 w-14",
    icon: "h-7 w-7",
    lock: "h-5 w-5",
    lockIcon: "h-3 w-3",
  },
  md: {
    outer: "h-20 w-20 p-1.5",
    inner: "h-16 w-16",
    icon: "h-9 w-9",
    lock: "h-6 w-6",
    lockIcon: "h-3.5 w-3.5",
  },
  lg: {
    outer: "h-28 w-28 p-2",
    inner: "h-24 w-24",
    icon: "h-12 w-12",
    lock: "h-7 w-7",
    lockIcon: "h-4 w-4",
  },
};

export function BadgeMedallion({ badge, size = "md", className }: BadgeMedallionProps) {
  const Icon = iconMap[badge.icon];
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full shadow-sm",
        sizes.outer,
        badge.unlocked
          ? "bg-gradient-to-br from-coral via-orange-raw to-lime shadow-coral/20"
          : "bg-gradient-to-br from-muted-foreground/25 via-muted to-muted-foreground/20",
        className
      )}
      aria-label={badge.name}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full border",
          sizes.inner,
          badge.unlocked
            ? "border-white/50 bg-gradient-to-br from-orange-raw/90 via-coral to-purple text-white"
            : "border-muted-foreground/20 bg-muted text-muted-foreground"
        )}
      >
        <Icon
          className={cn(
            sizes.icon,
            badge.unlocked ? "drop-shadow-sm" : "opacity-45"
          )}
          strokeWidth={badge.unlocked ? 2.4 : 2}
        />
      </div>

      {badge.unlocked && (
        <span className="absolute -right-0.5 top-1 h-3 w-3 rounded-full border-2 border-card bg-lime" />
      )}

      {!badge.unlocked && (
        <span
          className={cn(
            "absolute bottom-0 right-0 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm",
            sizes.lock
          )}
          aria-hidden="true"
        >
          <Lock className={sizes.lockIcon} />
        </span>
      )}
    </div>
  );
}

export default BadgeMedallion;
