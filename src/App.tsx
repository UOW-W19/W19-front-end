import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const FeedPage        = lazy(() => import("./pages/FeedPage"));
const ExplorePage     = lazy(() => import("./pages/ExplorePage"));
const MessagesPage    = lazy(() => import("./pages/MessagesPage"));
const LearnPage       = lazy(() => import("./pages/LearnPage"));
const ProfilePage     = lazy(() => import("./pages/ProfilePage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const SettingsPage    = lazy(() => import("./pages/SettingsPage"));
const InstallPage     = lazy(() => import("./pages/InstallPage"));
const AuthPage        = lazy(() => import("./pages/AuthPage"));
const ScannerPage     = lazy(() => import("./pages/ScannerPage"));
const FriendsPage     = lazy(() => import("./pages/FriendsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
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
      <Route path="/auth" element={<AuthPage />} />
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
        <Route path="/install" element={<InstallPage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/friends" element={<FriendsPage />} />
      </Route>
    </Routes>
  </Suspense>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
