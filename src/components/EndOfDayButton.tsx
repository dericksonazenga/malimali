import { useEndOfDay } from "@/contexts/EndOfDayContext";
import { useInventory } from "@/contexts/InventoryContext";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Moon } from "lucide-react";
import { toast } from "sonner";
import { generateDailySummary } from "@/utils/generateDailySummary";
import { supabase } from "@/integrations/supabase/client";

const EndOfDayButton = () => {
  const { triggerEndOfDay, canTrigger } = useEndOfDay();
  const { clearAll } = useInventory();

  const handleConfirm = async () => {
    // 1. Save daily summary first (captures all today's data)
    const saved = await generateDailySummary();

    // 2. Accumulate stock into persistent_stock
    await clearAll();

    // 3. Log this EOD trigger — this MUST happen after clearAll
    // so the next fetch filters out pre-EOD entries
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await supabase.from("end_of_day_log").insert({
      triggered_by: userId,
    });

    // 4. Signal UI reset
    triggerEndOfDay();

    if (saved) {
      toast.success("End of Day completed! Daily summary saved. All records reset to zero.");
    } else {
      toast.warning("End of Day completed but summary failed to save. Data is still in the database.");
    }
  };


  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="gap-2 bg-green-600 text-white hover:bg-green-700">
          <Moon className="w-4 h-4" />
          End of Day
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End of Day — Clear All Records?</AlertDialogTitle>
          <AlertDialogDescription>
            This will wipe all displayed attendance records and commodity entries (Agent, VIP, Sales) from the screen to begin a new day. 
            <br /><br />
            <strong>All data is safely retained in the database</strong> and can be accessed later via reports or exports.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Confirm End of Day
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EndOfDayButton;
