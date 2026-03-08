export type UserRole = "admin" | "accountant" | "data_manager" | "human_resource" | "cashier" | "boss";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
}

export type Permission =
  | "update_rates"
  | "delete_entries"
  | "view_reports"
  | "manage_workers"
  | "manage_expenses"
  | "manage_inventory";

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
