import { supabase } from "@/integrations/supabase/client";

interface AuditLogEntry {
  tableName: string;
  recordId: string;
  action: "create" | "update" | "delete" | "payment";
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  changedByName: string;
}

export const logAuditEvent = async ({
  tableName,
  recordId,
  action,
  oldData = null,
  newData = null,
  changedByName,
}: AuditLogEntry) => {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const company_id = await (await import("@/utils/getCompanyId")).getCompanyId();
  await supabase.from("audit_log").insert({
    table_name: tableName,
    record_id: recordId,
    action,
    old_data: oldData as any,
    new_data: newData as any,
    changed_by: userId,
    changed_by_name: changedByName,
    company_id,
  });
};
