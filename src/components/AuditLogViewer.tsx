import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

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

const AuditLogViewer = ({ tableName, title, limit = 50 }: AuditLogViewerProps) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

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

  if (entries.length === 0) return null;

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
        <CardContent className="overflow-x-auto">
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="border border-border rounded-lg p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <Badge variant={actionColors[e.action] as any || "secondary"} className="text-xs capitalize">
                    {e.action}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(e.created_at), "MMM dd, HH:mm")}
                  </span>
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
