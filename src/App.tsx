import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import AgentEntryPage from "@/pages/AgentEntryPage";
import VipEntryPage from "@/pages/VipEntryPage";
import SalesEntryPage from "@/pages/SalesEntryPage";
import RatesPage from "@/pages/RatesPage";
import InventoryPage from "@/pages/InventoryPage";
import ExpensesPage from "@/pages/ExpensesPage";
import WorkersPage from "@/pages/WorkersPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AuthenticatedApp = () => {
  const { user } = useAuth();

  if (!user) return <LoginPage />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/agent-entry" element={<AgentEntryPage />} />
        <Route path="/vip-entry" element={<VipEntryPage />} />
        <Route path="/sales-entry" element={<SalesEntryPage />} />
        <Route path="/rates" element={<RatesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/workers" element={<WorkersPage />} />
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
        <BrowserRouter>
          <AuthenticatedApp />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
