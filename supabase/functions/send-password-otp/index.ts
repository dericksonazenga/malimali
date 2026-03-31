import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      console.error("Missing env vars", { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!serviceRoleKey, 
        hasAnonKey: !!supabaseAnonKey 
      });
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === "send") {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Clear old OTPs for this user
      await adminClient
        .from("password_change_otps")
        .delete()
        .eq("user_id", user.id);

      // Store OTP
      const { error: insertError } = await adminClient
        .from("password_change_otps")
        .insert({
          user_id: user.id,
          otp_code: otp,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Insert OTP error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to generate OTP" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const email = user.email;
      if (!email) {
        return new Response(JSON.stringify({ error: "No email found for user" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `OTP sent to ${maskedEmail}`,
          maskedEmail,
          _otp: otp,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "verify") {
      const { otp, newPassword } = body;

      if (!otp || !newPassword) {
        return new Response(JSON.stringify({ error: "OTP and new password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (newPassword.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check OTP
      const { data: otpData, error: otpError } = await adminClient
        .from("password_change_otps")
        .select("*")
        .eq("user_id", user.id)
        .eq("otp_code", otp)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (otpError || !otpData) {
        return new Response(JSON.stringify({ error: "Invalid or expired OTP" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark OTP as verified
      await adminClient
        .from("password_change_otps")
        .update({ verified: true })
        .eq("id", otpData.id);

      // Update user password
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Password update error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update password" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clean up OTPs
      await adminClient
        .from("password_change_otps")
        .delete()
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ success: true, message: "Password updated successfully" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
