import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockUsers } from "@/data/mockData";
import { User, UserRole, Permission } from "@/types";
import { UserPlus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

const allPermissions: { key: Permission; label: string }[] = [
  { key: "update_rates", label: "Update Rates" },
  { key: "delete_entries", label: "Delete Entries" },
  { key: "view_reports", label: "View Reports" },
  { key: "manage_workers", label: "Manage Workers" },
  { key: "manage_expenses", label: "Manage Expenses" },
  { key: "manage_inventory", label: "Manage Inventory" },
];

const AdminPage = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("worker");
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const togglePermission = (perm: Permission) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleAddUser = () => {
    if (!name || !email) {
      toast.error("Name and email required");
      return;
    }
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      role,
      permissions: role === "admin" ? allPermissions.map((p) => p.key) : permissions,
    };
    setUsers((prev) => [...prev, newUser]);
    setName("");
    setEmail("");
    setRole("worker");
    setPermissions([]);
    toast.success("User added successfully");
  };

  const handleDelete = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.success("User removed");
  };

  const roleBadge = (r: UserRole) =>
    r === "admin" ? "bg-destructive/10 text-destructive" : r === "accountant" ? "bg-primary/10 text-primary" : r === "data_manager" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground";

  const roleLabel = (r: UserRole) =>
    r === "admin" ? "Admin" : r === "accountant" ? "Accountant" : r === "data_manager" ? "Data Manager" : "Worker";

  return (
    <div className="space-y-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Register New User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@scrap.com" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="data_manager">Data Manager</SelectItem>
                  <SelectItem value="worker">Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {role !== "admin" && (
            <div>
              <Label className="mb-2 block">Permissions</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allPermissions.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={permissions.includes(p.key)}
                      onCheckedChange={() => togglePermission(p.key)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleAddUser} className="h-12 gap-2">
            <UserPlus className="w-4 h-4" /> Add User
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> All Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge(u.role)}`}>
                      {roleLabel(u.role)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.role === "admin" ? "All" : u.permissions.join(", ") || "None"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
