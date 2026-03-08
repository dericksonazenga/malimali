import { useState, useEffect, useCallback, useMemo } from "react";
import { format, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, LogOut, Clock, CalendarDays, CalendarIcon, Users, TrendingUp, BarChart3, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const [dateRange, setDateRange] = useState<DateRange>({ from: today, to: today });
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  const openPicker = (mode: "sign_in" | "sign_out") => {
    setPickerMode(mode);
    setWorkerSearch("");
    setShowWorkerPicker(true);
  };

  const handleWorkerAction = async (worker: WorkerRow) => {
    setShowWorkerPicker(false);
    const now = new Date().toISOString();
    const userId = (await supabase.auth.getUser()).data.user?.id;

    if (pickerMode === "sign_in") {
      const existing = records.find((r) => r.workerName === worker.name && r.date === todayStr && r.signInAt);
      if (existing) {
        toast.error(`${worker.name} has already signed in today!`);
        return;
      }
      const { error } = await supabase.from("attendance").insert({
        worker_name: worker.name, sign_in_at: now, date: todayStr, status: "present", created_by: userId,
      });
      if (error) { toast.error("Failed to save attendance"); return; }
      toast.success(`✅ ${worker.name} signed in at ${new Date().toLocaleTimeString()}`);
    } else {
      const todayRecord = records.find((r) => r.workerName === worker.name && r.date === todayStr && r.signInAt && !r.signOutAt);
      if (!todayRecord) {
        toast.error(`${worker.name} hasn't signed in today or already signed out`);
        return;
      }
      const { error } = await supabase.from("attendance").update({ sign_out_at: now }).eq("id", todayRecord.id);
      if (error) { toast.error("Failed to save sign-out"); return; }
      toast.success(`✅ ${worker.name} signed out at ${new Date().toLocaleTimeString()}`);
    }
    await fetchRecords();
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Sign In/Out Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            <Button
              onClick={() => openPicker("sign_in")}
              className="w-full h-20 text-lg font-bold gap-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <UserCheck className="w-8 h-8" />
              Sign In Worker
              <LogIn className="w-6 h-6" />
            </Button>
          </CardContent>
        </Card>
        <Card className="border-2 border-destructive/20">
          <CardContent className="pt-6">
            <Button
              onClick={() => openPicker("sign_out")}
              className="w-full h-20 text-lg font-bold gap-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              <UserCheck className="w-8 h-8" />
              Sign Out Worker
              <LogOut className="w-6 h-6" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Worker Picker Dialog */}
      <Dialog open={showWorkerPicker} onOpenChange={setShowWorkerPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              {pickerMode === "sign_in" ? "Select Worker to Sign In" : "Select Worker to Sign Out"}
            </DialogTitle>
            <DialogDescription>Choose the worker from the list below.</DialogDescription>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={workerSearch} onChange={(e) => setWorkerSearch(e.target.value)} placeholder="Search worker..." className="pl-9 h-10" autoFocus />
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {workers
              .filter((w) => w.name.toLowerCase().includes(workerSearch.toLowerCase()) || w.role.toLowerCase().includes(workerSearch.toLowerCase()))
              .map((w) => (
                <button key={w.id} type="button" onClick={() => handleWorkerAction(w)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left">
                  <div>
                    <p className="font-medium text-sm">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.role}</p>
                  </div>
                </button>
              ))}
            {workers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No workers found. Add workers first.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

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