import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRole } from "@/types";
import { Shield, Save, UserPlus, Trash2, Phone, Mail, Banknote, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";

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

interface WorkerRow {
  id: string;
  name: string;
  role: string;
  salary: number;
  paid: number;
  balance: number;
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("boss");
  const [loading, setLoading] = useState(true);

  // Recruitment state
  const [recruits, setRecruits] = useState<RecruitedWorker[]>([]);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIdNumber, setNewIdNumber] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("boss");
  const [newSalary, setNewSalary] = useState("");
  const [recruiting, setRecruiting] = useState(false);

  // Salary editing
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [editSalaryValue, setEditSalaryValue] = useState("");
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});

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

  const fetchWorkers = useCallback(async () => {
    const { data } = await supabase.from("workers").select("*").order("name");
    if (data) {
      setWorkers(data.map((w: any) => ({
        id: w.id, name: w.name, role: w.role,
        salary: Number(w.salary), paid: Number(w.paid), balance: Number(w.balance),
      })));
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
    fetchRecruits();
    fetchWorkers();
  }, [fetchProfiles, fetchRecruits, fetchWorkers]);

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
    const email = newEmail.trim() || null;
    const phone = newPhone.trim() || null;
    const identification_number = newIdNumber.trim() || null;

    setRecruiting(true);

    const { error: recruitErr } = await supabase.from("recruited_workers").insert({
      name: newName.trim(), email, phone, role: newRole, recruited_by: user?.id, identification_number,
    });
    if (recruitErr) { toast.error("Failed to add worker: " + recruitErr.message); setRecruiting(false); return; }

    const salary = parseFloat(newSalary) || 0;
    const { error: workerErr } = await supabase.from("workers").insert({
      name: newName.trim(), role: newRole, salary, paid: 0, balance: salary, created_by: user?.id,
    });
    if (workerErr) {
      toast.error("Recruited but failed to create salary record: " + workerErr.message);
    } else {
      toast.success("Worker recruited and salary record created!");
    }

    setNewName(""); setNewEmail(""); setNewPhone(""); setNewIdNumber(""); setNewRole("boss"); setNewSalary("");
    setRecruiting(false);
    fetchRecruits();
    fetchWorkers();
  };

  const deleteRecruit = async (id: string, name: string) => {
    const { error } = await supabase.from("recruited_workers").delete().eq("id", id);
    if (error) { toast.error("Failed to remove"); return; }
    // Also remove from workers if exists
    await supabase.from("workers").delete().eq("name", name);
    toast.success("Worker removed");
    fetchRecruits();
    fetchWorkers();
  };

  const saveSalary = async (workerId: string) => {
    const salary = parseFloat(editSalaryValue) || 0;
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;
    const newBalance = salary - worker.paid;
    const { error } = await supabase.from("workers").update({ salary, balance: newBalance }).eq("id", workerId);
    if (error) { toast.error("Failed to update salary"); return; }
    toast.success("Salary updated");
    setEditingSalaryId(null);
    fetchWorkers();
  };

  const handlePay = async (workerId: string) => {
    const amount = parseFloat(payAmounts[workerId] || "0");
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;
    const newPaid = worker.paid + amount;
    const newBalance = worker.salary - newPaid;
    const { error } = await supabase.from("workers").update({ paid: newPaid, balance: newBalance }).eq("id", workerId);
    if (error) { toast.error("Failed to record payment"); return; }
    setPayAmounts(prev => ({ ...prev, [workerId]: "" }));
    toast.success(`Payment of ${symbol}${amount.toLocaleString()} recorded`);
    fetchWorkers();
  };

  // Map recruit names to worker records
  const workerByName = (name: string) => workers.find(w => w.name.toLowerCase() === name.toLowerCase());

  const totalSalary = workers.reduce((s, w) => s + w.salary, 0);
  const totalPaid = workers.reduce((s, w) => s + w.paid, 0);
  const totalBalance = workers.reduce((s, w) => s + w.balance, 0);

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
              <Label>Worker Name</Label>
              <Input placeholder="Full name" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={v => setNewRole(v as UserRole)}>
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
            <div className="space-y-2">
              <Label>Monthly Salary ({symbol})</Label>
              <Input type="number" placeholder="0" value={newSalary} onChange={e => setNewSalary(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ID Number</Label>
              <Input placeholder="Identification number" value={newIdNumber} onChange={e => setNewIdNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" placeholder="worker@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input type="tel" placeholder="+254..." value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            </div>
          </div>

          <Button onClick={addRecruit} disabled={recruiting} className="gap-2">
            <UserPlus className="w-4 h-4" />
            {recruiting ? "Adding..." : "Recruit & Add to Payroll"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Recruited Workers + Salary ── */}
      {recruits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" /> Workers & Payroll
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Totals */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Salary</p>
                <p className="font-mono font-bold text-primary">{symbol}{totalSalary.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="font-mono font-bold text-success">{symbol}{totalPaid.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Owed</p>
                <p className="font-mono font-bold text-destructive">{symbol}{totalBalance.toLocaleString()}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Pay</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recruits.map(r => {
                    const worker = workerByName(r.name);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {r.email}</span>}
                          {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge(r.role)}`}>{roleLabel(r.role)}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${r.claimed ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {r.claimed ? "Active" : "Pending"}
                          </span>
                        </TableCell>

                        {/* Salary column */}
                        <TableCell className="font-mono">
                          {worker ? (
                            editingSalaryId === worker.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  className="w-24 h-8 text-sm"
                                  value={editSalaryValue}
                                  onChange={e => setEditSalaryValue(e.target.value)}
                                  autoFocus
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveSalary(worker.id)}>
                                  <Check className="w-3 h-3 text-success" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingSalaryId(null)}>
                                  <X className="w-3 h-3 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <span
                                className="cursor-pointer hover:underline flex items-center gap-1 text-sm"
                                onClick={() => { setEditingSalaryId(worker.id); setEditSalaryValue(String(worker.salary)); }}
                              >
                                {symbol}{worker.salary.toLocaleString()}
                                <Pencil className="w-3 h-3 text-muted-foreground" />
                              </span>
                            )
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>

                        {/* Paid */}
                        <TableCell className="font-mono text-success text-sm">
                          {worker ? `${symbol}${worker.paid.toLocaleString()}` : "—"}
                        </TableCell>

                        {/* Balance */}
                        <TableCell className="font-mono text-destructive text-sm">
                          {worker ? `${symbol}${worker.balance.toLocaleString()}` : "—"}
                        </TableCell>

                        {/* Pay input */}
                        <TableCell>
                          {worker && (
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                placeholder="Amt"
                                className="w-20 h-8 text-sm"
                                value={payAmounts[worker.id] || ""}
                                onChange={e => setPayAmounts(prev => ({ ...prev, [worker.id]: e.target.value }))}
                              />
                              <Button size="sm" className="h-8 px-2" onClick={() => handlePay(worker.id)}>
                                Pay
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          {!r.claimed && (
                            <Button variant="ghost" size="icon" onClick={() => deleteRecruit(r.id, r.name)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── User Management ── */}
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
