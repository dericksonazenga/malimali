import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, ClipboardList, Clock, CalendarDays, CheckCircle, UserCircle, MessageSquare, Mail, Phone, IdCard, Camera, Loader2 } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

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

interface ProfileDetails {
  display_name: string;
  role: string;
  phone: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  identification_number: string | null;
}

interface MessageItem {
  id: string;
  subject: string;
  body: string;
  sent_at: string | null;
  sender_name: string;
}

interface SalaryPaymentRecord {
  id: string;
  amount: number;
  type: string;
  paid_by_name: string;
  notes: string;
  created_at: string;
}

const MyInfoPage = () => {
  const { symbol } = useCurrency();
  const { user } = useAuth();
  const [salaryInfo, setSalaryInfo] = useState<SalaryInfo | null>(null);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPaymentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : prev);
      toast.success("Profile photo updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch profile details
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, role, phone, avatar_url, created_at, user_id")
        .eq("user_id", user.id)
        .single();

      // Fetch recruited worker for ID number
      const { data: recruitData } = await supabase
        .from("recruited_workers")
        .select("identification_number, email, phone")
        .eq("name", user.name)
        .maybeSingle();

      if (profileData) {
        setProfile({
          display_name: profileData.display_name,
          role: profileData.role,
          phone: profileData.phone || recruitData?.phone || null,
          email: user.email,
          avatar_url: profileData.avatar_url,
          created_at: profileData.created_at,
          identification_number: recruitData?.identification_number || null,
        });
      }

      // Fetch worker salary info
      const { data: workerData } = await supabase
        .from("workers")
        .select("*")
        .eq("name", user.name)
        .maybeSingle();

      if (workerData) {
        setSalaryInfo({
          salary: Number(workerData.salary),
          paid: Number(workerData.paid),
          balance: Number(workerData.balance),
          role: workerData.role,
        });
      }

      // Fetch salary payment history for this worker
      if (workerData) {
        const { data: payData } = await supabase
          .from("salary_payments")
          .select("*")
          .eq("worker_id", workerData.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (payData) setSalaryPayments(payData as SalaryPaymentRecord[]);
      }

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("worker_name", user.name)
        .order("date", { ascending: false })
        .limit(90);

      if (attendanceData) {
        setAttendance(attendanceData.map((d: any) => ({
          id: d.id,
          date: d.date,
          signInAt: d.sign_in_at,
          signOutAt: d.sign_out_at,
          status: d.status,
        })));
      }

      // Fetch received messages
      const { data: recipientData } = await supabase
        .from("message_recipients")
        .select("message_id")
        .eq("recipient_id", user.id);

      if (recipientData && recipientData.length > 0) {
        const msgIds = recipientData.map((r: any) => r.message_id);
        const { data: msgData } = await supabase
          .from("messages")
          .select("id, subject, body, sent_at, sender_id")
          .in("id", msgIds)
          .eq("is_draft", false)
          .order("sent_at", { ascending: false })
          .limit(20);

        if (msgData) {
          // Get sender names
          const senderIds = [...new Set(msgData.map((m: any) => m.sender_id))];
          const { data: senderProfiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", senderIds);
          const senderMap: Record<string, string> = {};
          senderProfiles?.forEach((p: any) => { senderMap[p.user_id] = p.display_name; });

          setMessages(msgData.map((m: any) => ({
            id: m.id,
            subject: m.subject,
            body: m.body,
            sent_at: m.sent_at,
            sender_name: senderMap[m.sender_id] || "Unknown",
          })));
        }
      }

      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("my-info-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "workers" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "salary_payments" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "message_recipients" }, () => fetchData())
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

  const roleLabel = (r: string) =>
    r === "admin" ? "Admin" : r === "accountant" ? "Accountant" : r === "data_manager" ? "Data Manager" : r === "human_resource" ? "Human Resource" : r === "cashier" ? "Cashier" : "Boss";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        Loading your information...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  user?.name?.charAt(0)
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="text-xl font-bold">{profile?.display_name || user?.name}</h2>
              <Badge variant="outline" className="text-xs">{roleLabel(profile?.role || user?.role || "boss")}</Badge>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-2">
                {profile?.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" /> {profile.email}
                  </div>
                )}
                {profile?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" /> {profile.phone}
                  </div>
                )}
                {profile?.identification_number && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <IdCard className="w-4 h-4" /> ID: {profile.identification_number}
                  </div>
                )}
                {profile?.created_at && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="w-4 h-4" /> Joined: {format(new Date(profile.created_at), "MMM dd, yyyy")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="salary">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="salary" className="gap-1 text-xs sm:text-sm">
            <Banknote className="w-4 h-4" /> Salary
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1 text-xs sm:text-sm">
            <ClipboardList className="w-4 h-4" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1 text-xs sm:text-sm">
            <MessageSquare className="w-4 h-4" /> Messages
          </TabsTrigger>
        </TabsList>

        {/* SALARY TAB */}
        <TabsContent value="salary" className="space-y-4 mt-4">
          {salaryInfo ? (
            <>
              {(() => {
                const advanceTotal = salaryPayments.filter(p => p.type === "advance").reduce((s, p) => s + p.amount, 0);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card><CardContent className="p-5 text-center">
                      <p className="text-sm text-muted-foreground">Monthly Salary</p>
                      <p className="text-2xl font-bold font-mono text-primary">{symbol}{salaryInfo.salary.toLocaleString()}</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-5 text-center">
                      <p className="text-sm text-muted-foreground">Paid So Far</p>
                      <p className="text-2xl font-bold font-mono text-success">{symbol}{salaryInfo.paid.toLocaleString()}</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-5 text-center">
                      <p className="text-sm text-muted-foreground">Advance Taken</p>
                      <p className="text-2xl font-bold font-mono text-warning">{symbol}{advanceTotal.toLocaleString()}</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-5 text-center">
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className={`text-2xl font-bold font-mono ${salaryInfo.balance < 0 ? "text-warning" : "text-destructive"}`}>
                        {symbol}{salaryInfo.balance.toLocaleString()}
                        {salaryInfo.balance < 0 && <span className="text-xs ml-1">(overpaid)</span>}
                      </p>
                    </CardContent></Card>
                  </div>
                );
              })()}

              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Progress</span>
                    <span className="font-mono font-semibold">{paidPercentage}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${paidPercentage}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {salaryInfo.balance > 0 ? `${symbol}${salaryInfo.balance.toLocaleString()} remaining to be paid` : "Fully paid! ✅"}
                  </p>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-primary" /> Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {salaryPayments.length > 0 ? (
                    <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Paid By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salaryPayments.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-sm">{format(new Date(p.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                              <TableCell>
                                <Badge variant={p.type === "advance" ? "secondary" : "outline"} className="text-xs">
                                  {p.type === "advance" ? "Advance" : "Regular"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-success">{symbol}{p.amount.toLocaleString()}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{p.paid_by_name}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-4">No payment records yet</p>
                  )}
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
                <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold font-mono">{stats.totalHours.toFixed(1)}h</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-5 h-5 text-primary" /> Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
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
                          <TableCell className="font-mono text-sm">{format(new Date(r.date), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="font-mono text-sm text-success">{formatTime(r.signInAt)}</TableCell>
                          <TableCell className="font-mono text-sm text-destructive">{formatTime(r.signOutAt)}</TableCell>
                          <TableCell className="font-mono text-sm">{hours ? `${hours}h` : "—"}</TableCell>
                          <TableCell>
                            {r.signInAt && r.signOutAt ? (
                              <Badge variant="outline" className="text-success border-success/30 bg-success/10">Complete</Badge>
                            ) : r.signInAt ? (
                              <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">On Shift</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">{r.status}</Badge>
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

        {/* MESSAGES TAB */}
        <TabsContent value="messages" className="space-y-4 mt-4">
          {messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((msg) => (
                <Card key={msg.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm">{msg.subject || "(No subject)"}</h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {msg.sent_at ? format(new Date(msg.sent_at), "MMM dd, HH:mm") : ""}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">From: {msg.sender_name}</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No messages received.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyInfoPage;
