import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface ClearHistoryButtonProps {
  /** When set, only history rows for this table_name are cleared. Omit to clear ALL audit history. */
  tableName?: string;
  /** When set, only history rows whose action is in this list are cleared. */
  actionFilter?: string[];
  /** Visual label fallback when shown as a wider button. */
  label?: string;
  /** Show only the icon (default) — fits next to history headers. */
  iconOnly?: boolean;
  /** Optional callback after successful clear. */
  onCleared?: () => void;
}

const ClearHistoryButton = ({ tableName, actionFilter, label = "Clear History", iconOnly = true, onCleared }: ClearHistoryButtonProps) => {
  const { user, companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  // Admin only
  if (user?.role !== "admin") return null;

  const handleClear = async () => {
    if (!companyId) { toast.error("No company context"); return; }
    setWorking(true);
    try {
      let q: any = supabase.from("audit_log").delete().eq("company_id", companyId);
      if (tableName) q = q.eq("table_name", tableName);
      const { error } = await q;
      if (error) { toast.error(error.message); return; }
      toast.success(tableName ? `Cleared history for ${tableName}` : "Cleared all history");
      setOpen(false);
      onCleared?.();
    } finally { setWorking(false); }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            title={label}
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="destructive" size="sm" className="gap-1">
            <Trash2 className="w-4 h-4" /> {label}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear history?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes {tableName ? <strong>all history entries for <code>{tableName}</code></strong> : <strong>ALL audit history</strong>} for your company. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleClear} disabled={working} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {working ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
            Clear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ClearHistoryButton;
