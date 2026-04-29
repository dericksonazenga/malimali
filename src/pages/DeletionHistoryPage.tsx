import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History, Search, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";
import ClearHistoryButton from "@/components/ClearHistoryButton";
import StorageOverviewCard from "@/components/StorageOverviewCard";
import { toast } from "sonner";
import { nameIncludes } from "@/utils/nameMatch";

interface DeletionEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  changed_by: string | null;
  changed_by_name: string;
  created_at: string;
  new_data: any;
  old_data: any;
}

const formatFilters = (e: DeletionEntry) => {
  if (e.action === "bulk_delete") {
    const f = e.new_data?.filters || {};
    const parts: string[] = [];
    if (f.from_date) parts.push(`from ${f.from_date}`);
    if (f.to_date) parts.push(`to ${f.to_date}`);
    if (f.customer) parts.push(`customer ~ "${f.customer}"`);
    if (f.commodity) parts.push(`commodity ~ "${f.commodity}"`);
    if (f.status) parts.push(`status: ${f.status}`);
    if (f.sort) parts.push(`sort: ${f.sort}`);
    return parts.length ? parts.join(", ") : "no filters (all rows)";
  }
  // Single-row delete — describe the record briefly
  const o = e.old_data || {};
  const bits: string[] = [];
  if (o.customer_name) bits.push(`customer: ${o.customer_name}`);
  if (o.commodity) bits.push(`commodity: ${o.commodity}`);
  if (o.amount != null) bits.push(`amount: ${o.amount}`);
  if (o.date) bits.push(`date: ${o.date}`);
  return bits.length ? `single row — ${bits.join(", ")}` : `single row (id: ${e.record_id.slice(0, 8)})`;
};

const getRowCount = (e: DeletionEntry) => e.action === "bulk_delete" ? (e.new_data?.row_count ?? 0) : 1;
const getTarget = (e: DeletionEntry) => e.new_data?.target_table || e.table_name;

const DeletionHistoryPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DeletionEntry[]>([]);
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .in("action", ["bulk_delete", "delete"])
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) { toast.error(error.message); setLoading(false); return; }
    setEntries((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
    const ch = supabase
      .channel(`deletion-history-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_log" }, () => fetchEntries())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchEntries]);

  const tableNames = useMemo(() => Array.from(new Set(entries.map(getTarget))).sort(), [entries]);

  const filtered = useMemo(() => entries.filter((e) => {
    const target = getTarget(e);
    if (tableFilter && target !== tableFilter) return false;
    if (!search.trim()) return true;
    return (
      nameIncludes(e.changed_by_name, search) ||
      nameIncludes(target, search) ||
      nameIncludes(e.action, search) ||
      nameIncludes(formatFilters(e), search)
    );
  }), [entries, search, tableFilter]);

  const totalRows = filtered.reduce((sum, e) => sum + getRowCount(e), 0);
  const bulkCount = filtered.filter(e => e.action === "bulk_delete").length;

  return (
    <div className="space-y-6 max-w-6xl">
      <StorageOverviewCard refreshMs={10000} compact />
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> Deletion History
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Audit trail of every deletion (single-row + bulk wizard) performed in your company.
              </p>
            </div>
            {user?.role === "admin" && (
              <ClearHistoryButton
                iconOnly={false}
                label="Clear Deletion History"
                actionFilter={["bulk_delete", "delete"]}
                onCleared={fetchEntries}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total events</p>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Rows deleted</p>
              <p className="text-2xl font-bold text-destructive">{totalRows}</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Tables affected</p>
              <p className="text-2xl font-bold">{tableNames.length}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search user, table, filters..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Button size="sm" variant={!tableFilter ? "default" : "outline"} onClick={() => setTableFilter("")} className="h-7 text-xs">
                All
              </Button>
              {tableNames.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={tableFilter === t ? "default" : "outline"}
                  onClick={() => setTableFilter(t)}
                  className="h-7 text-xs"
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* Table — desktop */}
          <div className="hidden md:block max-h-[600px] overflow-y-auto border border-border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No deletion events.</TableCell></TableRow>
                ) : filtered.map((e) => {
                  const target = getTarget(e);
                  const rowCount = getRowCount(e);
                  const isBulk = e.action === "bulk_delete";
                  const details = formatFilters(e);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(e.created_at), "MMM dd, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{e.changed_by_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={isBulk ? "destructive" : "secondary"} className="text-xs">
                          {isBulk ? "Bulk" : "Single"}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{target}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{rowCount}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate" title={details}>
                        {details}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {loading && <p className="text-center text-muted-foreground py-6 text-sm">Loading...</p>}
            {!loading && filtered.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No deletion events.</p>}
            {filtered.map((e) => {
              const target = getTarget(e);
              const rowCount = getRowCount(e);
              const isBulk = e.action === "bulk_delete";
              return (
                <div key={e.id} className="border border-border rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={isBulk ? "destructive" : "secondary"} className="text-[10px]">{isBulk ? "Bulk" : "Single"}</Badge>
                      <Badge variant="outline" className="font-mono text-xs">{target}</Badge>
                    </div>
                    <Badge variant="destructive">{rowCount} {rowCount === 1 ? "row" : "rows"}</Badge>
                  </div>
                  <p className="text-sm font-medium">{e.changed_by_name}</p>
                  <p className="text-xs text-muted-foreground">{formatFilters(e)}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(e.created_at), "MMM dd, yyyy HH:mm:ss")}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeletionHistoryPage;
