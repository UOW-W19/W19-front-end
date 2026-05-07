import { useState, useEffect } from "react";
import { Download, Share, MoreVertical, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandaloneDisplay = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(display-mode: standalone)").matches;

const isIOSDevice = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplay());
  const [isIOS] = useState(() => isIOSDevice());

  useEffect(() => {
    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Check className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Already Installed!</h1>
        <p className="text-muted-foreground">
          Locale is installed on your device. Open it from your home screen.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 py-8">
      {/* App icon */}
      <div className="mb-6">
        <img
          src="/pwa-192x192.png"
          alt="Locale"
          className="w-24 h-24 rounded-2xl shadow-lg"
        />
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
        Install Locale
      </h1>
      <p className="text-muted-foreground text-center mb-8 max-w-xs">
        Add Locale to your home screen for the best experience
      </p>

      {/* Benefits */}
      <div className="w-full max-w-sm space-y-3 mb-8">
        {[
          "Works offline",
          "Fast app-like experience",
          "No app store needed",
          "Get notifications",
        ].map((benefit) => (
          <div key={benefit} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
            <Check className="h-5 w-5 text-primary shrink-0" />
            <span className="text-foreground">{benefit}</span>
          </div>
        ))}
      </div>

      {/* Install button for Android/Desktop */}
      {deferredPrompt && (
        <Button
          onClick={handleInstall}
          size="lg"
          className="w-full max-w-sm h-14 text-base gap-2"
        >
          <Download className="h-5 w-5" />
          Install Locale
        </Button>
      )}

      {/* iOS instructions */}
      {isIOS && !deferredPrompt && (
        <div className="w-full max-w-sm">
          <div className="p-4 rounded-2xl bg-muted space-y-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-6 w-6 text-primary" />
              <span className="font-semibold text-foreground">Install on iPhone/iPad</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  Tap the <Share className="h-4 w-4 inline" /> share button
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </div>
                <span className="text-foreground">Scroll down and tap "Add to Home Screen"</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  3
                </div>
                <span className="text-foreground">Tap "Add" in the top right</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Android browser instructions fallback */}
      {!isIOS && !deferredPrompt && (
        <div className="w-full max-w-sm">
          <div className="p-4 rounded-2xl bg-muted space-y-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-6 w-6 text-primary" />
              <span className="font-semibold text-foreground">Install on Android</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  Tap the <MoreVertical className="h-4 w-4 inline" /> menu button
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </div>
                <span className="text-foreground">Tap "Add to Home Screen" or "Install App"</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
