import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts";
import { hasCompletedOnboarding } from "@/lib/onboarding";

function LocaleLogo({ className = "h-20 w-20" }: { className?: string }) {
  return <img src="/locale-logo.svg" alt="Locale" className={className} />;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    navigate(hasCompletedOnboarding(user) ? "/" : "/onboarding", { replace: true });
  }, [isAuthenticated, isLoading, navigate, user]);

  const startAuthFlow = (authStep: "login" | "signup") => {
    navigate(`/onboarding?auth=${authStep}&entry=choice`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh overflow-hidden bg-background px-4 py-4 text-foreground sm:px-6 sm:py-8">
      <main className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-md flex-col px-1 py-5 sm:min-h-[calc(100svh-4rem)] sm:py-7">
        <div className="flex justify-center pt-4 sm:pt-6">
          <LocaleLogo className="h-24 w-24 sm:h-28 sm:w-28" />
        </div>

        <section className="mt-16 space-y-6 sm:mt-20">
          <h1 className="text-4xl font-black leading-tight text-foreground sm:text-5xl">
            Hello,
            <br />
            welcome to
            <br />
            <span className="heading-highlight">Locale.</span>
          </h1>
          <p className="max-w-xs text-base font-light leading-7 text-foreground sm:text-lg sm:leading-8">
            Learn from <span className="link-orange">your</span> world, with{" "}
            <span className="link-orange">your</span> people.
          </p>
        </section>

        <div className="safe-area-bottom mt-auto space-y-3 pt-12">
          <Button type="button" onClick={() => startAuthFlow("login")} className="w-full text-base">
            Sign In
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => startAuthFlow("signup")}
            className="w-full bg-background text-base"
          >
            Create Account
          </Button>
        </div>
      </main>
    </div>
  );
}
