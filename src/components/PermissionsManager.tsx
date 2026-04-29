import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, HelpCircle, Info, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useCustomRoles } from "@/hooks/useCustomRoles";
import { getCompanyId } from "@/utils/getCompanyId";

// Per-permission descriptions explaining exactly what each grant unlocks.
const PERMISSION_HELP: Record<string, string> = {
  view_dashboard: "See the main Dashboard page with daily totals and KPIs.",
  view_data_entry: "Open the Data Entry page in read-only mode (cannot add or edit).",
  view_debts: "Open the Debts page to see customer debts, advances, and creditors.",
  view_savings: "Open the Savings page to see customer savings balances.",
  view_messages: "Open the in-app Messages inbox.",
  view_my_info: "Open the personal 'My Info' tab with their attendance and salary.",
  view_settings: "Open the Settings page (read-only — cannot change global settings).",
  view_financial_report: "Open the Financial Report with profit, cost, and analytics.",
  data_entry: "Add new Agent, VIP, and Sales entries on the Data Entry page.",
  edit_records: "Edit existing entries (weight, rate, customer, etc.) after they were saved.",
  update_rates: "Change today's commodity buying/selling rates on the Rates page.",
  end_of_day: "Run End of Day — closes the working day and resets daily totals.",
  manage_debts: "Record a new debt or advance against a customer (add only).",
  pay_debts: "Record payments against existing debts.",
  edit_debts: "Modify the amount, customer, or notes of an existing debt.",
  manage_savings: "Accept a deposit into a customer's savings account.",
  edit_savings: "Withdraw from or edit a customer's savings balance.",
  manage_workers: "Add, edit, and remove workers on the Workers page.",
  manage_expenses: "Record new expenses on the Expenses page.",
  manage_inventory: "Add or remove commodities and modify the inventory list.",
  adjust_stock: "Manually adjust stock weight (e.g. corrections, spoilage).",
  delete_entries: "Delete any Agent, VIP, or Sales entry from Data Entry.",
  delete_expenses: "Delete previously recorded expenses.",
  delete_debts: "Delete a debt record entirely.",
  delete_savings: "Delete a savings transaction or close an account.",
  delete_rates: "Delete entries from the Rate Change History log.",
  delete_history: "Delete records from the End-of-Day history archive.",
};


