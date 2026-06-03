import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { AuthProvider, useAuth } from "@/contexts";
import { StompProvider } from "@/contexts/StompContext";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { isAdminUser } from "@/lib/roles";
import MessagesPage from "./pages/MessagesPage";

const FeedPage        = lazy(() => import("./pages/FeedPage"));
const ExplorePage     = lazy(() => import("./pages/ExplorePage"));
const LearnPage       = lazy(() => import("./pages/LearnPage"));
const ProfilePage     = lazy(() => import("./pages/ProfilePage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const SettingsPage    = lazy(() => import("./pages/SettingsPage"));
const InstallPage     = lazy(() => import("./pages/InstallPage"));
const AuthPage        = lazy(() => import("./pages/AuthPage"));
const OnboardingPage  = lazy(() => import("./pages/OnboardingPage"));
const ScannerPage     = lazy(() => import("./pages/ScannerPage"));
const FriendsPage     = lazy(() => import("./pages/FriendsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NotificationsSettingsPage = lazy(() => import("./pages/NotificationsSettingsPage"));
const AdminPage       = lazy(() => import("./pages/AdminPage"));

const POST_LOGOUT_REDIRECT_KEY = "locale_post_logout_redirect";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function LoggedOutRedirect() {
  const [redirectTo] = useState(() => {
    if (typeof window === "undefined") return "/onboarding";
    return window.sessionStorage.getItem(POST_LOGOUT_REDIRECT_KEY) === "/auth" ? "/auth" : "/onboarding";
  });

  useEffect(() => {
    if (redirectTo === "/auth") {
      window.sessionStorage.removeItem(POST_LOGOUT_REDIRECT_KEY);
    }
  }, [redirectTo]);

  return <Navigate to={redirectTo} replace />;
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoggedOutRedirect />;
  }

  if (!hasCompletedOnboarding(user)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoggedOutRedirect />;
  }

  if (!hasCompletedOnboarding(user)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AppRoutes = () => (
  <Suspense fallback={<PageSpinner />}>
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/install" element={<InstallPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<FeedPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/notifications" element={<NotificationsSettingsPage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  </Suspense>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <StompProvider>
            <OfflineBanner />
            <AppRoutes />
          </StompProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
