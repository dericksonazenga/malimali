import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useCustomRoles, BUILT_IN_ROLE_KEYS } from "@/hooks/useCustomRoles";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const RolesManager = () => {
  const { customRoles, allRoles, loading, fetchRoles } = useCustomRoles();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const toKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const handleAdd = async () => {
    const key = toKey(newName);
    if (!key) { toast.error("Enter a valid role name"); return; }
    if (allRoles.some(r => r.role_key === key)) { toast.error("Role already exists"); return; }

    setAdding(true);
    const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
    const { error } = await supabase.from("custom_roles").insert({
      role_key: key,
      display_name: newName.trim(),
      company_id,
    } as any);
    if (error) { toast.error("Failed to add role: " + error.message); setAdding(false); return; }
    toast.success(`Role "${newName.trim()}" added`);
    setNewName("");
    setShowAdd(false);
    setAdding(false);
    fetchRoles();
  };

  const handleEdit = async (id: string) => {
    const key = toKey(editName);
    if (!key) { toast.error("Enter a valid role name"); return; }
    const role = customRoles.find(r => r.id === id);
    if (!role) return;

    // Update display name and key
    const { error } = await supabase.from("custom_roles").update({
      display_name: editName.trim(),
      role_key: key,
    } as any).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }

    // Update profiles and workers that use old role key
    if (role.role_key !== key) {
      await supabase.from("profiles").update({ role: key }).eq("role", role.role_key);
      await supabase.from("recruited_workers").update({ role: key }).eq("role", role.role_key);
      await supabase.from("workers").update({ role: key }).eq("role", role.role_key);
      // Update role_permissions
      await supabase.from("role_permissions").update({ role: key }).eq("role", role.role_key);
    }

    toast.success("Role updated");
    setEditingId(null);
    fetchRoles();
  };

  const handleDelete = async () => {
    const role = customRoles.find(r => r.id === deleteId);
    if (!role) return;
    if (deleteConfirmName !== role.display_name) { toast.error("Name doesn't match"); return; }

    // Reset users with this role back to "boss"
    await supabase.from("profiles").update({ role: "boss" }).eq("role", role.role_key);
    await supabase.from("recruited_workers").update({ role: "boss" }).eq("role", role.role_key);
    await supabase.from("workers").update({ role: "boss" }).eq("role", role.role_key);
    // Remove permissions for this role
    await supabase.from("role_permissions").delete().eq("role", role.role_key);

    const { error } = await supabase.from("custom_roles").delete().eq("id", deleteId);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success(`Role "${role.display_name}" deleted`);
    setDeleteId(null);
    setDeleteConfirmName("");
    fetchRoles();
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading roles…</p>;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Manage Roles
            </span>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAdd(true)}>
              <Plus className="w-3 h-3" /> Add Role
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Built-in roles */}
          <div>
            <Label className="text-xs text-muted-foreground">Built-in Roles (cannot be deleted)</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {allRoles.filter(r => BUILT_IN_ROLE_KEYS.includes(r.role_key)).map(r => (
                <span key={r.role_key} className="px-3 py-1 text-sm rounded-full bg-muted text-muted-foreground">
                  {r.display_name}
                </span>
              ))}
            </div>
          </div>

          {/* Custom roles */}
          {customRoles.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Custom Roles</Label>
              <div className="space-y-2 mt-1">
                {customRoles.map(r => (
                  <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                    {editingId === r.id ? (
                      <>
                        <Input className="h-8 flex-1" value={editName} onChange={e => setEditName(e.target.value)} />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(r.id)}><Check className="w-3 h-3 text-green-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium">{r.display_name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{r.role_key}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(r.id); setEditName(r.display_name); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { setDeleteId(r.id); setDeleteConfirmName(""); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {customRoles.length === 0 && (
            <p className="text-sm text-muted-foreground">No custom roles yet. Add one to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>Create a custom role for your company. It will appear in role assignment and permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Role Name</Label>
              <Input placeholder="e.g. Supervisor" value={newName} onChange={e => setNewName(e.target.value)} />
              {newName.trim() && (
                <p className="text-xs text-muted-foreground">Key: <span className="font-mono">{toKey(newName)}</span></p>
              )}
            </div>
            <Button onClick={handleAdd} disabled={adding} className="w-full">
              {adding ? "Adding..." : "Add Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              This will remove the role and reset all users with this role to "Boss". Type the role name to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Type role name to confirm" value={deleteConfirmName} onChange={e => setDeleteConfirmName(e.target.value)} />
            <Button variant="destructive" className="w-full" onClick={handleDelete}
              disabled={deleteConfirmName !== customRoles.find(r => r.id === deleteId)?.display_name}>
              Delete Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RolesManager;