// Grouped by section. Keys MUST match what AuthContext / ProtectedRoute check across the app.
const PERMISSION_GROUPS: { section: string; perms: { key: string; label: string }[] }[] = [
  {
    section: "Pages (View Access)",
    perms: [
      { key: "view_dashboard", label: "Dashboard" },
      { key: "view_data_entry", label: "Data Entry" },
      { key: "view_debts", label: "Debts" },
      { key: "view_savings", label: "Savings" },
      { key: "view_messages", label: "Messages" },
      { key: "view_my_info", label: "My Info" },
      { key: "view_settings", label: "Settings" },
      { key: "view_financial_report", label: "Financial Report" },
    ],
  },
  {
    section: "Data Entry & Records",
    perms: [
      { key: "data_entry", label: "Add Entries" },
      { key: "edit_records", label: "Edit Entries" },
      { key: "update_rates", label: "Update Rates" },
      { key: "end_of_day", label: "End of Day" },
    ],
  },
  {
    section: "Debts & Savings",
    perms: [
      { key: "manage_debts", label: "Add Debts" },
      { key: "pay_debts", label: "Pay Debts" },
      { key: "edit_debts", label: "Edit Debts" },
      { key: "manage_savings", label: "Deposit Savings" },
      { key: "edit_savings", label: "Edit / Withdraw Savings" },
    ],
  },
  {
    section: "Operations",
    perms: [
      { key: "manage_workers", label: "Manage Workers" },
      { key: "manage_expenses", label: "Manage Expenses" },
      { key: "manage_inventory", label: "Manage Inventory" },
      { key: "adjust_stock", label: "Adjust Stock" },
    ],
  },
  {
    section: "Delete Permissions",
    perms: [
      { key: "delete_entries", label: "Delete Any Entry" },
      { key: "delete_expenses", label: "Delete Expenses" },
      { key: "delete_debts", label: "Delete Debts" },
      { key: "delete_savings", label: "Delete Savings" },
      { key: "delete_rates", label: "Delete Rate History" },
      { key: "delete_history", label: "Delete History Records" },
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.perms);

const PermissionsManager = () => {
  const { allRoles, loading: rolesLoading } = useCustomRoles();
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    const company_id = await getCompanyId();
    const { data, error } = await supabase
      .from("role_permissions")
      .select("role, permission")
      .eq("company_id", company_id);
    if (error) {
      console.error("Failed to load permissions:", error);
      return;
    }
    const m: Record<string, Set<string>> = {};
    data?.forEach((row: any) => {
      if (!m[row.role]) m[row.role] = new Set();
      m[row.role].add(row.permission);
    });
    setMatrix(m);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPermissions();
    const channelName = `permissions-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "role_permissions" }, () => fetchPermissions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPermissions]);

  const toggleAll = async (role: string) => {
    if (role === "admin") return;
    const currentPerms = matrix[role] || new Set();
    const allSelected = ALL_PERMISSIONS.every((p) => currentPerms.has(p.key));
    const company_id = await getCompanyId();

    // Optimistic update first
    setMatrix((prev) => {
      const next = { ...prev };
      next[role] = new Set(allSelected ? [] : ALL_PERMISSIONS.map((p) => p.key));
      return next;
    });

    try {
      if (allSelected) {
        // Remove all permissions for this role in this company
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", role)
          .eq("company_id", company_id);
        if (error) throw error;
      } else {
        // Add missing permissions
        const toInsert = ALL_PERMISSIONS
          .filter(perm => !currentPerms.has(perm.key))
          .map(perm => ({ role, permission: perm.key, company_id }));
        if (toInsert.length > 0) {
          const { error } = await supabase.from("role_permissions").insert(toInsert);
          if (error) throw error;
        }
      }
      toast.success(allSelected ? "All permissions removed" : "All permissions granted");
    } catch (err: any) {
      toast.error("Failed to update permissions: " + err.message);
      fetchPermissions(); // Revert optimistic update
    }
  };

  const toggle = async (role: string, permission: string) => {
    if (role === "admin") return;
    const toggleKey = `${role}-${permission}`;
    if (toggling === toggleKey) return; // Prevent double-click
    setToggling(toggleKey);

    const has = matrix[role]?.has(permission);
    const company_id = await getCompanyId();

    // Optimistic update first
    setMatrix((prev) => {
      const next = { ...prev };
      next[role] = new Set(prev[role] || []);
      if (has) next[role].delete(permission);
      else next[role].add(permission);
      return next;
    });

    try {
      if (has) {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", role)
          .eq("permission", permission)
          .eq("company_id", company_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .insert({ role, permission, company_id });
        if (error) throw error;
      }
      toast.success(`Permission ${has ? "removed" : "granted"}`);
    } catch (err: any) {
      toast.error("Failed to update permission: " + err.message);
      fetchPermissions(); // Revert optimistic update
    } finally {
      setToggling(null);
    }
  };

  if (loading || rolesLoading) return <p className="text-muted-foreground text-sm">Loading permissions…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Role Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b">
              <th className="text-left py-3 pr-4 font-semibold text-muted-foreground sticky left-0 bg-card z-20 min-w-[160px]">Permission</th>
              {allRoles.map((role) => (
                <th key={role.role_key} className="text-center py-3 px-2 font-semibold text-muted-foreground whitespace-nowrap">
                  {role.display_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <React.Fragment key={group.section}>
                <tr key={`section-${group.section}`} className="bg-muted/40">
                  <td
                    colSpan={1 + allRoles.length}
                    className="py-2 px-3 text-xs font-bold uppercase tracking-wider text-primary sticky left-0 bg-muted/40 z-10"
                  >
                    {group.section}
                  </td>
                </tr>
                {group.perms.map((perm) => (
                  <tr key={perm.key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 pl-4 font-medium sticky left-0 bg-card z-10 min-w-[160px]">{perm.label}</td>
                    {allRoles.map((role) => (
                      <td key={role.role_key} className="text-center py-3 px-2">
                        <Switch
                          checked={role.role_key === "admin" ? true : (matrix[role.role_key]?.has(perm.key) ?? false)}
                          onCheckedChange={() => toggle(role.role_key, perm.key)}
                          disabled={role.role_key === "admin"}
                          className="mx-auto"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
            <tr className="border-t-2 border-border sticky bottom-0 bg-card z-10">
              <td className="py-3 pr-4 font-semibold text-muted-foreground sticky left-0 bg-card z-20">Select All</td>
              {allRoles.map((role) => {
                const currentPerms = matrix[role.role_key] || new Set();
                const allSelected = role.role_key === "admin" ? true : ALL_PERMISSIONS.every((p) => currentPerms.has(p.key));
                return (
                  <td key={role.role_key} className="text-center py-3 px-2">
                    <Switch
                      checked={allSelected}
                      onCheckedChange={() => toggleAll(role.role_key)}
                      disabled={role.role_key === "admin"}
                      className="mx-auto"
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground mt-4">
          Changes take effect instantly on all users.
        </p>
      </CardContent>
    </Card>
  );
};

export default PermissionsManager;
