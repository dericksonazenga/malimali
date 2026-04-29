import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Database, HardDrive, RefreshCw, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface TableStat { table: string; rows: number; }
interface BucketStat { bucket: string; companyFiles: number; companyBytes: number; totalFiles: number; totalBytes: number; }
interface Overview {
  company_id: string;
  generated_at: string;
  database: { total_rows: number; tables: TableStat[]; };
  storage: { company_files: number; company_bytes: number; buckets: BucketStat[]; };
}

const fmtBytes = (b: number) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0; let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 ? 2 : 1)} ${u[i]}`;
};

interface Props {
  /** Auto-refresh interval in ms. Default 15s. Set 0 to disable. */
  refreshMs?: number;
  /** Show compact (collapsed table list). */
  compact?: boolean;
}

const StorageOverviewCard = ({ refreshMs = 15000, compact = false }: Props) => {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllTables, setShowAllTables] = useState(!compact);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("storage-overview");
      if (error) { if (!silent) toast.error(error.message); return; }
      setData(res as Overview);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!refreshMs) return;
    const t = setInterval(() => load(true), refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);

  const totalRows = data?.database.total_rows ?? 0;
  const totalBytes = data?.storage.company_bytes ?? 0;
  const totalFiles = data?.storage.company_files ?? 0;
  const tables = data?.database.tables ?? [];
  const visibleTables = showAllTables ? tables : tables.slice(0, 6);
  const maxRows = tables[0]?.rows || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="w-5 h-5 text-primary" /> Live Storage Overview
            {data && (
              <span className="text-[10px] font-normal text-muted-foreground">
                · updated {new Date(data.generated_at).toLocaleTimeString()}
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => load()} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? (
          <div className="text-center text-sm text-muted-foreground py-6">Loading...</div>
        ) : !data ? (
          <div className="text-center text-sm text-muted-foreground py-6">No data.</div>
        ) : (
          <>
            {/* Summary grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat icon={<Database className="w-4 h-4" />} label="DB rows" value={totalRows.toLocaleString()} />
              <Stat icon={<Database className="w-4 h-4" />} label="Tables in use" value={String(tables.filter(t => t.rows > 0).length)} />
              <Stat icon={<HardDrive className="w-4 h-4" />} label="Files" value={totalFiles.toLocaleString()} />
              <Stat icon={<HardDrive className="w-4 h-4" />} label="File storage" value={fmtBytes(totalBytes)} />
            </div>

            {/* Per-table */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Database tables (your company)</p>
              <div className="space-y-1.5">
                {visibleTables.filter(t => t.rows > 0).map(t => (
                  <div key={t.table} className="flex items-center gap-2">
                    <span className="text-xs font-mono w-44 truncate">{t.table}</span>
                    <Progress value={(t.rows / maxRows) * 100} className="h-1.5 flex-1" />
                    <span className="text-xs tabular-nums w-14 text-right">{t.rows.toLocaleString()}</span>
                  </div>
                ))}
                {visibleTables.filter(t => t.rows > 0).length === 0 && (
                  <p className="text-xs text-muted-foreground">No data yet.</p>
                )}
              </div>
              {tables.length > 6 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs mt-2" onClick={() => setShowAllTables(s => !s)}>
                  {showAllTables ? <><ChevronUp className="w-3 h-3 mr-1" /> Show less</> : <><ChevronDown className="w-3 h-3 mr-1" /> Show all {tables.length}</>}
                </Button>
              )}
            </div>

            {/* Buckets */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">File buckets</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {data.storage.buckets.map(b => (
                  <div key={b.bucket} className="border border-border rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono">{b.bucket}</span>
                      <Badge variant="outline" className="text-[10px]">{b.companyFiles} files</Badge>
                    </div>
                    <p className="text-sm font-semibold mt-1">{fmtBytes(b.companyBytes)}</p>
                    <p className="text-[10px] text-muted-foreground">bucket total: {fmtBytes(b.totalBytes)} · {b.totalFiles} files</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="border border-border rounded-lg p-2">
    <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
      {icon}<span>{label}</span>
    </div>
    <p className="text-lg font-bold tabular-nums">{value}</p>
  </div>
);

export default StorageOverviewCard;
