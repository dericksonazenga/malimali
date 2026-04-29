import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCompanyId } from "@/utils/getCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Upload, Loader2, Save, Trash2, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

const CompanyBrandingSettings = () => {
  const { companyId } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [originalName, setOriginalName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Contact details
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [originalContact, setOriginalContact] = useState({ phone: "", email: "", address: "" });
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("companies")
        .select("name, logo_url, contact_phone, contact_email, contact_address")
        .eq("id", companyId)
        .single();
      if (data) {
        setCompanyName(data.name);
        setOriginalName(data.name);
        setLogoUrl(data.logo_url);
        const phone = (data as any).contact_phone || "";
        const email = (data as any).contact_email || "";
        const address = (data as any).contact_address || "";
        setContactPhone(phone);
        setContactEmail(email);
        setContactAddress(address);
        setOriginalContact({ phone, email, address });
      }
    };
    fetch();
  }, [companyId]);

  const contactDirty =
    contactPhone.trim() !== originalContact.phone ||
    contactEmail.trim() !== originalContact.email ||
    contactAddress.trim() !== originalContact.address;

  const handleSaveContact = async () => {
    if (!companyId) return;
    setSavingContact(true);
    const { error } = await supabase
      .from("companies")
      .update({
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_address: contactAddress.trim() || null,
      } as any)
      .eq("id", companyId);
    setSavingContact(false);
    if (error) {
      toast.error("Failed to update contact details");
    } else {
      setOriginalContact({
        phone: contactPhone.trim(),
        email: contactEmail.trim(),
        address: contactAddress.trim(),
      });
      toast.success("Contact details updated!");
    }
  };

  const handleSaveName = async () => {
    if (!companyId || !companyName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({ name: companyName.trim() } as any)
      .eq("id", companyId);
    setSaving(false);
    if (error) {
      toast.error("Failed to update company name");
    } else {
      setOriginalName(companyName.trim());
      toast.success("Company name updated!");
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${companyId}/logo.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("company-logos")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast.error("Failed to upload logo");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("company-logos")
      .getPublicUrl(path);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateErr } = await supabase
      .from("companies")
      .update({ logo_url: publicUrl } as any)
      .eq("id", companyId);

    setUploading(false);
    if (updateErr) {
      toast.error("Logo uploaded but failed to save");
    } else {
      setLogoUrl(publicUrl);
      toast.success("Company logo updated!");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemoveLogo = async () => {
    if (!companyId) return;
    setSaving(true);
    await supabase
      .from("companies")
      .update({ logo_url: null } as any)
      .eq("id", companyId);
    setLogoUrl(null);
    setSaving(false);
    toast.success("Logo removed");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" /> Company Branding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Logo */}
        <div className="space-y-3">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-accent/50 overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Building2 className="w-8 h-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadLogo}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
              {logoUrl && (
                <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={handleRemoveLogo}>
                  <Trash2 className="w-3 h-3" /> Remove
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground">Max 2MB. PNG or JPG recommended.</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label>Company Name</Label>
          <div className="flex items-center gap-2">
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
              className="max-w-sm h-10"
            />
            <Button
              size="sm"
              className="gap-1"
              onClick={handleSaveName}
              disabled={saving || companyName.trim() === originalName}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            This name appears on the dashboard and throughout the application.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyBrandingSettings;
