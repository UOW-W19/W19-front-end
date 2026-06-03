import { useEffect, useMemo, useReducer, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Languages,
  Loader2,
  LocateFixed,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts";
import { geocodingApi } from "@/services/api/geocoding";
import { usersApi } from "@/services/api/users";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/api";

type OnboardingStep =
  | "welcome"
  | "signup"
  | "login"
  | "location"
  | "appLanguage"
  | "learningLanguage"
  | "proficiency"
  | "topics"
  | "loading";

type ProficiencyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

interface OnboardingState {
  step: OnboardingStep;
  registeredEmail: string;
  appLanguage: string;
  learningLanguage: string;
  proficiency: ProficiencyLevel | "";
  topics: string[];
}

type OnboardingAction =
  | { type: "go"; step: OnboardingStep }
  | { type: "registered"; email: string }
  | { type: "setAppLanguage"; code: string }
  | { type: "setLearningLanguage"; code: string }
  | { type: "setProficiency"; level: ProficiencyLevel }
  | { type: "toggleTopic"; topic: string };

const LANGUAGE_OPTIONS: Language[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
];

const TOPIC_OPTIONS = [
  "Comedy",
  "Sports",
  "Gaming",
  "Food & Drink",
  "Family",
  "Auto",
  "Art",
  "Music",
  "Travel",
  "Fundraising",
  "School Systems",
  "Incursion",
  "Excursion",
  "Tutoring",
  "K-12 Syllabus",
  "Teaching Tools",
];

const PREFERENCE_STEPS: OnboardingStep[] = [
  "appLanguage",
  "learningLanguage",
  "proficiency",
  "topics",
];

const initialState: OnboardingState = {
  step: "welcome",
  registeredEmail: "",
  appLanguage: "",
  learningLanguage: "",
  proficiency: "",
  topics: [],
};

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "go":
      return { ...state, step: action.step };
    case "registered":
      return { ...state, registeredEmail: action.email, step: "location" };
    case "setAppLanguage":
      return {
        ...state,
        appLanguage: action.code,
        learningLanguage: state.learningLanguage === action.code ? "" : state.learningLanguage,
      };
    case "setLearningLanguage":
      return { ...state, learningLanguage: action.code };
    case "setProficiency":
      return { ...state, proficiency: action.level };
    case "toggleTopic":
      return {
        ...state,
        topics: state.topics.includes(action.topic)
          ? state.topics.filter((topic) => topic !== action.topic)
          : [...state.topics, action.topic],
      };
    default:
      return state;
  }
}

function LocaleLogo({ className = "h-20 w-20" }: { className?: string }) {
  return <img src="/locale-logo.svg" alt="Locale" className={className} />;
}

function PageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function OnboardingFrame({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="flex h-dvh min-h-svh overflow-hidden bg-background px-4 py-4 text-foreground sm:px-6 sm:py-8">
      <main
        className={cn(
          "mx-auto flex h-full min-h-0 w-full max-w-md flex-col",
          compact ? "justify-start" : "justify-between",
        )}
      >
        {children}
      </main>
    </div>
  );
}

function OnboardingScrollArea({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide", className)}>
      {children}
    </div>
  );
}

function OnboardingFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("safe-area-bottom shrink-0 bg-background pt-3 sm:pt-4", className)}>
      {children}
    </div>
  );
}

