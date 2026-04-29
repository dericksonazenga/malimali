import { lazy, Suspense } from "react";
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

// Lazy-loaded routes — keeps initial bundle small so the app paints instantly.
const SystemAdminPage = lazy(() => import("@/pages/SystemAdminPage"));
const SystemAdminGate = lazy(() => import("@/components/SystemAdminGate"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const DataEntryPage = lazy(() => import("@/pages/DataEntryPage"));
const RatesPage = lazy(() => import("@/pages/RatesPage"));
const InventoryPage = lazy(() => import("@/pages/InventoryPage"));
const ExpensesPage = lazy(() => import("@/pages/ExpensesPage"));
const WorkersPage = lazy(() => import("@/pages/WorkersPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const SalaryPage = lazy(() => import("@/pages/SalaryPage"));
const FinancialReportPage = lazy(() => import("@/pages/FinancialReportPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const AttendancePage = lazy(() => import("@/pages/AttendancePage"));
const AttendanceScanPage = lazy(() => import("@/pages/AttendanceScanPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const MyInfoPage = lazy(() => import("@/pages/MyInfoPage"));
const DebtManagementPage = lazy(() => import("@/pages/DebtManagementPage"));
const SavingsPage = lazy(() => import("@/pages/SavingsPage"));
const DeletionHistoryPage = lazy(() => import("@/pages/DeletionHistoryPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
    <div className="h-8 w-8 rounded-full border-2 border-amber-500/25 border-t-amber-500 animate-spin" />
  </div>
);

const AuthenticatedApp = () => {
  const { user, loading, isSystemAdmin } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar">
      <div className="h-10 w-10 rounded-full border-2 border-amber-500/25 border-t-amber-500 animate-spin" />
    </div>
  );

  if (!user) return <LoginPage />;

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
