import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  BADGE_CATEGORIES,
  BADGE_CATEGORY_LABELS,
  buildProfileBadges,
  type BadgeDefinition,
} from "@/data/badges";
import { cn } from "@/lib/utils";
import { BadgeMedallion } from "./BadgeMedallion";

type BadgesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  joinedAt?: string;
};

const formatAwardedDate = (value?: string) => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

export function BadgesSheet({ open, onOpenChange, joinedAt }: BadgesSheetProps) {
  const badges = useMemo(() => buildProfileBadges(joinedAt), [joinedAt]);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);

  const selectedBadge = badges.find((badge) => badge.id === selectedBadgeId) ?? badges[0];
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  const awardedDate = formatAwardedDate(selectedBadge?.awardedAt);

  useEffect(() => {
    if (open) {
      setSelectedBadgeId(badges.find((badge) => badge.unlocked)?.id ?? badges[0]?.id ?? null);
    }
  }, [badges, open]);

  const groupedBadges = BADGE_CATEGORIES.map((category) => ({
    category,
    badges: badges.filter((badge) => badge.category === category),
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto h-[88vh] w-full max-w-2xl overflow-hidden rounded-t-3xl px-0 pb-0 pt-0"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border px-5 py-4 pr-12 text-left">
            <SheetTitle>Achievements</SheetTitle>
            <SheetDescription>
              {unlockedCount} of {badges.length} unlocked
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide">
            {selectedBadge && (
              <section className="mb-6 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-4">
                  <BadgeMedallion badge={selectedBadge} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      {selectedBadge.unlocked ? (
                        <CheckCircle2 className="h-4 w-4 text-lime" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span
                        className={cn(
                          "text-xs font-semibold uppercase",
                          selectedBadge.unlocked ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {selectedBadge.unlocked ? "Unlocked" : "Locked"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">{selectedBadge.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedBadge.description}</p>
                    <p className="mt-3 text-xs font-medium text-foreground">{selectedBadge.unlockCondition}</p>
                    {selectedBadge.unlocked && awardedDate && (
                      <p className="mt-1 text-xs text-muted-foreground">Awarded {awardedDate}</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            <div className="space-y-6">
              {groupedBadges.map(({ category, badges: categoryBadges }) => (
                <section key={category}>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {BADGE_CATEGORY_LABELS[category]}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {categoryBadges.filter((badge) => badge.unlocked).length} of {categoryBadges.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {categoryBadges.map((badge: BadgeDefinition) => {
                      const isSelected = selectedBadge?.id === badge.id;

                      return (
                        <button
                          key={badge.id}
                          type="button"
                          onClick={() => setSelectedBadgeId(badge.id)}
                          className={cn(
                            "flex min-h-32 flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all active:scale-95",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:bg-muted/30"
                          )}
                          aria-pressed={isSelected}
                        >
                          <BadgeMedallion badge={badge} size="sm" />
                          <span
                            className={cn(
                              "line-clamp-2 text-xs font-semibold leading-snug",
                              badge.unlocked ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {badge.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default BadgesSheet;
