import { useEndOfDay } from "@/contexts/EndOfDayContext";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Moon } from "lucide-react";
import { toast } from "sonner";

const EndOfDayButton = () => {
  const { triggerEndOfDay, canTrigger } = useEndOfDay();

  const handleConfirm = () => {
    triggerEndOfDay();
    toast.success("End of Day completed! All displayed records cleared. Data is safely stored in the database.");
  };

  // Hide entirely during cooldown
  if (!canTrigger) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
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
            <br /><br />
            You won't be able to trigger this again for 3 hours.
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
