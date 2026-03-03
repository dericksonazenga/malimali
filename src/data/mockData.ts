import { User, Commodity, AgentEntry, VipEntry, SalesEntry, Expense, Worker } from "@/types";

export const mockUsers: User[] = [
  { id: "1", name: "Admin User", email: "admin@scrap.com", role: "admin", permissions: ["update_rates", "delete_entries", "view_reports", "manage_workers", "manage_expenses", "manage_inventory"] },
  { id: "2", name: "Finance Manager", email: "accountant@scrap.com", role: "accountant", permissions: ["view_reports", "manage_expenses", "manage_workers"] },
  { id: "3", name: "Data Manager", email: "datamanager@scrap.com", role: "data_manager", permissions: ["update_rates", "delete_entries", "manage_inventory"] },
  { id: "4", name: "Yard Worker", email: "worker@scrap.com", role: "worker", permissions: [] },
];

export const mockCommodities: Commodity[] = [
  { id: "1", name: "Iron", agentRate: 28, vipRate: 30, salesRate: 35 },
  { id: "2", name: "Copper", agentRate: 450, vipRate: 470, salesRate: 520 },
  { id: "3", name: "Aluminium", agentRate: 120, vipRate: 130, salesRate: 155 },
  { id: "4", name: "Brass", agentRate: 340, vipRate: 360, salesRate: 400 },
  { id: "5", name: "Steel", agentRate: 25, vipRate: 27, salesRate: 32 },
  { id: "6", name: "Plastic", agentRate: 12, vipRate: 14, salesRate: 18 },
];

export const mockAgentEntries: AgentEntry[] = [
  { id: "1", customerName: "Ahmed Traders", commodity: "Iron", grossWeight: 500, containerWeight: 20, actualWeight: 480, rate: 28, amount: 13440, createdBy: "3", createdAt: "2026-02-28" },
  { id: "2", customerName: "Khan Scrap", commodity: "Copper", grossWeight: 100, containerWeight: 5, actualWeight: 95, rate: 450, amount: 42750, createdBy: "3", createdAt: "2026-02-28" },
  { id: "3", customerName: "City Metals", commodity: "Aluminium", grossWeight: 300, containerWeight: 15, actualWeight: 285, rate: 120, amount: 34200, createdBy: "3", createdAt: "2026-03-01" },
];

export const mockVipEntries: VipEntry[] = [
  { id: "1", customerName: "Premium Metals Co", commodity: "Copper", grossWeight: 200, containerWeight: 10, actualWeight: 190, rate: 470, amount: 89300, createdBy: "3", createdAt: "2026-03-01" },
];

export const mockSalesEntries: SalesEntry[] = [
  { id: "1", customerName: "Steel Works Ltd", weight: 1000, rate: 35, amount: 35000, createdBy: "3", createdAt: "2026-02-28" },
  { id: "2", customerName: "Export House", weight: 500, createdBy: "3", createdAt: "2026-03-01" },
];

export const mockExpenses: Expense[] = [
  { id: "1", category: "Transport", amount: 5000, date: "2026-03-01", notes: "Truck rental" },
  { id: "2", category: "Labour", amount: 3000, date: "2026-02-28", notes: "Daily wages" },
  { id: "3", category: "Fuel", amount: 2500, date: "2026-02-28", notes: "Diesel" },
];

export const mockWorkers: Worker[] = [
  { id: "1", name: "Raju Kumar", role: "Loader", salary: 15000, paid: 10000, balance: 5000 },
  { id: "2", name: "Suresh Pal", role: "Sorter", salary: 12000, paid: 12000, balance: 0 },
  { id: "3", name: "Deepak Singh", role: "Driver", salary: 18000, paid: 8000, balance: 10000 },
];
