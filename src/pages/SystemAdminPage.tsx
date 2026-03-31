import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Plus, UserPlus, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

const SystemAdminPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    if (data) setCompanies(data);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim() || !adminName.trim() || !adminEmail.trim()) {
      toast.error("Fill in company name, admin name, and admin email");
      return;
    }
    setLoading(true);
    try {
      // Create company
      const { data: company, error: companyErr } = await supabase
        .from("companies")
        .insert({ name: newCompanyName.trim() })
        .select()
        .single();
      if (companyErr || !company) throw companyErr;

      // Pre-register the first admin user
      const { error: recruitErr } = await supabase
        .from("recruited_workers")
        .insert({
          name: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          role: "admin",
          company_id: company.id,
        });
      if (recruitErr) throw recruitErr;

      toast.success(`Company "${company.name}" created. Admin can now sign up with ${adminEmail}`);
      setNewCompanyName("");
      setAdminName("");
      setAdminEmail("");
      fetchCompanies();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (company: Company) => {
    const { error } = await supabase
      .from("companies")
      .update({ is_active: !company.is_active })
      .eq("id", company.id);
    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(`${company.name} ${company.is_active ? "deactivated" : "activated"}`);
      fetchCompanies();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Building2 className="w-6 h-6 text-primary" /> System Administration
      </h1>

      {/* Create new company */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create New Company
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Company Name</Label>
              <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Acme Recyclers" />
            </div>
            <div>
              <Label>Admin Full Name</Label>
              <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <Label>Admin Email</Label>
              <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@company.com" />
            </div>
          </div>
          <Button onClick={handleCreateCompany} disabled={loading} className="gap-2">
            <UserPlus className="w-4 h-4" /> Create Company & Pre-register Admin
          </Button>
        </CardContent>
      </Card>

      {/* Company list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Companies ({companies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {companies.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Created: {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.is_active ? "default" : "secondary"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(c)}
                      className="gap-1"
                    >
                      {c.is_active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                      {c.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              ))}
              {companies.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No companies yet</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemAdminPage;