function PreferenceProgress({ step }: { step: OnboardingStep }) {
  const index = PREFERENCE_STEPS.indexOf(step);
  if (index < 0) return null;

  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>Step {index + 1} of {PREFERENCE_STEPS.length}</span>
        <span>{Math.round(((index + 1) / PREFERENCE_STEPS.length) * 100)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-lime transition-all duration-300"
          style={{ width: `${((index + 1) / PREFERENCE_STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

function OnboardingSuccessDialog({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/35 px-4 py-5 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-success-title"
    >
      <div className="w-full max-w-sm rounded-3xl border border-primary/20 bg-card p-6 text-center shadow-locale-md animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-lime/25 text-navy">
          <Check className="h-8 w-8" />
        </div>
        <p className="mb-2 text-sm font-semibold text-orange">Locale</p>
        <h2 id="onboarding-success-title" className="text-2xl font-black leading-tight text-foreground">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        {actionLabel && onAction && (
          <Button type="button" onClick={onAction} className="mt-6 w-full text-base">
            {actionLabel}
            <ArrowRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function languageByCode(code: string) {
  return LANGUAGE_OPTIONS.find((language) => language.code === code);
}

async function resolveLocationLabel(latitude: number, longitude: number): Promise<string | undefined> {
  try {
    return await geocodingApi.getCurrentLocationLabel({ latitude, longitude });
  } catch (error) {
    console.warn("[OnboardingPage] Failed to resolve location label:", error);
    return undefined;
  }
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading, login, register, updateProfile, refreshUser } = useAuth();
  const [state, dispatch] = useReducer(onboardingReducer, initialState, (): OnboardingState => {
    const authStep = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("auth")
      : null;

    return authStep === "login" || authStep === "signup"
      ? { ...initialState, step: authStep }
      : initialState;
  });

  const [authEmail, setAuthEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "granted" | "skipped" | "denied">("idle");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const cameFromAuthChoice = searchParams.get("entry") === "choice";

  const learningLanguages = useMemo(
    () => LANGUAGE_OPTIONS.filter((language) => language.code !== state.appLanguage),
    [state.appLanguage],
  );
  const onboardingComplete = hasCompletedOnboarding(user);

  useEffect(() => {
    if (state.step !== "loading" && !showCompletionDialog) return;

    const timeoutId = window.setTimeout(() => {
      navigate("/", { replace: true });
    }, state.step === "loading" ? 950 : 1600);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, showCompletionDialog, state.step]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || onboardingComplete || state.step !== "welcome") return;
    dispatch({ type: "go", step: "appLanguage" });
  }, [authLoading, isAuthenticated, onboardingComplete, state.step]);

  if (authLoading) {
    return <PageSpinner />;
  }

  if (
    isAuthenticated &&
    onboardingComplete &&
    (state.step === "welcome" || state.step === "signup" || state.step === "login")
  ) {
    return <Navigate to="/" replace />;
  }

  const go = (step: OnboardingStep) => {
    setFormError(null);
    setShowRegistrationDialog(false);
    dispatch({ type: "go", step });
  };

  const returnFromAuthForm = () => {
    setFormError(null);
    if (cameFromAuthChoice) {
      navigate("/auth", { replace: true });
      return;
    }

    dispatch({ type: "go", step: "welcome" });
  };

  const continueToPreferences = () => {
    setShowRegistrationDialog(false);
    if (cameFromAuthChoice) {
      navigate("/onboarding", { replace: true });
    }
    dispatch({ type: "go", step: "appLanguage" });
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!displayName.trim()) {
      setFormError("Display name is required");
      return;
    }

    setIsSubmittingAuth(true);
    try {
      await register({
        email: authEmail,
        password,
        displayName: displayName.trim(),
        nativeLanguage: null,
        learningLanguages: [],
      });
      dispatch({ type: "registered", email: authEmail });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create your account");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmittingAuth(true);

    try {
      await login({ email: authEmail, password });
      dispatch({ type: "go", step: "loading" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not log in");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const requestLocation = () => {
    setLocationMessage(null);

    if (!navigator.geolocation) {
      setLocationStatus("denied");
      setLocationMessage("Location services are not available in this browser.");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        try {
          const location = user?.location?.trim()
            ? undefined
            : await resolveLocationLabel(latitude, longitude);

          await updateProfile({
            latitude,
            longitude,
            ...(location ? { location } : {}),
          });
          setLocationStatus("granted");
          setShowRegistrationDialog(true);
        } catch {
          setLocationStatus("granted");
          setLocationMessage("Location was found, but could not be saved yet.");
          setShowRegistrationDialog(true);
        }
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location access was denied. You can enable it later from your browser settings."
            : "We could not get your location. You can try again or continue for now.";
        setLocationStatus("denied");
        setLocationMessage(message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 15000,
      },
    );
  };

  const skipLocation = () => {
    setLocationStatus("skipped");
    setShowRegistrationDialog(true);
  };

  const savePreferences = async () => {
    if (!state.appLanguage || !state.learningLanguage || !state.proficiency) return;

    setIsSavingPreferences(true);
    try {
      await usersApi.updateLanguages([
        {
          code: state.appLanguage,
          proficiency: "NATIVE",
          isLearning: false,
        },
        {
          code: state.learningLanguage,
          proficiency: state.proficiency,
          isLearning: true,
        },
      ]);

      window.localStorage.setItem("locale_onboarding_topics", JSON.stringify(state.topics));
      await refreshUser();
      if (cameFromAuthChoice) {
        navigate("/onboarding", { replace: true });
      }
      setShowCompletionDialog(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save your preferences");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  if (state.step === "welcome") {
    return (
      <OnboardingFrame>
        <OnboardingScrollArea className="flex flex-col justify-center">
          <div className="mb-8 flex justify-center sm:mb-10">
            <LocaleLogo className="h-20 w-20 sm:h-24 sm:w-24" />
          </div>

          <section className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange">
              Welcome to Locale
            </p>
            <h1 className="text-4xl font-black leading-tight text-foreground sm:text-5xl">
              Learn from your world, with your people.
            </h1>
            <p className="text-base font-light leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Create your account, choose your languages, and set up the feed around what you want to practise.
            </p>
          </section>
        </OnboardingScrollArea>

        <OnboardingFooter className="space-y-4">
          <Button type="button" onClick={() => go("signup")} className="w-full text-base">
            Get started
            <ArrowRight className="h-5 w-5" />
          </Button>

          <p className="text-center text-sm text-foreground">
            Already have an account?{" "}
            <button type="button" onClick={() => go("login")} className="link-orange">
              Log in
            </button>
          </p>
        </OnboardingFooter>
      </OnboardingFrame>
    );
  }

  if (state.step === "signup" || state.step === "login") {
    const isSignup = state.step === "signup";

    return (
      <OnboardingFrame compact>
        <OnboardingScrollArea>
          <button
            type="button"
            onClick={returnFromAuthForm}
            className="mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="mb-7">
            <LocaleLogo className="mb-6 h-14 w-14 sm:h-16 sm:w-16" />
            <h1 className="text-4xl font-black leading-tight text-foreground sm:text-5xl">
              {isSignup ? "Create your account." : "Welcome back."}
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              {isSignup
                ? "Sign up first, then we will set up your location and language preferences."
                : "Log in and we will take you straight to your feed."}
            </p>
          </div>

          {formError && (
            <div className="mb-5 rounded-2xl bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground" role="alert">
              {formError}
            </div>
          )}

          <form id="onboarding-auth-form" onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-6 pb-3">
            {isSignup && (
              <div>
                <label htmlFor="onboarding-display-name" className="mb-2 block text-base font-medium text-foreground">
                  Display Name
                </label>
                <input
                  id="onboarding-display-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  className="input-underline"
                />
              </div>
            )}

            <div>
              <label htmlFor="onboarding-email" className="mb-2 block text-base font-medium text-foreground">
                Email
              </label>
              <input
                id="onboarding-email"
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                required
                className="input-underline"
              />
            </div>

            <div>
              <label htmlFor="onboarding-password" className="mb-2 block text-base font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="onboarding-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder={isSignup ? "Min. 6 characters" : "Password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="input-underline pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="touch-target absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center p-2 text-purple transition-colors hover:text-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </form>
        </OnboardingScrollArea>

        <OnboardingFooter>
          <Button type="submit" form="onboarding-auth-form" disabled={isSubmittingAuth} className="w-full text-base">
            {isSubmittingAuth ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSignup ? (
              "Create Account"
            ) : (
              "Log in"
            )}
          </Button>

          <p className="mt-4 text-center text-sm text-foreground">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => go(isSignup ? "login" : "signup")}
              className="link-orange"
            >
              {isSignup ? "Log in" : "Sign up"}
            </button>
          </p>
        </OnboardingFooter>
      </OnboardingFrame>
    );
  }

  if (state.step === "location") {
    return (
      <>
        <OnboardingFrame>
          <OnboardingScrollArea className="flex flex-col justify-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-lime/25 text-navy sm:mb-8 sm:h-20 sm:w-20">
              <MapPin className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
            <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">
              Allow location services
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Locale uses your location to help you discover nearby learners, meetups, and local posts.
            </p>
            {locationMessage && (
              <p className="mt-5 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                {locationMessage}
              </p>
            )}
          </OnboardingScrollArea>

          <OnboardingFooter className="space-y-3">
            <Button type="button" onClick={requestLocation} disabled={locationStatus === "loading"} className="w-full text-base">
              {locationStatus === "loading" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LocateFixed className="h-5 w-5" />
                  Allow location
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={skipLocation} className="w-full text-base">
              Skip for now
            </Button>
          </OnboardingFooter>
        </OnboardingFrame>

        {showRegistrationDialog && (
          <OnboardingSuccessDialog
            title="Account ready"
            message={`${state.registeredEmail || authEmail} is set up. Now choose your native language and the language you want to learn.`}
            actionLabel="Continue setup"
            onAction={continueToPreferences}
          />
        )}
      </>
    );
  }

  if (state.step === "appLanguage") {
    return (
      <OnboardingFrame compact>
        <OnboardingScrollArea>
          <PreferenceProgress step={state.step} />
          <div className="mb-6 sm:mb-7">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple/15 text-purple sm:mb-5 sm:h-14 sm:w-14">
              <Languages className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">
              First, let's choose your native language
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              This sets the language you use most naturally for your profile and app experience.
            </p>
          </div>

          <div className="space-y-3 pb-3">
            {LANGUAGE_OPTIONS.map((language) => {
              const selected = state.appLanguage === language.code;
              return (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => dispatch({ type: "setAppLanguage", code: language.code })}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left transition-all sm:gap-4 sm:py-4",
                    selected
                      ? "border-primary shadow-locale-md"
                      : "border-border hover:border-purple/60 hover:bg-muted/40",
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl sm:h-12 sm:w-12">
                    {language.flag}
                  </span>
                  <span className="text-base font-semibold text-foreground sm:text-lg">{language.name}</span>
                  {selected && <Check className="ml-auto h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
        </OnboardingScrollArea>

        <OnboardingFooter className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={() => go("location")}>
            Back
          </Button>
          <Button type="button" onClick={() => go("learningLanguage")} disabled={!state.appLanguage}>
            Next
          </Button>
        </OnboardingFooter>
      </OnboardingFrame>
    );
  }

  if (state.step === "learningLanguage") {
    return (
      <OnboardingFrame compact>
        <OnboardingScrollArea>
          <PreferenceProgress step={state.step} />
          <div className="mb-6 sm:mb-7">
            <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">
              What language do you want to learn?
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Choose one language to focus your feed and lessons.
            </p>
          </div>

          <div className="space-y-4 pb-3">
            {learningLanguages.map((language) => {
              const selected = state.learningLanguage === language.code;
              return (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => dispatch({ type: "setLearningLanguage", code: language.code })}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border-2 bg-card px-4 py-4 text-left transition-all sm:gap-5 sm:rounded-3xl sm:px-5 sm:py-5",
                    selected
                      ? "border-primary shadow-locale-md"
                      : "border-foreground/20 hover:border-purple/60 hover:bg-muted/40",
                  )}
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl sm:h-16 sm:w-16 sm:text-3xl">
                    {language.flag}
                  </span>
                  <span className="text-lg font-semibold text-foreground sm:text-xl">{language.name}</span>
                  {selected && <Check className="ml-auto h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
        </OnboardingScrollArea>

        {state.learningLanguage && (
          <OnboardingFooter className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => go("appLanguage")}>
              Back
            </Button>
            <Button type="button" onClick={() => go("proficiency")}>
              Next
            </Button>
          </OnboardingFooter>
        )}
      </OnboardingFrame>
    );
  }

  if (state.step === "proficiency") {
    const selectedLanguage = languageByCode(state.learningLanguage);

    return (
      <OnboardingFrame compact>
        <OnboardingScrollArea>
          <div className="pb-3">
            <PreferenceProgress step={state.step} />
            <div className="mb-6 sm:mb-8">
              <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">
                Proficiency Level
              </h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                How comfortable are you with {selectedLanguage?.name ?? "this language"} today?
              </p>
            </div>

            <div className="space-y-5">
              {[
                { level: "BEGINNER", label: "Beginner" },
                { level: "INTERMEDIATE", label: "Intermediate" },
                { level: "ADVANCED", label: "Advanced" },
              ].map((option) => {
                const selected = state.proficiency === option.level;
                return (
                  <button
                    key={option.level}
                    type="button"
                    onClick={() => dispatch({ type: "setProficiency", level: option.level as ProficiencyLevel })}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border-2 bg-card px-5 py-4 text-left text-lg font-semibold transition-all sm:px-6 sm:py-5 sm:text-xl",
                      selected
                        ? "border-primary shadow-locale-md"
                        : "border-foreground/20 hover:border-purple/60 hover:bg-muted/40",
                    )}
                  >
                    {option.label}
                    {selected && <Check className="h-5 w-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </OnboardingScrollArea>

        <OnboardingFooter className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={() => go("learningLanguage")}>
            Back
          </Button>
          <Button type="button" onClick={() => go("topics")} disabled={!state.proficiency}>
            Next
          </Button>
        </OnboardingFooter>
      </OnboardingFrame>
    );
  }

  if (state.step === "topics") {
    return (
      <>
        <OnboardingFrame compact>
          <OnboardingScrollArea>
            <PreferenceProgress step={state.step} />
            <div className="mb-6 sm:mb-8">
              <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">
                Let's choose your topic!
              </h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Choose what you like so your feed starts with familiar conversations.
              </p>
            </div>

            {formError && (
              <div className="mb-5 rounded-2xl bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground" role="alert">
                {formError}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pb-3">
              {TOPIC_OPTIONS.map((topic) => {
                const selected = state.topics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => dispatch({ type: "toggleTopic", topic })}
                    disabled={showCompletionDialog}
                    className={cn(
                      "rounded-full border-2 px-4 py-2.5 text-sm font-semibold shadow-locale-sm transition-all disabled:pointer-events-none disabled:opacity-70 sm:px-5 sm:py-3",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-purple/60 hover:bg-muted/40",
                    )}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </OnboardingScrollArea>

          <OnboardingFooter className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => go("proficiency")} disabled={isSavingPreferences || showCompletionDialog}>
              Back
            </Button>
            <Button type="button" onClick={savePreferences} disabled={state.topics.length === 0 || isSavingPreferences || showCompletionDialog}>
              {isSavingPreferences ? <Loader2 className="h-5 w-5 animate-spin" /> : "Next"}
            </Button>
          </OnboardingFooter>
        </OnboardingFrame>

        {showCompletionDialog && (
          <OnboardingSuccessDialog
            title="You're ready for Locale"
            message="Your native language, learning goal, and topics are saved. Your feed is opening now."
          />
        )}
      </>
    );
  }

  return (
    <OnboardingFrame>
      <OnboardingScrollArea className="flex flex-col items-center justify-center text-center">
        <Sparkles className="mb-7 h-11 w-11 text-lime" />
        <div className="mb-7 h-2 w-3/5 max-w-52 overflow-hidden rounded-full bg-navy">
          <div className="h-full w-3/4 rounded-full bg-lime" />
        </div>
        <p className="text-2xl font-medium text-foreground">Loading...</p>
      </OnboardingScrollArea>
    </OnboardingFrame>
  );
}
