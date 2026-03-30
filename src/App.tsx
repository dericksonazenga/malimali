import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EndOfDayProvider } from "@/contexts/EndOfDayContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { CommodityProvider } from "@/contexts/CommodityContext";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import DataEntryPage from "@/pages/DataEntryPage";
import RatesPage from "@/pages/RatesPage";
import InventoryPage from "@/pages/InventoryPage";
import ExpensesPage from "@/pages/ExpensesPage";
import WorkersPage from "@/pages/WorkersPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import AccountantPage from "@/pages/AccountantPage";
import SalaryPage from "@/pages/SalaryPage";
import FinancialReportPage from "@/pages/FinancialReportPage";
import MessagesPage from "@/pages/MessagesPage";
import DailySummariesPage from "@/pages/DailySummariesPage";
import AttendancePage from "@/pages/AttendancePage";
import AttendanceScanPage from "@/pages/AttendanceScanPage";
import NotFound from "@/pages/NotFound";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import MyInfoPage from "@/pages/MyInfoPage";
import DebtManagementPage from "@/pages/DebtManagementPage";
import SavingsPage from "@/pages/SavingsPage";
const queryClient = new QueryClient();

const AuthenticatedApp = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar">
      <div className="text-sidebar-foreground/60">Loading...</div>
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<ProtectedRoute permission="view_dashboard"><DashboardPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute permission="manage_workers"><AdminPage /></ProtectedRoute>} />
        <Route path="/accountant" element={<ProtectedRoute permission="view_accountant"><AccountantPage /></ProtectedRoute>} />
        <Route path="/data-entry" element={<DataEntryPage />} />
        <Route path="/rates" element={<ProtectedRoute permission="update_rates"><RatesPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute permission="manage_inventory"><InventoryPage /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute permission="manage_expenses"><ExpensesPage /></ProtectedRoute>} />
        <Route path="/workers" element={<ProtectedRoute permission="manage_workers"><WorkersPage /></ProtectedRoute>} />
        <Route path="/salary" element={<ProtectedRoute permission="manage_workers"><SalaryPage /></ProtectedRoute>} />
        <Route path="/financial-report" element={<ProtectedRoute permission="view_financial_report"><FinancialReportPage /></ProtectedRoute>} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/daily-summaries" element={<ProtectedRoute permission="view_daily_summaries"><DailySummariesPage /></ProtectedRoute>} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/debts" element={<DebtManagementPage />} />
        <Route path="/savings" element={<SavingsPage />} />
        <Route path="/my-info" element={<MyInfoPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
          <CurrencyProvider>
            <InventoryProvider>
              <EndOfDayProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/attendance-scan" element={<AttendanceScanPage />} />
                    <Route path="/*" element={<AuthenticatedApp />} />
                  </Routes>
                </BrowserRouter>
              </EndOfDayProvider>
            </InventoryProvider>
          </CurrencyProvider>
        </CommodityProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
