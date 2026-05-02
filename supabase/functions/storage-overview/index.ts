// Storage overview: per-company DB row counts + bucket file sizes.
// Public function (verify_jwt = false) — caller passes their JWT in Authorization header,
// we resolve their company_id server-side using service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Tables that carry company_id and matter for the overview.
const TABLES = [
  "agent_entries", "vip_entries", "sales_entries", "expenses",
  "debts", "debt_payments", "creditors", "creditor_payments",
  "savings_accounts", "savings_transactions",
  "workers", "salary_payments", "attendance", "biometric_credentials",
  "commodities", "persistent_stock", "stock_adjustments",
  "rate_change_history", "end_of_day_log",
  "messages", "message_recipients",
  "audit_log", "recruited_workers", "profiles", "custom_roles", "role_permissions",
];

// Buckets to scan. company_id is encoded as the first path segment by app convention,
// or rows are tagged via metadata; we sum total + per-company best-effort.
const BUCKETS = ["avatars", "company-logos", "message-attachments"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "missing auth" }, 401);
    }

    // Resolve caller -> company_id
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) return json({ error: "unauthenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: profile } = await admin
      .from("profiles")
      .select("company_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const companyId = profile?.company_id;
    if (!companyId) return json({ error: "no company" }, 400);

    // 1) Row counts per table for this company
    const tables: { table: string; rows: number }[] = [];
    let totalRows = 0;
    await Promise.all(TABLES.map(async (t) => {
      try {
        const { count } = await admin.from(t).select("*", { count: "exact", head: true }).eq("company_id", companyId);
        const rows = count ?? 0;
        tables.push({ table: t, rows });
        totalRows += rows;
      } catch {
        tables.push({ table: t, rows: 0 });
      }
    }));
    tables.sort((a, b) => b.rows - a.rows);

    // 2) Bucket usage. We list objects whose name starts with `${companyId}/` (app convention),
    //    and also report whole-bucket size as a fallback indicator.
    const buckets: { bucket: string; companyFiles: number; companyBytes: number; totalFiles: number; totalBytes: number }[] = [];
    let totalCompanyBytes = 0;
    let totalCompanyFiles = 0;

    for (const b of BUCKETS) {
      let companyFiles = 0, companyBytes = 0, totalFiles = 0, totalBytes = 0;
      // Walk the root + first-level company prefixes (limit pagination)
      const walk = async (prefix: string, scope: "company" | "all") => {
        let offset = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await admin.storage.from(b).list(prefix, {
            limit: pageSize, offset, sortBy: { column: "name", order: "asc" },
          });
          if (error || !data) break;
          for (const obj of data) {
            const size = (obj.metadata as any)?.size ?? 0;
            if (obj.id === null) {
              // It's a folder — recurse one more level (cheap & avoids deep loops)
              if (prefix === "" && scope === "all") {
                // skip recursion for "all" (we just want top-level approximation)
              }
            } else {
              if (scope === "company") { companyFiles++; companyBytes += size; }
              totalFiles++; totalBytes += size;
            }
          }
          if (data.length < pageSize) break;
          offset += pageSize;
        }
      };

      // Pass A: list the company-scoped prefix
      await walk(`${companyId}`, "company");
      // Pass B: rough bucket-wide totals (root only, 1-level)
      await walk("", "all");

      buckets.push({ bucket: b, companyFiles, companyBytes, totalFiles, totalBytes });
      totalCompanyFiles += companyFiles;
      totalCompanyBytes += companyBytes;
    }

    return json({
      company_id: companyId,
      generated_at: new Date().toISOString(),
      database: {
        total_rows: totalRows,
        tables,
      },
      storage: {
        company_files: totalCompanyFiles,
        company_bytes: totalCompanyBytes,
        buckets,
      },
    });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
