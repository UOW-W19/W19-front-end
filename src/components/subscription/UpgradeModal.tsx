import { Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div className="fixed inset-0 bg-black/45" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Close upgrade modal"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-amber-700">Out of scans! Subscribe now.</p>
        <h2 id="upgrade-modal-title" className="mt-1 text-2xl font-black text-foreground">
          Upgrade to Pro!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Unlock the full potential of Locale with our premium subscription.
        </p>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: "#CDDD01", color: "#7a8700" }}>
                <Check className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Unlimited Scans</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Have unrestricted learning potential from your surroundings
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: "#CDDD01", color: "#7a8700" }}>
                <Check className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Word Set Expansions</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Have unrestricted learning potential from your surroundings
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-background px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Pro Plan</p>
              <p className="text-xs text-muted-foreground">Billed Monthly</p>
            </div>
            <p className="text-xl font-black text-foreground">$4.99/mo.</p>
          </div>
          <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Tax</span>
              <span>$0.51</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-foreground">
              <span>Total for today</span>
              <span>$5.50</span>
            </div>
          </div>
        </div>

        <Button className="mt-5 h-12 w-full gap-2 rounded-xl" onClick={onClose}>
          Checkout with Pay
        </Button>
      </div>
    </div>
  );
}
