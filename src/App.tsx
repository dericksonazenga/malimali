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
import AttendancePage from "@/pages/AttendancePage";
import NotFound from "@/pages/NotFound";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
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
        <Route path="/" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/accountant" element={<AccountantPage />} />
        <Route path="/data-entry" element={<DataEntryPage />} />
        <Route path="/rates" element={<RatesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/workers" element={<WorkersPage />} />
        <Route path="/salary" element={<SalaryPage />} />
        <Route path="/financial-report" element={<FinancialReportPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
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
      <CurrencyProvider>
        <CommodityProvider>
          <AuthProvider>
            <InventoryProvider>
              <EndOfDayProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/*" element={<AuthenticatedApp />} />
                  </Routes>
                </BrowserRouter>
              </EndOfDayProvider>
            </InventoryProvider>
          </AuthProvider>
        </CommodityProvider>
      </CurrencyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
