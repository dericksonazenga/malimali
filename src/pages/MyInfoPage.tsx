import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, ClipboardList, Clock, CalendarDays, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface SalaryInfo {
  salary: number;
  paid: number;
  balance: number;
  role: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  signInAt: string | null;
  signOutAt: string | null;
  status: string;
}

const MyInfoPage = () => {
  const { symbol } = useCurrency();
  const { user } = useAuth();
  const [salaryInfo, setSalaryInfo] = useState<SalaryInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // Match worker by display name
      const [workerRes, attendanceRes] = await Promise.all([
        supabase.from("workers").select("*").eq("name", user.name).maybeSingle(),
        supabase
          .from("attendance")
          .select("*")
          .eq("worker_name", user.name)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(90),
      ]);

      if (workerRes.data) {
        setSalaryInfo({
          salary: Number(workerRes.data.salary),
          paid: Number(workerRes.data.paid),
          balance: Number(workerRes.data.balance),
          role: workerRes.data.role,
        });
      }

      if (attendanceRes.data) {
        setAttendance(
          attendanceRes.data.map((d: any) => ({
            id: d.id,
            date: d.date,
            signInAt: d.sign_in_at,
            signOutAt: d.sign_out_at,
            status: d.status,
          }))
        );
      }

      setLoading(false);
    };

    fetchData();

    // Realtime for attendance updates
    const channel = supabase
      .channel("my-attendance-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "workers" }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getHoursWorked = (signIn: string | null, signOut: string | null) => {
    if (!signIn || !signOut) return null;
    const diff = new Date(signOut).getTime() - new Date(signIn).getTime();
    return (diff / (1000 * 60 * 60)).toFixed(1);
  };

  const stats = useMemo(() => {
    const totalDays = attendance.length;
    const completedShifts = attendance.filter((r) => r.signInAt && r.signOutAt).length;
    const totalHours = attendance.reduce((sum, r) => {
      if (r.signInAt && r.signOutAt) {
        const diff = new Date(r.signOutAt).getTime() - new Date(r.signInAt).getTime();
        return sum + diff / (1000 * 60 * 60);
      }
      return sum;
    }, 0);
    return { totalDays, completedShifts, totalHours };
  }, [attendance]);

  const paidPercentage = salaryInfo && salaryInfo.salary > 0
    ? Math.min(100, Math.round((salaryInfo.paid / salaryInfo.salary) * 100))
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        Loading your information...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold">My Information</h1>

      <Tabs defaultValue="salary">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="salary" className="gap-2">
            <Banknote className="w-4 h-4" /> Salary
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <ClipboardList className="w-4 h-4" /> Attendance
          </TabsTrigger>
        </TabsList>

        {/* SALARY TAB */}
        <TabsContent value="salary" className="space-y-4 mt-4">
          {salaryInfo ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-5 text-center">
                    <p className="text-sm text-muted-foreground">Monthly Salary</p>
                    <p className="text-2xl font-bold font-mono text-primary">
                      {symbol}{salaryInfo.salary.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5 text-center">
                    <p className="text-sm text-muted-foreground">Paid So Far</p>
                    <p className="text-2xl font-bold font-mono text-success">
                      {symbol}{salaryInfo.paid.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5 text-center">
                    <p className="text-sm text-muted-foreground">Remaining Balance</p>
                    <p className="text-2xl font-bold font-mono text-destructive">
                      {symbol}{salaryInfo.balance.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Progress bar */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Progress</span>
                    <span className="font-mono font-semibold">{paidPercentage}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${paidPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {salaryInfo.balance > 0
                      ? `${symbol}${salaryInfo.balance.toLocaleString()} remaining to be paid`
                      : "Fully paid! ✅"}
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Banknote className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No salary record found for your account.</p>
                <p className="text-xs mt-1">Contact your administrator if this is an error.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="space-y-4 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <CalendarDays className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-sm text-muted-foreground">Days Present</p>
                <p className="text-2xl font-bold font-mono text-primary">{stats.totalDays}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-success" />
                <p className="text-sm text-muted-foreground">Completed Shifts</p>
                <p className="text-2xl font-bold font-mono text-success">{stats.completedShifts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-info" />
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold font-mono text-info">{stats.totalHours.toFixed(1)}h</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-5 h-5 text-primary" /> Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Sign In</TableHead>
                      <TableHead>Sign Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((r) => {
                      const hours = getHoursWorked(r.signInAt, r.signOutAt);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(r.date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-success">
                            {formatTime(r.signInAt)}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-destructive">
                            {formatTime(r.signOutAt)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {hours ? `${hours}h` : "—"}
                          </TableCell>
                          <TableCell>
                            {r.signInAt && r.signOutAt ? (
                              <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                                Complete
                              </Badge>
                            ) : r.signInAt ? (
                              <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                                On Shift
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                {r.status}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No attendance records found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyInfoPage;
