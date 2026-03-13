import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Shield } from "lucide-react";
import { toast } from "sonner";

const ALL_ROLES = ["admin", "accountant", "data_manager", "human_resource", "cashier", "boss"] as const;
const ALL_PERMISSIONS = [
  { key: "view_dashboard", label: "View Dashboard" },
  { key: "update_rates", label: "Update Rates" },
  { key: "edit_records", label: "Edit Records" },
  { key: "delete_entries", label: "Delete All Entries" },
  { key: "delete_agent_vip_entries", label: "Delete Agent & VIP Entries" },
  { key: "delete_sales_entries", label: "Delete Sales Entries" },
  { key: "delete_expenses", label: "Delete Expenses" },
  { key: "delete_rates", label: "Delete Rate History" },
  { key: "view_reports", label: "View Reports" },
  { key: "manage_workers", label: "Manage Workers" },
  { key: "manage_expenses", label: "Manage Expenses" },
  { key: "manage_inventory", label: "Manage Inventory" },
  { key: "adjust_stock", label: "Adjust Stock" },
  { key: "manage_debts", label: "Manage Debts" },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  accountant: "Accountant",
  data_manager: "Data Manager",
  human_resource: "Human Resource",
  cashier: "Cashier",
  boss: "Boss",
};

const PermissionsManager = () => {
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    const { data, error } = await supabase.from("role_permissions").select("role, permission");
    if (error) {
      console.error("Failed to load permissions:", error);
      return;
    }
    const m: Record<string, Set<string>> = {};
    ALL_ROLES.forEach((r) => (m[r] = new Set()));
    data?.forEach((row: any) => {
      if (m[row.role]) m[row.role].add(row.permission);
    });
    setMatrix(m);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const toggleAll = async (role: string) => {
    const allSelected = ALL_PERMISSIONS.every((p) => matrix[role]?.has(p.key));
    if (allSelected) {
      for (const perm of ALL_PERMISSIONS) {
        if (matrix[role]?.has(perm.key)) {
          await supabase.from("role_permissions").delete().eq("role", role).eq("permission", perm.key);
        }
      }
    } else {
      for (const perm of ALL_PERMISSIONS) {
        if (!matrix[role]?.has(perm.key)) {
          await supabase.from("role_permissions").insert({ role, permission: perm.key });
        }
      }
    }
    setMatrix((prev) => {
      const next = { ...prev };
      next[role] = new Set(allSelected ? [] : ALL_PERMISSIONS.map((p) => p.key));
      return next;
    });
    toast.success(allSelected ? "All permissions removed" : "All permissions granted");
  };

  const toggle = async (role: string, permission: string) => {
    const has = matrix[role]?.has(permission);
    if (has) {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role", role)
        .eq("permission", permission);
      if (error) {
        toast.error("Failed to remove permission");
        return;
      }
    } else {
      const { error } = await supabase
        .from("role_permissions")
        .insert({ role, permission });
      if (error) {
        toast.error("Failed to add permission");
        return;
      }
    }

    setMatrix((prev) => {
      const next = { ...prev };
      next[role] = new Set(prev[role]);
      if (has) next[role].delete(permission);
      else next[role].add(permission);
      return next;
    });

    toast.success(`Permission ${has ? "removed" : "granted"}`);
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading permissions…</p>;

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
              {ALL_ROLES.map((role) => (
                <th key={role} className="text-center py-3 px-2 font-semibold text-muted-foreground whitespace-nowrap">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMISSIONS.map((perm) => (
              <tr key={perm.key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 pr-4 font-medium sticky left-0 bg-card z-10 min-w-[160px]">{perm.label}</td>
                {ALL_ROLES.map((role) => (
                  <td key={role} className="text-center py-3 px-2">
                    <Switch
                      checked={matrix[role]?.has(perm.key) ?? false}
                      onCheckedChange={() => toggle(role, perm.key)}
                      className="mx-auto"
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-border sticky bottom-0 bg-card z-10">
              <td className="py-3 pr-4 font-semibold text-muted-foreground sticky left-0 bg-card z-20">Select All</td>
              {ALL_ROLES.map((role) => {
                const allSelected = ALL_PERMISSIONS.every((p) => matrix[role]?.has(p.key));
                return (
                  <td key={role} className="text-center py-3 px-2">
                    <Switch
                      checked={allSelected}
                      onCheckedChange={() => toggleAll(role)}
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
