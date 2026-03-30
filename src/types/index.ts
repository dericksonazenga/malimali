export type UserRole = "admin" | "accountant" | "data_manager" | "human_resource" | "cashier" | "boss";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
}

export type Permission =
  | "view_dashboard"
  | "view_data_entry"
  | "data_entry"
  | "view_debts"
  | "view_messages"
  | "view_my_info"
  | "view_settings"
  | "update_rates"
  | "delete_entries"
  | "view_reports"
  | "view_financial_report"
  | "view_daily_summaries"
  | "view_accountant"
  | "manage_workers"
  | "manage_expenses"
  | "manage_inventory"
  | "adjust_stock"
  | "delete_agent_vip_entries"
  | "delete_sales_entries"
  | "delete_expenses"
  | "delete_rates"
  | "manage_debts"
  | "edit_records"
  | "view_savings"
  | "manage_savings"
  | "end_of_day";

export interface Commodity {
  id: string;
  name: string;
  agentRate: number;
  vipRate: number;
  salesRate: number;
}

export interface AgentEntry {
  id: string;
  customerName: string;
  commodity: string;
  grossWeight: number;
  containerWeight: number;
  actualWeight: number;
  rate: number;
  amount: number;
  weightImage?: string;
  itemImage?: string;
  createdBy: string;
  createdAt: string;
}

export interface VipEntry {
  id: string;
  customerName: string;
  commodity: string;
  grossWeight: number;
  containerWeight: number;
  actualWeight: number;
  rate: number;
  amount: number;
  weightImage?: string;
  itemImage?: string;
  createdBy: string;
  createdAt: string;
}

export interface SalesEntry {
  id: string;
  customerName: string;
  commodity?: string;
  grossWeight: number;
  containerWeight: number;
  weight: number;
  rate?: number;
  amount?: number;
  isExchange: boolean;
  exchangeCommodity?: string;
  exchangeWeight?: number;
  exchangeFee?: number;
  weightImage?: string;
  itemImage?: string;
  createdBy: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  notes: string;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  salary: number;
  paid: number;
  balance: number;
}
