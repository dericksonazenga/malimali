import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRole } from "@/types";
import { Shield, Save, UserPlus, Trash2, Phone, Mail, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import PermissionsManager from "@/components/PermissionsManager";

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
  identification_number: string | null;
  role: string;
  claimed: boolean;
  created_at: string;
}

const roleBadge = (r: string) =>
  r === "admin" ? "bg-destructive/10 text-destructive" :
  r === "accountant" ? "bg-primary/10 text-primary" :
  r === "data_manager" ? "bg-accent text-accent-foreground" :
  r === "human_resource" ? "bg-green-500/10 text-green-700" :
  r === "cashier" ? "bg-yellow-500/10 text-yellow-700" :
  "bg-muted text-muted-foreground";

const roleLabel = (r: string) =>
  r === "admin" ? "Admin" :
  r === "accountant" ? "Accountant" :
  r === "data_manager" ? "Data Manager" :
  r === "human_resource" ? "Human Resource" :
  r === "cashier" ? "Cashier" : "Boss";

const AdminPage = () => {
  const { user } = useAuth();
  const { symbol } = useCurrency();
  const isAdmin = user?.role === "admin";

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("boss");
  const [loading, setLoading] = useState(true);

  // Recruitment state
  const [recruits, setRecruits] = useState<RecruitedWorker[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIdNumber, setNewIdNumber] = useState("");
  const [newRole, setNewRole] = useState<string>("boss");
  const [newSalary, setNewSalary] = useState("");
  const [recruiting, setRecruiting] = useState(false);

  // Editing recruit details
  const [editingRecruitId, setEditingRecruitId] = useState<string | null>(null);
  const [editRecruitValues, setEditRecruitValues] = useState<{ name: string; email: string; phone: string; id_number: string }>({ name: "", email: "", phone: "", id_number: "" });

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, role")
      .order("created_at", { ascending: true });
    if (error) { console.error("Failed to fetch profiles:", error); return; }
    setProfiles(data || []);
    setLoading(false);
  }, []);

  const fetchRecruits = useCallback(async () => {
    const { data, error } = await supabase
      .from("recruited_workers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error("Failed to fetch recruits:", error); return; }
    setRecruits((data as RecruitedWorker[]) || []);
  }, []);

  useEffect(() => {
    fetchProfiles();
    fetchRecruits();

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "recruited_workers" }, () => fetchRecruits())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchProfiles())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchProfiles, fetchRecruits]);

  const startEdit = (p: Profile) => { setEditingId(p.id); setEditRole(p.role as UserRole); };

  const saveRole = async (profileId: string) => {
    const { error } = await supabase.from("profiles").update({ role: editRole }).eq("id", profileId);
    if (error) { toast.error("Failed to update role"); return; }
    toast.success("Role updated!");
    setEditingId(null);
    fetchProfiles();
  };

  const addRecruit = async () => {
    if (!newName.trim()) { toast.error("Please enter worker name"); return; }
    if (!newEmail.trim() || !newEmail.includes("@")) { toast.error("Please enter a valid email address so the worker can create an account"); return; }

    setRecruiting(true);

    const { error: recruitErr } = await supabase.from("recruited_workers").insert({
      name: newName.trim(),
      email: newEmail.trim() || null,
      phone: newPhone.trim() || null,
      role: newRole,
      recruited_by: user?.id,
      identification_number: newIdNumber.trim() || null,
    });
    if (recruitErr) { toast.error("Failed to add worker: " + recruitErr.message); setRecruiting(false); return; }

    const salary = parseFloat(newSalary) || 0;
    const { error: workerErr } = await supabase.from("workers").insert({
      name: newName.trim(), role: newRole, salary, paid: 0, balance: salary, created_by: user?.id,
    });
    if (workerErr) {
      toast.error("Recruited but failed to create salary record: " + workerErr.message);
    } else {
      toast.success("Worker recruited and added to payroll!");
    }

    setNewName(""); setNewEmail(""); setNewPhone(""); setNewIdNumber(""); setNewRole("boss"); setNewSalary("");
    setRecruiting(false);
  };

  const deleteRecruit = async (id: string, name: string) => {
    const { error } = await supabase.from("recruited_workers").delete().eq("id", id);
    if (error) { toast.error("Failed to remove"); return; }
    await supabase.from("workers").delete().eq("name", name);
    toast.success("Worker removed");
  };

  const startEditRecruit = (r: RecruitedWorker) => {
    setEditingRecruitId(r.id);
    setEditRecruitValues({ name: r.name, email: r.email || "", phone: r.phone || "", id_number: r.identification_number || "" });
  };

  const saveRecruitEdit = async (r: RecruitedWorker) => {
    const { error } = await supabase.from("recruited_workers").update({
      name: editRecruitValues.name,
      email: editRecruitValues.email || null,
      phone: editRecruitValues.phone || null,
      identification_number: editRecruitValues.id_number || null,
    }).eq("id", r.id);
    if (error) { toast.error("Failed to update"); return; }
    // Also update workers table
    await supabase.from("workers").update({ name: editRecruitValues.name }).eq("name", r.name);
    toast.success("Worker details updated");
    setEditingRecruitId(null);
    fetchRecruits();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Recruit Worker ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Recruit Worker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Worker Name *</Label>
              <Input placeholder="Full name" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ID Number</Label>
              <Input placeholder="Identification number" value={newIdNumber} onChange={e => setNewIdNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Monthly Salary ({symbol})</Label>
              <Input type="number" placeholder="0" value={newSalary} onChange={e => setNewSalary(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input type="email" placeholder="worker@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input type="tel" placeholder="+254..." value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Initial Role</Label>
              <Select value={newRole} onValueChange={v => setNewRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boss">Boss (Default)</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="data_manager">Data Manager</SelectItem>
                  <SelectItem value="human_resource">Human Resource</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Only Admin can assign the Admin role after recruitment.</p>
            </div>
          </div>

          <Button onClick={addRecruit} disabled={recruiting} className="gap-2">
            <UserPlus className="w-4 h-4" />
            {recruiting ? "Adding..." : "Recruit Worker"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Recruited Workers List ── */}
      {recruits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Recruited Workers
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recruits.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {editingRecruitId === r.id ? (
                          <Input className="h-8 w-32" value={editRecruitValues.name} onChange={e => setEditRecruitValues(v => ({ ...v, name: e.target.value }))} />
                        ) : r.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {editingRecruitId === r.id ? (
                          <div className="space-y-1">
                            <Input className="h-7 text-xs" placeholder="Email" value={editRecruitValues.email} onChange={e => setEditRecruitValues(v => ({ ...v, email: e.target.value }))} />
                            <Input className="h-7 text-xs" placeholder="Phone" value={editRecruitValues.phone} onChange={e => setEditRecruitValues(v => ({ ...v, phone: e.target.value }))} />
                          </div>
                        ) : (
                          <>
                            {r.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {r.email}</span>}
                            {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</span>}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {editingRecruitId === r.id ? (
                          <Input className="h-7 w-28 text-xs" value={editRecruitValues.id_number} onChange={e => setEditRecruitValues(v => ({ ...v, id_number: e.target.value }))} />
                        ) : (r.identification_number || "—")}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge(r.role)}`}>{roleLabel(r.role)}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.claimed ? "bg-primary/10 text-primary" : "bg-green-100 text-green-700"}`}>
                          {r.claimed ? "Registered" : "Active"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {editingRecruitId === r.id ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveRecruitEdit(r)}><Check className="w-3 h-3 text-success" /></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingRecruitId(null)}><X className="w-3 h-3 text-destructive" /></Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditRecruit(r)}><Pencil className="w-3 h-3" /></Button>
                              {!r.claimed && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteRecruit(r.id, r.name)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile */}
            <div className="md:hidden space-y-3">
              {recruits.map(r => (
                <div key={r.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge(r.role)}`}>{roleLabel(r.role)}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditRecruit(r)}><Pencil className="w-3 h-3" /></Button>
                      {!r.claimed && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRecruit(r.id, r.name)}><Trash2 className="w-3 h-3" /></Button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {r.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {r.email}</div>}
                    {r.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</div>}
                    {r.identification_number && <div>ID: {r.identification_number}</div>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.claimed ? "bg-primary/10 text-primary" : "bg-green-100 text-green-700"}`}>
                    {r.claimed ? "Registered" : "Active"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Role Management (Admin Only) ── */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Role Assignment (Admin Only)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading users...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.display_name}</TableCell>
                        <TableCell>
                          {editingId === p.id ? (
                            <Select value={editRole} onValueChange={v => setEditRole(v as UserRole)}>
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
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => saveRole(p.id)} className="gap-1">
                                <Save className="w-3 h-3" /> Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                            </div>
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
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Permissions Manager ── */}
      {isAdmin && <PermissionsManager />}
    </div>
  );
};

export default AdminPage;
