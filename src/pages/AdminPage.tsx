import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRole } from "@/types";
import { Shield, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  role: string;
}

const roleBadge = (r: string) =>
  r === "admin" ? "bg-destructive/10 text-destructive" : r === "accountant" ? "bg-primary/10 text-primary" : r === "data_manager" ? "bg-accent text-accent-foreground" : r === "human_resource" ? "bg-green-500/10 text-green-700" : r === "cashier" ? "bg-yellow-500/10 text-yellow-700" : "bg-muted text-muted-foreground";

const roleLabel = (r: string) =>
  r === "admin" ? "Admin" : r === "accountant" ? "Accountant" : r === "data_manager" ? "Data Manager" : r === "human_resource" ? "Human Resource" : r === "cashier" ? "Cashier" : "Boss";

const AdminPage = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("boss");
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, role")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to fetch profiles:", error);
      return;
    }
    setProfiles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const startEdit = (p: Profile) => {
    setEditingId(p.id);
    setEditRole(p.role as UserRole);
  };

  const saveRole = async (profileId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: editRole })
      .eq("id", profileId);
    if (error) {
      toast.error("Failed to update role");
      console.error(error);
      return;
    }
    toast.success("Role updated!");
    setEditingId(null);
    fetchProfiles();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.display_name}</TableCell>
                    <TableCell>
                      {editingId === p.id ? (
                        <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                            <SelectItem value="data_manager">Data Manager</SelectItem>
                            <SelectItem value="human_resource">Human Resource</SelectItem>
                            <SelectItem value="cashier">Cashier</SelectItem>
                            <SelectItem value="boss">Boss</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge(p.role)}`}>
                          {roleLabel(p.role)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === p.id ? (
                        <Button size="sm" onClick={() => saveRole(p.id)} className="gap-1">
                          <Save className="w-3 h-3" /> Save
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => startEdit(p)}>
                          Change Role
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
