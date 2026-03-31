import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { History, ChevronDown, ChevronUp, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_by_name: string;
  created_at: string;
}

interface AuditLogViewerProps {
  tableName: string;
  title?: string;
  limit?: number;
  allowDelete?: boolean;
}

const actionColors: Record<string, string> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  payment: "outline",
};

const formatChanges = (oldData: Record<string, any> | null, newData: Record<string, any> | null, action: string) => {
  if (action === "delete" && oldData) {
    return Object.entries(oldData)
      .filter(([k]) => !["id", "created_at", "updated_at", "created_by"].includes(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  if (action === "create" && newData) {
    return Object.entries(newData)
      .filter(([k]) => !["id", "created_at", "updated_at", "created_by"].includes(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  if (oldData && newData) {
    const changes: string[] = [];
    for (const key of Object.keys(newData)) {
      if (["id", "created_at", "updated_at", "created_by"].includes(key)) continue;
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push(`${key}: ${oldData[key]} → ${newData[key]}`);
      }
    }
    return changes.join(", ") || "No visible changes";
  }
  return "—";
};

const AuditLogViewer = ({ tableName, title, limit = 50, allowDelete = false }: AuditLogViewerProps) => {
  const { hasPermission } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const canDelete = allowDelete && (hasPermission("manage_savings") || hasPermission("delete_entries"));

  const fetchLog = useCallback(async () => {
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .eq("table_name", tableName)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) setEntries(data as any[]);
  }, [tableName, limit]);

  useEffect(() => {
    fetchLog();
    const channel = supabase
      .channel(`audit-${tableName}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, () => fetchLog())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLog, tableName]);

  const handleDeleteEntry = async (entry: AuditEntry) => {
    if (!confirm("Delete this history entry?")) return;
    const { error } = await supabase.from("audit_log").delete().eq("id", entry.id);
    if (error) {
      toast.error("Failed to delete history entry");
      return;
    }
    toast.success("History entry deleted");
    setEntries(prev => prev.filter(e => e.id !== entry.id));
  };

  if (entries.length === 0) return null;

  const filtered = entries.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const details = formatChanges(e.old_data, e.new_data, e.action).toLowerCase();
    return (
      e.changed_by_name.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      details.includes(q)
    );
  });

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            {title || "Record History"} ({entries.length})
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="overflow-x-auto space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter history..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Desktop */}
          <div className="hidden md:block max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Details</TableHead>
                  {canDelete && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(e.created_at), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionColors[e.action] as any || "secondary"} className="text-xs capitalize">
                        {e.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{e.changed_by_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[400px] truncate" title={formatChanges(e.old_data, e.new_data, e.action)}>
                      {formatChanges(e.old_data, e.new_data, e.action)}
                    </TableCell>
                    {canDelete && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteEntry(e)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={canDelete ? 5 : 4} className="text-center text-muted-foreground py-4">No matching history</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Mobile */}
          <div className="md:hidden space-y-2 max-h-[480px] overflow-y-auto">
            {filtered.map((e) => (
              <div key={e.id} className="border border-border rounded-lg p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <Badge variant={actionColors[e.action] as any || "secondary"} className="text-xs capitalize">
                    {e.action}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(e.created_at), "MMM dd, HH:mm")}
                    </span>
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteEntry(e)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs font-medium">{e.changed_by_name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {formatChanges(e.old_data, e.new_data, e.action)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AuditLogViewer;
