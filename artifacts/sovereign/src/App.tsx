import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "./i18n/LanguageContext";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { SplashScreen } from "./components/SplashScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Install = lazy(() => import("./pages/Install"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AdminStats = lazy(() => import("./pages/AdminStats"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Launch = lazy(() => import("./pages/Launch"));
const Security = lazy(() => import("./pages/Security"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Subscribe = lazy(() => import("./pages/Subscribe"));
const BugBounty = lazy(() => import("./pages/BugBounty"));

const RedeemManagerInvite = lazy(() => import("./pages/RedeemManagerInvite"));
const SlugRedirect = lazy(() => import("./pages/SlugRedirect"));
const FanGroup = lazy(() => import("./pages/FanGroup"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
  </div>
);


const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const visited = sessionStorage.getItem('directly_visited');
    if (!visited) {
      setIsFirstVisit(true);
      sessionStorage.setItem('directly_visited', 'true');
    } else {
      setShowSplash(false);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <PWAInstallPrompt />
              
              {showSplash && isFirstVisit && (
                <SplashScreen onComplete={() => setShowSplash(false)} />
              )}
              
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Auth />} />
                    <Route path="/home" element={<Dashboard />} />
                    <Route path="/welcome" element={<Index />} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/admin" element={<AdminStats />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/launch" element={<Launch />} />
                    <Route path="/security" element={<Security />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/subscribe" element={<Subscribe />} />
                    <Route path="/security/bounty" element={<BugBounty />} />
                    <Route path="/join-manager/:celebrityId" element={<Navigate to="/home" replace />} />
                    <Route path="/m/:token" element={<RedeemManagerInvite />} />
                    <Route path="/s/:slug" element={<SlugRedirect />} />
                    <Route path="/g/:slug" element={<FanGroup />} />
                    <Route path="/:username" element={<PublicProfile />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
