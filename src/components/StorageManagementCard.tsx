import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HardDrive, Trash2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const StorageManagementCard = () => {
  const [usage, setUsage] = useState(0);
  const [quota, setQuota] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const est = await navigator.storage.estimate();
        setUsage(est.usage || 0);
        setQuota(est.quota || 0);
      }
      let cSize = 0;
      if ("caches" in window) {
        const names = await caches.keys();
        for (const n of names) {
          const cache = await caches.open(n);
          const reqs = await cache.keys();
          for (const req of reqs) {
            const res = await cache.match(req);
            if (res) {
              const blob = await res.clone().blob();
              cSize += blob.size;
            }
          }
        }
      }
      // Add localStorage/sessionStorage
      let lsSize = 0;
      for (const k in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, k)) {
          lsSize += (localStorage[k]?.length || 0) + k.length;
        }
      }
      for (const k in sessionStorage) {
        if (Object.prototype.hasOwnProperty.call(sessionStorage, k)) {
          lsSize += (sessionStorage[k]?.length || 0) + k.length;
        }
      }
      setCacheSize(cSize + lsSize * 2);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleClear = async () => {
    if (!confirm("Clear cached data? You will stay logged in but temporary files will be removed.")) return;
    setClearing(true);
    try {
      // Preserve auth tokens
      const preserved: Record<string, string> = {};
      for (const k in localStorage) {
        if (k.startsWith("sb-") || k.includes("supabase")) {
          preserved[k] = localStorage[k];
        }
      }

      // Clear caches
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }

      // Clear session storage
      sessionStorage.clear();

      // Clear localStorage except auth
      const keysToRemove: string[] = [];
      for (const k in localStorage) {
        if (!preserved[k]) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Clear service worker caches if any
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }

      toast.success("Cache cleared successfully");
      await refresh();
    } catch (e) {
      toast.error("Failed to clear cache");
    } finally {
      setClearing(false);
    }
  };

  const available = Math.max(quota - usage, 0);
  const pct = quota > 0 ? (usage / quota) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" /> Storage Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-accent/50 border border-border">
            <p className="text-xs text-muted-foreground">Used</p>
            <p className="text-sm sm:text-base font-bold font-mono whitespace-nowrap overflow-x-auto scrollbar-none">{formatBytes(usage)}</p>
          </div>
          <div className="p-3 rounded-lg bg-accent/50 border border-border">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-sm sm:text-base font-bold font-mono whitespace-nowrap overflow-x-auto scrollbar-none text-success">{formatBytes(available)}</p>
          </div>
          <div className="p-3 rounded-lg bg-accent/50 border border-border">
            <p className="text-xs text-muted-foreground">Cache</p>
            <p className="text-sm sm:text-base font-bold font-mono whitespace-nowrap overflow-x-auto scrollbar-none text-primary">{formatBytes(cacheSize)}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{pct.toFixed(1)}% of {formatBytes(quota)} used</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleClear} disabled={clearing} variant="destructive" size="sm" className="gap-1">
            {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Clear Cache
          </Button>
          <Button onClick={refresh} disabled={loading} variant="outline" size="sm" className="gap-1">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Clearing cache removes temporary files and offline data. Your login session and saved settings on the server will not be affected.
        </p>
      </CardContent>
    </Card>
  );
};

export default StorageManagementCard;
