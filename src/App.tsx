import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import DataEntryPage from "@/pages/DataEntryPage";
import RatesPage from "@/pages/RatesPage";
import InventoryPage from "@/pages/InventoryPage";
import ExpensesPage from "@/pages/ExpensesPage";
import WorkersPage from "@/pages/WorkersPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AuthenticatedApp = () => {
  const { user } = useAuth();

  if (!user) return <LoginPage />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/data-entry" element={<DataEntryPage />} />
        <Route path="/rates" element={<RatesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/workers" element={<WorkersPage />} />
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
        <AuthProvider>
          <BrowserRouter>
            <AuthenticatedApp />
          </BrowserRouter>
        </AuthProvider>
      </CurrencyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
