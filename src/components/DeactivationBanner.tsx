import { AlertTriangle, Clock } from "lucide-react";
import { useCompanyStatus } from "@/hooks/useCompanyStatus";

interface Props {
  variant?: "default" | "compact";
}

const DeactivationBanner = ({ variant = "default" }: Props) => {
  const { isActive, daysLeft, gracePeriodExpired } = useCompanyStatus();

  if (isActive) return null;

  if (gracePeriodExpired) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-destructive">Data Entry locked</p>
          <p className="text-muted-foreground">
            Your 10-day grace period has ended. Contact your administrator to reactivate the account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
      <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold text-amber-600 dark:text-amber-400">
          Account deactivated — {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </p>
        {variant === "default" && (
          <p className="text-muted-foreground">
            Data Entry will continue to work for {daysLeft} more {daysLeft === 1 ? "day" : "days"}.
            Reactivate before then to avoid interruption.
          </p>
        )}
      </div>
    </div>
  );
};

export default DeactivationBanner;
