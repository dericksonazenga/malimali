import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRole } from "@/types";
import { Shield, Save, UserPlus, Trash2, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  role: string;
}

interface RecruitedWorker {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  claimed: boolean;
  created_at: string;
}

const roleBadge = (r: string) =>
  r === "admin" ? "bg-destructive/10 text-destructive" : r === "accountant" ? "bg-primary/10 text-primary" : r === "data_manager" ? "bg-accent text-accent-foreground" : r === "human_resource" ? "bg-green-500/10 text-green-700" : r === "cashier" ? "bg-yellow-500/10 text-yellow-700" : "bg-muted text-muted-foreground";

const roleLabel = (r: string) =>
  r === "admin" ? "Admin" : r === "accountant" ? "Accountant" : r === "data_manager" ? "Data Manager" : r === "human_resource" ? "Human Resource" : r === "cashier" ? "Cashier" : "Boss";

const AdminPage = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("boss");
  const [loading, setLoading] = useState(true);

  // Recruitment state
  const [recruits, setRecruits] = useState<RecruitedWorker[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("boss");
  const [contactType, setContactType] = useState<"email" | "phone">("email");
  const [recruiting, setRecruiting] = useState(false);

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

  const fetchRecruits = useCallback(async () => {
    const { data, error } = await supabase
      .from("recruited_workers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to fetch recruits:", error);
      return;
    }
    setRecruits((data as RecruitedWorker[]) || []);
  }, []);

  useEffect(() => {
    fetchProfiles();
    fetchRecruits();
  }, [fetchProfiles, fetchRecruits]);

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

  const addRecruit = async () => {
    if (!newName.trim()) {
      toast.error("Please enter worker name");
      return;
    }
    const email = contactType === "email" ? newEmail.trim() : null;
    const phone = contactType === "phone" ? newPhone.trim() : null;
    if (!email && !phone) {
      toast.error("Please enter email or phone number");
      return;
    }

    setRecruiting(true);
    const { error } = await supabase.from("recruited_workers").insert({
      name: newName.trim(),
      email,
      phone,
      role: newRole,
      recruited_by: user?.id,
    });
    if (error) {
      toast.error("Failed to add worker: " + error.message);
      setRecruiting(false);
      return;
    }
    toast.success("Worker pre-registered! They can now sign up.");
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewRole("boss");
    setRecruiting(false);
    fetchRecruits();
  };

  const deleteRecruit = async (id: string) => {
    const { error } = await supabase.from("recruited_workers").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove");
      return;
    }
    toast.success("Removed");
    fetchRecruits();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Recruit Workers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Recruit Worker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Worker Name</Label>
              <Input
                placeholder="Full name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="data_manager">Data Manager</SelectItem>
                  <SelectItem value="human_resource">Human Resource</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="boss">Boss</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contact Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={contactType === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setContactType("email")}
                className="gap-1"
              >
                <Mail className="w-4 h-4" /> Email
              </Button>
              <Button
                type="button"
                variant={contactType === "phone" ? "default" : "outline"}
                size="sm"
                onClick={() => setContactType("phone")}
                className="gap-1"
              >
                <Phone className="w-4 h-4" /> Phone
              </Button>
            </div>
          </div>

          {contactType === "email" ? (
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="worker@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                placeholder="+254..."
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
          )}

          <Button onClick={addRecruit} disabled={recruiting} className="gap-2">
            <UserPlus className="w-4 h-4" />
            {recruiting ? "Adding..." : "Add Worker"}
          </Button>

          {/* Recruited workers list */}
          {recruits.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Pre-registered Workers</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recruits.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm">
                        {r.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {r.email}</span>}
                        {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge(r.role)}`}>
                          {roleLabel(r.role)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.claimed ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {r.claimed ? "Signed Up" : "Pending"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {!r.claimed && (
                          <Button variant="ghost" size="icon" onClick={() => deleteRecruit(r.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management */}
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
