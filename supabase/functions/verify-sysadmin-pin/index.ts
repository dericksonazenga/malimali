import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Verify user is a system admin
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: sysAdmin } = await adminClient
      .from("system_admins")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!sysAdmin) {
      return new Response(JSON.stringify({ error: "Not a system admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, pin, newPin } = body;

    const correctPin = Deno.env.get("SYSADMIN_PIN");

    // Change PIN action
    if (action === "change") {
      if (!newPin || newPin.length < 4) {
        return new Response(JSON.stringify({ error: "PIN must be at least 4 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update the secret - we store it as an environment variable
      // Since we can't dynamically update Deno env vars, we'll store in the database
      const { error: upsertError } = await adminClient
        .from("app_settings")
        .upsert(
          { key: "sysadmin_pin", value: newPin, company_id: "00000000-0000-0000-0000-000000000001" },
          { onConflict: "key,company_id" }
        );

      if (upsertError) {
        return new Response(JSON.stringify({ error: "Failed to update PIN" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify PIN action (default)
    if (!correctPin && !pin) {
      return new Response(JSON.stringify({ error: "PIN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check DB-stored PIN first (takes precedence if changed), fall back to env var
    const { data: dbPin } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "sysadmin_pin")
      .eq("company_id", "00000000-0000-0000-0000-000000000001")
      .single();

    const activePin = dbPin?.value || correctPin;

    if (!activePin) {
      return new Response(JSON.stringify({ error: "PIN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pin !== activePin) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
