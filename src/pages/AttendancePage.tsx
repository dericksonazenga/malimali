import { useState, useEffect, useCallback, useMemo } from "react";
import { format, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, LogOut, Clock, CalendarDays, CalendarIcon, Users, TrendingUp, BarChart3, UserCheck, QrCode, UserMinus, AlertTriangle, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import QRScanner from "@/components/QRScanner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
interface AttendanceRecord {
  id: string;
  workerName: string;
  signInAt: string | null;
  signOutAt: string | null;
  date: string;
  status: string;
}

interface WorkerRow {
  id: string;
  name: string;
  role: string;
}

type DateRange = { from: Date; to: Date };

const presetRanges = (today: Date): { label: string; range: DateRange }[] => [
  { label: "Today", range: { from: today, to: today } },
  { label: "This Week", range: { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) } },
  { label: "This Month", range: { from: startOfMonth(today), to: endOfMonth(today) } },
  { label: "Last 7 Days", range: { from: subDays(today, 6), to: today } },
  { label: "Last 30 Days", range: { from: subDays(today, 29), to: today } },
];

const AttendancePage = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [activeTab, setActiveTab] = useState("today");
  const [signInWorker, setSignInWorker] = useState<string>("");
  const [signOutWorker, setSignOutWorker] = useState<string>("");
  const [showQR, setShowQR] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState("08:00");
  const [showStartTimeSetting, setShowStartTimeSetting] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const [dateRange, setDateRange] = useState<DateRange>({ from: today, to: today });
  const [calendarOpen, setCalendarOpen] = useState(false);

  // QR code URL - workers scan this to sign in
  const qrToken = useMemo(() => `${todayStr}-attendance`, [todayStr]);
  const qrUrl = `${window.location.origin}/attendance-scan?date=${todayStr}&token=${qrToken}`;

  const fetchRecords = useCallback(async () => {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) {
      setRecords(data.map((d: any) => ({
        id: d.id,
        workerName: d.worker_name,
        signInAt: d.sign_in_at,
        signOutAt: d.sign_out_at,
        date: d.date,
        status: d.status,
      })));
    }
  }, []);

  const fetchWorkers = useCallback(async () => {
    const { data } = await supabase.from("workers").select("id, name, role").order("name");
    if (data) setWorkers(data);
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchWorkers();
    const channel = supabase
      .channel("attendance-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => fetchRecords())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRecords, fetchWorkers]);

  const todayRecords = useMemo(() => records.filter((r) => r.date === todayStr), [records, todayStr]);
  const activeWorkers = useMemo(() => todayRecords.filter((r) => r.signInAt && !r.signOutAt), [todayRecords]);

  const historyRecords = useMemo(() => {
    const fromStr = format(dateRange.from, "yyyy-MM-dd");
    const toStr = format(dateRange.to, "yyyy-MM-dd");
    return records.filter((r) => r.date >= fromStr && r.date <= toStr);
  }, [records, dateRange]);

  const summaryStats = useMemo(() => {
    const fromStr = format(dateRange.from, "yyyy-MM-dd");
    const toStr = format(dateRange.to, "yyyy-MM-dd");
    const rangeRecords = records.filter((r) => r.date >= fromStr && r.date <= toStr);

    const uniqueWorkers = [...new Set(rangeRecords.map((r) => r.workerName))];
    const uniqueDates = [...new Set(rangeRecords.map((r) => r.date))];
    const totalDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).length;
    const completedShifts = rangeRecords.filter((r) => r.signInAt && r.signOutAt).length;
    const incompleteShifts = rangeRecords.filter((r) => r.signInAt && !r.signOutAt).length;

    const workerStats = uniqueWorkers.map((name) => {
      const workerRecords = rangeRecords.filter((r) => r.workerName === name);
      const daysPresent = [...new Set(workerRecords.map((r) => r.date))].length;
      const completed = workerRecords.filter((r) => r.signInAt && r.signOutAt).length;
      const totalHours = workerRecords.reduce((sum, r) => {
        if (r.signInAt && r.signOutAt) {
          const diff = new Date(r.signOutAt).getTime() - new Date(r.signInAt).getTime();
          return sum + diff / (1000 * 60 * 60);
        }
        return sum;
      }, 0);
      return { name, daysPresent, completed, totalHours, attendanceRate: totalDays > 0 ? (daysPresent / totalDays) * 100 : 0 };
    }).sort((a, b) => b.daysPresent - a.daysPresent);

    const dailyBreakdown = uniqueDates.sort().reverse().map((date) => {
      const dayRecords = rangeRecords.filter((r) => r.date === date);
      return {
        date,
        present: dayRecords.length,
        completed: dayRecords.filter((r) => r.signOutAt).length,
        incomplete: dayRecords.filter((r) => !r.signOutAt).length,
      };
    });

    return {
      totalRecords: rangeRecords.length,
      uniqueWorkers: uniqueWorkers.length,
      activeDays: uniqueDates.length,
      totalDays,
      completedShifts,
      incompleteShifts,
      workerStats,
      dailyBreakdown,
    };
  }, [records, dateRange]);

  const handleSignIn = async (workerName: string) => {
    const worker = workers.find(w => w.name === workerName);
    if (!worker) return;
    const now = new Date().toISOString();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const existing = records.find((r) => r.workerName === worker.name && r.date === todayStr && r.signInAt);
    if (existing) { toast.error(`${worker.name} has already signed in today!`); setSignInWorker(""); return; }
    const { error } = await supabase.from("attendance").insert({
      worker_name: worker.name, sign_in_at: now, date: todayStr, status: "present", created_by: userId,
    });
    if (error) { toast.error("Failed to save attendance"); return; }
    toast.success(`✅ ${worker.name} signed in at ${new Date().toLocaleTimeString()}`);
    setSignInWorker("");
    await fetchRecords();
  };

  const handleSignOut = async (workerName: string) => {
    const worker = workers.find(w => w.name === workerName);
    if (!worker) return;
    const now = new Date().toISOString();
    const todayRecord = records.find((r) => r.workerName === worker.name && r.date === todayStr && r.signInAt && !r.signOutAt);
    if (!todayRecord) { toast.error(`${worker.name} hasn't signed in today or already signed out`); setSignOutWorker(""); return; }
    const { error } = await supabase.from("attendance").update({ sign_out_at: now }).eq("id", todayRecord.id);
    if (error) { toast.error("Failed to save sign-out"); return; }
    toast.success(`✅ ${worker.name} signed out at ${new Date().toLocaleTimeString()}`);
    setSignOutWorker("");
    await fetchRecords();
  };

  const handleSignOutAll = async () => {
    if (activeWorkers.length === 0) {
      toast.error("No workers to sign out");
      return;
    }
    const now = new Date().toISOString();
    const ids = activeWorkers.map((r) => r.id);
    const { error } = await supabase
      .from("attendance")
      .update({ sign_out_at: now })
      .in("id", ids);
    if (error) {
      toast.error("Failed to sign out all workers");
      return;
    }
    toast.success(`✅ ${activeWorkers.length} worker(s) signed out`);
    await fetchRecords();
  };

  const handleQRScan = async (decodedText: string) => {
    setScanning(false);
    // If scanned text is a URL with worker info, or just a worker name
    try {
      const url = new URL(decodedText);
      // It's our attendance URL - redirect or handle
      window.location.href = decodedText;
    } catch {
      // Treat as worker name
      const worker = workers.find(w => w.name.toLowerCase() === decodedText.toLowerCase());
      if (worker) {
        await handleSignIn(worker.name);
      } else {
        toast.error(`Worker "${decodedText}" not found`);
      }
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Sign In Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sign In Card */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-lg">
              <UserCheck className="w-6 h-6" />
              Sign In Worker
              <LogIn className="w-5 h-5" />
            </div>
            <Select value={signInWorker} onValueChange={(val) => { setSignInWorker(val); handleSignIn(val); }}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select worker to sign in..." />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.name}>
                    {w.name} — <span className="text-muted-foreground">{w.role}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* QR Section */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <QrCode className="w-4 h-4" /> QR Code Options
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)} className="gap-2">
                  <QrCode className="w-4 h-4" /> {showQR ? "Hide QR" : "Show QR for Workers"}
                </Button>
              </div>
              {showQR && (
                <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-lg border border-border">
                  <QRCodeSVG value={qrUrl} size={200} />
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Workers scan this with their phone to sign in automatically
                  </p>
                </div>
              )}
              <QRScanner onScan={handleQRScan} scanning={scanning} onToggle={() => setScanning(!scanning)} />
            </div>
          </CardContent>
        </Card>

        {/* Sign Out Card */}
        <Card className="border-2 border-destructive/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-destructive font-bold text-lg">
              <UserCheck className="w-6 h-6" />
              Sign Out Worker
              <LogOut className="w-5 h-5" />
            </div>

            {/* Sign Out All */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full h-12 gap-2 text-base"
                  disabled={activeWorkers.length === 0}
                >
                  <Users className="w-5 h-5" />
                  Sign Out All ({activeWorkers.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out all workers?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will sign out <span className="font-semibold">{activeWorkers.length} worker(s)</span> currently on shift: {activeWorkers.map(w => w.workerName).join(", ")}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOutAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sign Out All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Single Worker Sign Out */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <UserMinus className="w-4 h-4" /> Sign Out Individual Worker
              </div>
              <Select value={signOutWorker} onValueChange={(val) => { setSignOutWorker(val); handleSignOut(val); }}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select worker to sign out..." />
                </SelectTrigger>
                <SelectContent>
                  {workers.filter((w) => todayRecords.some((r) => r.workerName === w.name && r.signInAt && !r.signOutAt)).map((w) => (
                    <SelectItem key={w.id} value={w.name}>
                      {w.name} — <span className="text-muted-foreground">{w.role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Today / History */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today" className="gap-2"><CalendarDays className="w-4 h-4" /> Today</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><BarChart3 className="w-4 h-4" /> History & Stats</TabsTrigger>
        </TabsList>

        {/* TODAY TAB */}
        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" /> Today's Attendance — {format(today, "PPP")}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {todayRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No attendance records for today</p>
              ) : (
                <>
                  <div className="flex gap-4 mb-4 flex-wrap">
                    <Badge variant="secondary" className="px-3 py-1.5">
                      <Users className="w-3 h-3 mr-1" /> {todayRecords.length} present
                    </Badge>
                    <Badge variant="default" className="px-3 py-1.5">
                      {todayRecords.filter((r) => r.signOutAt).length} completed
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1.5">
                      {todayRecords.filter((r) => !r.signOutAt).length} still in
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Worker</TableHead>
                        <TableHead>Sign In</TableHead>
                        <TableHead>Sign Out</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayRecords.map((r) => {
                        const duration = r.signInAt && r.signOutAt
                          ? ((new Date(r.signOutAt).getTime() - new Date(r.signInAt).getTime()) / (1000 * 60 * 60)).toFixed(1)
                          : null;
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.workerName}</TableCell>
                            <TableCell><span className="flex items-center gap-1"><Clock className="w-3 h-3 text-muted-foreground" />{formatTime(r.signInAt)}</span></TableCell>
                            <TableCell><span className="flex items-center gap-1"><Clock className="w-3 h-3 text-muted-foreground" />{formatTime(r.signOutAt)}</span></TableCell>
                            <TableCell className="font-mono text-sm">{duration ? `${duration}h` : "—"}</TableCell>
                            <TableCell>
                              <Badge variant={r.signOutAt ? "default" : "secondary"}>
                                {r.signOutAt ? "Complete" : "Signed In"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Period:</span>
                <div className="flex flex-wrap gap-2">
                  {presetRanges(today).map((p) => (
                    <Button
                      key={p.label}
                      variant={format(dateRange.from, "yyyy-MM-dd") === format(p.range.from, "yyyy-MM-dd") && format(dateRange.to, "yyyy-MM-dd") === format(p.range.to, "yyyy-MM-dd") ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateRange(p.range)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {format(dateRange.from, "MMM d")} — {format(dateRange.to, "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        if (range?.from) {
                          setDateRange({ from: range.from, to: range.to || range.from });
                          if (range.to) setCalendarOpen(false);
                        }
                      }}
                      numberOfMonths={2}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold font-mono">{summaryStats.totalRecords}</p>
                <p className="text-xs text-muted-foreground">Total Entries</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold font-mono">{summaryStats.uniqueWorkers}</p>
                <p className="text-xs text-muted-foreground">Workers Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold font-mono text-primary">{summaryStats.completedShifts}</p>
                <p className="text-xs text-muted-foreground">Completed Shifts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold font-mono text-warning">{summaryStats.incompleteShifts}</p>
                <p className="text-xs text-muted-foreground">Incomplete</p>
              </CardContent>
            </Card>
          </div>

          {summaryStats.workerStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-5 h-5" /> Worker Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead className="text-center">Days Present</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-center">Total Hours</TableHead>
                      <TableHead className="text-center">Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryStats.workerStats.map((ws) => (
                      <TableRow key={ws.name}>
                        <TableCell className="font-medium">{ws.name}</TableCell>
                        <TableCell className="text-center font-mono">{ws.daysPresent} / {summaryStats.totalDays}</TableCell>
                        <TableCell className="text-center font-mono">{ws.completed}</TableCell>
                        <TableCell className="text-center font-mono">{ws.totalHours.toFixed(1)}h</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={ws.attendanceRate >= 80 ? "default" : ws.attendanceRate >= 50 ? "secondary" : "destructive"}>
                            {ws.attendanceRate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {summaryStats.dailyBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="w-5 h-5" /> Daily Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-center">Incomplete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryStats.dailyBreakdown.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">{format(parseISO(day.date), "EEE, MMM d yyyy")}</TableCell>
                        <TableCell className="text-center font-mono">{day.present}</TableCell>
                        <TableCell className="text-center font-mono text-primary">{day.completed}</TableCell>
                        <TableCell className="text-center">
                          {day.incomplete > 0 ? (
                            <Badge variant="destructive" className="font-mono">{day.incomplete}</Badge>
                          ) : (
                            <span className="font-mono text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {historyRecords.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No attendance records found for the selected period
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendancePage;
