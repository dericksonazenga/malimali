import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Trash2, Pencil, Check, X, Mail, Phone, IdCard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface WorkerRow {
  id: string;
  name: string;
  role: string;
  created_at: string;
  email?: string | null;
  phone?: string | null;
  identification_number?: string | null;
}

const WorkersPage = () => {
  const { user, hasPermission } = useAuth();
  const canEdit = user?.role === "admin" || hasPermission("edit_records");
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; role: string }>({ name: "", role: "" });

  const fetchWorkers = useCallback(async () => {
    // Get recruited workers for full details
    const { data: recruits } = await supabase
      .from("recruited_workers")
      .select("*")
      .order("created_at", { ascending: true });

    // Also get workers table for any extra entries
    const { data: workerData } = await supabase
      .from("workers")
      .select("id, name, role, created_at")
      .order("created_at", { ascending: true });

    // Merge: prefer recruited_workers data, add any workers not in recruits
    const recruitMap = new Map<string, WorkerRow>();
    recruits?.forEach((r: any) => {
      recruitMap.set(r.name.toLowerCase(), {
        id: r.id,
        name: r.name,
        role: r.role,
        created_at: r.created_at,
        email: r.email,
        phone: r.phone,
        identification_number: r.identification_number,
      });
    });

    workerData?.forEach((w: any) => {
      if (!recruitMap.has(w.name.toLowerCase())) {
        recruitMap.set(w.name.toLowerCase(), {
          id: w.id,
          name: w.name,
          role: w.role,
          created_at: w.created_at,
        });
      }
    });

    setWorkers(Array.from(recruitMap.values()));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkers();
    const channel = supabase
      .channel("workers-list-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "recruited_workers" }, () => fetchWorkers())
      .on("postgres_changes", { event: "*", schema: "public", table: "workers" }, () => fetchWorkers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchWorkers]);

  const startEdit = (w: WorkerRow) => {
    setEditingId(w.id);
    setEditValues({ name: w.name, role: w.role });
  };

  const saveEdit = async (w: WorkerRow) => {
    // Update in recruited_workers
    await supabase.from("recruited_workers").update({ name: editValues.name, role: editValues.role }).eq("id", w.id);
    // Also update in workers table by original name
    await supabase.from("workers").update({ name: editValues.name, role: editValues.role }).eq("name", w.name);
    toast.success("Worker details updated");
    setEditingId(null);
    fetchWorkers();
  };

  const deleteWorker = async (w: WorkerRow) => {
    await supabase.from("recruited_workers").delete().eq("id", w.id);
    await supabase.from("workers").delete().eq("name", w.name);
    toast.success("Worker removed");
    fetchWorkers();
  };

  if (loading) return <p className="text-muted-foreground p-4">Loading workers…</p>;

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> All Workers ({workers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {workers.length > 0 ? (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>ID Number</TableHead>
                      <TableHead>Date Employed</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">
                          {editingId === w.id ? (
                            <Input className="h-8 w-32" value={editValues.name} onChange={(e) => setEditValues(v => ({ ...v, name: e.target.value }))} />
                          ) : w.name}
                        </TableCell>
                        <TableCell>
                          {editingId === w.id ? (
                            <Input className="h-8 w-28" value={editValues.role} onChange={(e) => setEditValues(v => ({ ...v, role: e.target.value }))} />
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{w.role}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground space-y-0.5">
                          {w.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {w.email}</div>}
                          {w.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {w.phone}</div>}
                          {!w.email && !w.phone && "—"}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          {w.identification_number || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(w.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex gap-1">
                              {editingId === w.id ? (
                                <>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(w)}>
                                    <Check className="w-4 h-4 text-success" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                                    <X className="w-4 h-4 text-destructive" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(w)}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteWorker(w)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {workers.map((w) => (
                  <div key={w.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{w.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{w.role}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(w)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteWorker(w)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {w.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {w.email}</div>}
                      {w.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {w.phone}</div>}
                      {w.identification_number && <div className="flex items-center gap-1"><IdCard className="w-3 h-3" /> {w.identification_number}</div>}
                      <div className="flex items-center gap-1">Employed: {format(new Date(w.created_at), "MMM dd, yyyy")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">No workers yet. Recruit workers from the Admin page.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkersPage;
