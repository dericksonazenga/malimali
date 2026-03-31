import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const AttendanceScanPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const recordAttendance = async () => {
      const date = searchParams.get("date");
      const token = searchParams.get("token");
      if (!date || !token) {
        setStatus("error");
        setMessage("Invalid QR code");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus("error");
        setMessage("You must be logged in to record attendance");
        return;
      }

      // Get user's profile to match with worker name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        setStatus("error");
        setMessage("Profile not found");
        return;
      }

      const workerName = profile.display_name;

      // Check if already signed in today
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("worker_name", workerName)
        .eq("date", date)
        .not("sign_in_at", "is", null);

      if (existing && existing.length > 0) {
        setStatus("error");
        setMessage(`${workerName} has already signed in today!`);
        return;
      }

      const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
      const { error } = await supabase.from("attendance").insert({
        worker_name: workerName,
        sign_in_at: new Date().toISOString(),
        date,
        status: "present",
        created_by: user.id,
        company_id,
      });

      if (error) {
        setStatus("error");
        setMessage("Failed to record attendance");
        return;
      }

      setStatus("success");
      setMessage(`✅ ${workerName} signed in successfully!`);
      toast.success(`${workerName} signed in!`);
    };

    recordAttendance();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <p className="text-lg">Recording attendance...</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto text-primary" />
              <p className="text-lg font-semibold">{message}</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 mx-auto text-destructive" />
              <p className="text-lg font-semibold text-destructive">{message}</p>
            </>
          )}
          <Button onClick={() => navigate("/attendance")} variant="outline" className="mt-4">
            Go to Attendance
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceScanPage;
