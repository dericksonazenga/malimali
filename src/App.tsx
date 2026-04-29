import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { CommodityProvider } from "@/contexts/CommodityContext";
import { CategoryLabelsProvider } from "@/contexts/CategoryLabelsContext";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import LoginPage from "@/pages/LoginPage";
import CompanySuspendedScreen from "@/components/CompanySuspendedScreen";
import { useCompanyStatus } from "@/hooks/useCompanyStatus";

// Lazy-loaded routes — keep factory refs so we can prefetch all chunks once
// the shell mounts. Prefetching means subsequent navigations are instant
// (no chunk download, no Suspense fallback flash).
const loaders = {
  SystemAdminPage: () => import("@/pages/SystemAdminPage"),
  SystemAdminGate: () => import("@/components/SystemAdminGate"),
  DashboardPage: () => import("@/pages/DashboardPage"),
  DataEntryPage: () => import("@/pages/DataEntryPage"),
  RatesPage: () => import("@/pages/RatesPage"),
  InventoryPage: () => import("@/pages/InventoryPage"),
  ExpensesPage: () => import("@/pages/ExpensesPage"),
  WorkersPage: () => import("@/pages/WorkersPage"),
  SettingsPage: () => import("@/pages/SettingsPage"),
  AdminPage: () => import("@/pages/AdminPage"),
  SalaryPage: () => import("@/pages/SalaryPage"),
  FinancialReportPage: () => import("@/pages/FinancialReportPage"),
  MessagesPage: () => import("@/pages/MessagesPage"),
  AttendancePage: () => import("@/pages/AttendancePage"),
  AttendanceScanPage: () => import("@/pages/AttendanceScanPage"),
  NotFound: () => import("@/pages/NotFound"),
  ResetPasswordPage: () => import("@/pages/ResetPasswordPage"),
  LandingPage: () => import("@/pages/LandingPage"),
  MyInfoPage: () => import("@/pages/MyInfoPage"),
  DebtManagementPage: () => import("@/pages/DebtManagementPage"),
  SavingsPage: () => import("@/pages/SavingsPage"),
  DeletionHistoryPage: () => import("@/pages/DeletionHistoryPage"),
};

const SystemAdminPage = lazy(loaders.SystemAdminPage);
const SystemAdminGate = lazy(loaders.SystemAdminGate);
const DashboardPage = lazy(loaders.DashboardPage);
const DataEntryPage = lazy(loaders.DataEntryPage);
const RatesPage = lazy(loaders.RatesPage);
const InventoryPage = lazy(loaders.InventoryPage);
const ExpensesPage = lazy(loaders.ExpensesPage);
const WorkersPage = lazy(loaders.WorkersPage);
const SettingsPage = lazy(loaders.SettingsPage);
const AdminPage = lazy(loaders.AdminPage);
const SalaryPage = lazy(loaders.SalaryPage);
const FinancialReportPage = lazy(loaders.FinancialReportPage);
const MessagesPage = lazy(loaders.MessagesPage);
const AttendancePage = lazy(loaders.AttendancePage);
const AttendanceScanPage = lazy(loaders.AttendanceScanPage);
const NotFound = lazy(loaders.NotFound);
const ResetPasswordPage = lazy(loaders.ResetPasswordPage);
const LandingPage = lazy(loaders.LandingPage);
const MyInfoPage = lazy(loaders.MyInfoPage);
const DebtManagementPage = lazy(loaders.DebtManagementPage);
const SavingsPage = lazy(loaders.SavingsPage);
const DeletionHistoryPage = lazy(loaders.DeletionHistoryPage);

let prefetchStarted = false;
const prefetchAllRoutes = () => {
  if (prefetchStarted) return;
  prefetchStarted = true;
  // Stagger imports so we don't hammer the network in parallel — but kick
  // them all off within ~half a second.
  const entries = Object.values(loaders);
  entries.forEach((load, i) => {
    const start = () => { void load().catch(() => {}); };
    const delay = Math.min(i * 30, 600);
    if (typeof (window as any).requestIdleCallback === "function") {
      (window as any).requestIdleCallback(start, { timeout: delay + 200 });
    } else {
      setTimeout(start, delay);
    }
  });
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Transparent fallback — no spinner, no layout shift. Cached chunks render
// instantly; for the rare uncached chunk the user sees the previous page
// content until the new one is ready (a few ms on a warm app).
const RouteFallback = () => <div aria-hidden="true" />;

const AuthenticatedApp = () => {
  const { user, loading, isSystemAdmin } = useAuth();
  const { gracePeriodExpired } = useCompanyStatus();

  // Warm every route chunk in the background once the shell mounts so future
  // navigations are instant.
  useEffect(() => { prefetchAllRoutes(); }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar">
      <div className="h-10 w-10 rounded-full border-2 border-amber-500/25 border-t-amber-500 animate-spin" />
    </div>
  );

  if (!user) return <LoginPage />;

  // Hard lockout: deactivated AND grace period (10 days) has expired.
  // System admins keep full access so they can reactivate.
  if (gracePeriodExpired && !isSystemAdmin) {
    return (
      <AppLayout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/system-admin" element={isSystemAdmin ? <SystemAdminGate><SystemAdminPage /></SystemAdminGate> : <CompanySuspendedScreen />} />
            <Route path="*" element={<CompanySuspendedScreen />} />
          </Routes>
        </Suspense>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<ProtectedRoute permission="view_dashboard"><DashboardPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute permission="manage_workers"><AdminPage /></ProtectedRoute>} />
          <Route path="/data-entry" element={<DataEntryPage />} />
          <Route path="/rates" element={<ProtectedRoute permission="update_rates"><RatesPage /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute permission="manage_inventory"><InventoryPage /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute permission="manage_expenses"><ExpensesPage /></ProtectedRoute>} />
          <Route path="/workers" element={<ProtectedRoute permission="manage_workers"><WorkersPage /></ProtectedRoute>} />
          <Route path="/salary" element={<ProtectedRoute permission="manage_workers"><SalaryPage /></ProtectedRoute>} />
          <Route path="/financial-report" element={<ProtectedRoute permission="view_financial_report"><FinancialReportPage /></ProtectedRoute>} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/debts" element={<DebtManagementPage />} />
          <Route path="/savings" element={<SavingsPage />} />
          <Route path="/my-info" element={<MyInfoPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/deletion-history" element={<ProtectedRoute permission="__admin_only__"><DeletionHistoryPage /></ProtectedRoute>} />
          {isSystemAdmin && <Route path="/system-admin" element={<SystemAdminGate><SystemAdminPage /></SystemAdminGate>} />}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <CommodityProvider>
          <CategoryLabelsProvider>
            <CurrencyProvider>
              <InventoryProvider>
                <BrowserRouter>
                  <ScrollToTop />
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/landing" element={<LandingPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                      <Route path="/attendance-scan" element={<AttendanceScanPage />} />
                      <Route path="/*" element={<AuthenticatedApp />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </InventoryProvider>
            </CurrencyProvider>
          </CategoryLabelsProvider>
        </CommodityProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
