import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, Send, Inbox, FileEdit, Camera, Upload,
  Paperclip, ArrowLeft, User as UserIcon, Users, Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  subject: string;
  body: string;
  imageUrl?: string;
  isDraft: boolean;
  sentAt: string | null;
  recipientIds: string[];
  recipientRoles: string[];
  readBy: string[];
}

interface ProfileUser {
  id: string;
  name: string;
  role: string;
}

const roleCategories = [
  { key: "admin", label: "Admin" },
  { key: "accountant", label: "Accountant" },
  { key: "data_manager", label: "Data Manager" },
  { key: "worker", label: "Worker" },
  { key: "boss", label: "Boss" },
];

const MessagesPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("inbox");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "demo-1",
      senderId: "1",
      senderName: "Admin User",
      subject: "Welcome to ScrapFlow",
      body: "Welcome to the messaging system! You can send messages to specific users or entire role groups. All messages are private and only visible to recipients.",
      isDraft: false,
      sentAt: "2026-03-03T10:00:00Z",
      recipientIds: ["2", "3", "4"],
      recipientRoles: ["accountant", "data_manager", "worker"],
      readBy: [],
    },
  ]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [composing, setComposing] = useState(false);

  // Compose state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save draft
  useEffect(() => {
    if (!composing || (!subject && !body)) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [subject, body, composing]);

  const saveDraft = () => {
    if (!user || (!subject && !body)) return;
    const draft: Message = {
      id: draftId || `draft-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      subject: subject || "(No subject)",
      body,
      imageUrl: imageUrl || undefined,
      isDraft: true,
      sentAt: null,
      recipientIds: selectedRecipientIds,
      recipientRoles: selectedRoles,
      readBy: [],
    };
    setMessages((prev) => {
      const existing = prev.findIndex((m) => m.id === draft.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = draft;
        return updated;
      }
      return [...prev, draft];
    });
    if (!draftId) setDraftId(draft.id);
  };

  const inboxMessages = messages.filter(
    (m) =>
      !m.isDraft &&
      m.senderId !== user?.id &&
      (m.recipientIds.includes(user?.id || "") ||
        m.recipientRoles.includes(user?.role || ""))
  );

  const sentMessages = messages.filter(
    (m) => !m.isDraft && m.senderId === user?.id
  );

  const draftMessages = messages.filter(
    (m) => m.isDraft && m.senderId === user?.id
  );

  const handleImageCapture = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
      toast.success("Image attached");
    };
    reader.readAsDataURL(file);
  };

  const handleSendClick = () => {
    if (!body.trim()) {
      toast.error("Message body is required");
      return;
    }
    setShowRecipientPicker(true);
  };

  const resolveRecipientIds = (): string[] => {
    const ids = new Set(selectedRecipientIds);
    selectedRoles.forEach((role) => {
      mockUsers
        .filter((u) => u.role === role && u.id !== user?.id)
        .forEach((u) => ids.add(u.id));
    });
    return Array.from(ids);
  };

  const handleConfirmSend = () => {
    if (!user) return;
    const allRecipientIds = resolveRecipientIds();
    if (allRecipientIds.length === 0) {
      toast.error("Select at least one recipient");
      return;
    }
    const msg: Message = {
      id: draftId || `msg-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      subject: subject || "(No subject)",
      body,
      imageUrl: imageUrl || undefined,
      isDraft: false,
      sentAt: new Date().toISOString(),
      recipientIds: allRecipientIds,
      recipientRoles: selectedRoles,
      readBy: [],
    };
    setMessages((prev) => {
      const filtered = draftId ? prev.filter((m) => m.id !== draftId) : prev;
      return [...filtered, msg];
    });
    resetCompose();
    setShowRecipientPicker(false);
    toast.success("Message sent!");
  };

  const resetCompose = () => {
    setSubject("");
    setBody("");
    setImageUrl(null);
    setDraftId(null);
    setSelectedRecipientIds([]);
    setSelectedRoles([]);
    setComposing(false);
  };

  const openDraft = (msg: Message) => {
    setSubject(msg.subject === "(No subject)" ? "" : msg.subject);
    setBody(msg.body);
    setImageUrl(msg.imageUrl || null);
    setDraftId(msg.id);
    setSelectedRecipientIds(msg.recipientIds);
    setSelectedRoles(msg.recipientRoles);
    setComposing(true);
    setSelectedMessage(null);
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getRecipientSummary = (msg: Message) => {
    const names = msg.recipientIds
      .map((id) => mockUsers.find((u) => u.id === id)?.name || "Unknown")
      .slice(0, 2);
    const roleLabels = msg.recipientRoles.map(
      (r) => roleCategories.find((rc) => rc.key === r)?.label || r
    );
    const parts = [...names, ...roleLabels];
    if (parts.length > 3) return parts.slice(0, 3).join(", ") + "...";
    return parts.join(", ") || "No recipients";
  };

  // Message list component
  const MessageList = ({ items, emptyText }: { items: Message[]; emptyText: string }) => (
    <ScrollArea className="h-[500px]">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-1 p-1">
          {items.map((msg) => (
            <button
              key={msg.id}
              onClick={() => msg.isDraft ? openDraft(msg) : setSelectedMessage(msg)}
              className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm truncate">
                  {msg.senderId === user?.id ? `To: ${getRecipientSummary(msg)}` : msg.senderName}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formatTime(msg.sentAt || msg.sentAt)}
                </span>
              </div>
              <p className="text-sm font-medium truncate">{msg.subject}</p>
              <p className="text-xs text-muted-foreground truncate">{msg.body}</p>
              <div className="flex gap-1 mt-1">
                {msg.isDraft && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                {msg.imageUrl && <Badge variant="outline" className="text-xs">📎 Image</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  // Detail view
  if (selectedMessage) {
    return (
      <div className="max-w-3xl space-y-4">
        <Button variant="ghost" onClick={() => setSelectedMessage(null)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                {selectedMessage.senderName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  From: <span className="font-medium text-foreground">{selectedMessage.senderName}</span>
                </p>
                <p className="text-xs text-muted-foreground">{formatTime(selectedMessage.sentAt)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Chat bubble style */}
            <div className={cn(
              "max-w-[80%] rounded-2xl p-4 mb-3",
              selectedMessage.senderId === user?.id
                ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted rounded-bl-sm"
            )}>
              <p className="text-sm whitespace-pre-wrap">{selectedMessage.body}</p>
              {selectedMessage.imageUrl && (
                <img
                  src={selectedMessage.imageUrl}
                  alt="Attachment"
                  className="mt-3 rounded-lg max-w-full max-h-64 object-contain"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {formatTime(selectedMessage.sentAt)}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compose view
  if (composing) {
    return (
      <div className="max-w-3xl space-y-4">
        <Button variant="ghost" onClick={() => { saveDraft(); resetCompose(); }} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back (saved as draft)
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-primary" /> Compose Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-lg font-medium"
              />
            </div>
            <Textarea
              placeholder="Type your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[180px] resize-none"
            />
            {imageUrl && (
              <div className="relative inline-block">
                <img src={imageUrl} alt="Attached" className="max-h-40 rounded-lg border" />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                  onClick={() => setImageUrl(null)}
                >
                  ×
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageCapture(e.target.files[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageCapture(e.target.files[0])}
              />
              <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} className="gap-2">
                <Camera className="w-4 h-4" /> Camera
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="w-4 h-4" /> Upload
              </Button>
              <div className="flex-1" />
              <Badge variant="secondary" className="text-xs">Auto-saving drafts</Badge>
              <Button onClick={handleSendClick} className="gap-2">
                <Send className="w-4 h-4" /> Send
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recipient Picker Dialog */}
        <Dialog open={showRecipientPicker} onOpenChange={setShowRecipientPicker}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Choose Recipients</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* By role category */}
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" /> By Role Category
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {roleCategories.map((rc) => (
                    <label key={rc.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-accent">
                      <Checkbox
                        checked={selectedRoles.includes(rc.key)}
                        onCheckedChange={() => toggleRole(rc.key)}
                      />
                      {rc.label}
                      <Badge variant="outline" className="ml-auto text-xs">
                        {mockUsers.filter((u) => u.role === rc.key && u.id !== user?.id).length}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>
              {/* By individual user */}
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> By User
                </p>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {mockUsers
                      .filter((u) => u.id !== user?.id)
                      .map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-accent">
                          <Checkbox
                            checked={selectedRecipientIds.includes(u.id)}
                            onCheckedChange={() => toggleRecipient(u.id)}
                          />
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{u.role.replace("_", " ")}</p>
                          </div>
                        </label>
                      ))}
                  </div>
                </ScrollArea>
              </div>
              <Button onClick={handleConfirmSend} className="w-full gap-2">
                <Check className="w-4 h-4" /> Confirm & Send
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Main view - Inbox / Sent / Drafts tabs
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" /> Messages
        </h2>
        <Button onClick={() => setComposing(true)} className="gap-2">
          <FileEdit className="w-4 h-4" /> Compose
        </Button>
      </div>

      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3 mx-0">
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="w-4 h-4" /> Inbox
              {inboxMessages.length > 0 && (
                <Badge className="ml-1 h-5 min-w-[20px] px-1.5">{inboxMessages.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Send className="w-4 h-4" /> Sent
            </TabsTrigger>
            <TabsTrigger value="drafts" className="gap-2">
              <FileEdit className="w-4 h-4" /> Drafts
              {draftMessages.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">{draftMessages.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="inbox">
            <MessageList items={inboxMessages} emptyText="No messages in your inbox" />
          </TabsContent>
          <TabsContent value="sent">
            <MessageList items={sentMessages} emptyText="No sent messages" />
          </TabsContent>
          <TabsContent value="drafts">
            <MessageList items={draftMessages} emptyText="No drafts" />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default MessagesPage;
