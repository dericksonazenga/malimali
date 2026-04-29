import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, AlertTriangle } from "lucide-react";

const CompanySuspendedScreen = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Lock className="w-5 h-5" /> Service Suspended
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
            <p className="text-foreground">
              Your company account has been deactivated and the 10-day grace period has ended.
            </p>
          </div>
          <p className="text-muted-foreground">
            All operations are temporarily blocked. Please contact your system administrator
            to reactivate the account and restore normal access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySuspendedScreen;
