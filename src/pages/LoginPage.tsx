import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Recycle, LogIn, UserPlus, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("scrapflow_remember_email");
    if (saved) {
      setIdentifier(saved);
      setRememberMe(true);
    }
  }, []);

  // Save email when submitting login with remember me
  const saveRememberedEmail = () => {
    if (rememberMe && mode === "login") {
      localStorage.setItem("scrapflow_remember_email", identifier.trim());
    }
  };
  const isEmail = (val: string) => val.includes("@");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(identifier.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
        setMode("login");
      }
      setSubmitting(false);
      return;
    }

    if (mode === "signup") {
      const email = identifier.trim().toLowerCase();
      if (!email || !isEmail(email)) {
        setError("Please enter a valid email address");
        setSubmitting(false);
        return;
      }
      if (!displayName.trim()) {
        setError("Please enter your name");
        setSubmitting(false);
        return;
      }

      // Check if pre-registered by admin
      const { data: recruits, error: checkError } = await supabase
        .from("recruited_workers")
        .select("*")
        .eq("email", email)
        .eq("claimed", false);

      if (checkError) {
        setError("Failed to verify registration. Try again.");
        setSubmitting(false);
        return;
      }
      if (!recruits || recruits.length === 0) {
        setError("Your email has not been pre-registered by an admin. Please contact your administrator.");
        setSubmitting(false);
        return;
      }

      const recruit = recruits[0];
      const err = await signup(email, password, displayName.trim(), recruit.role as any);
      if (err) {
        setError(err);
      } else {
        // Mark recruit as claimed
        await supabase
          .from("recruited_workers")
          .update({ claimed: true })
          .eq("id", recruit.id);

        toast.success("Account created successfully! You can now sign in.");
        setMode("login");
        setDisplayName("");
      }
    } else {
      // Login - accept email or phone
      const value = identifier.trim();
      if (!value) {
        setError("Please enter your email or phone number");
        setSubmitting(false);
        return;
      }

      let authEmail = value;

      // If it looks like a phone number (not an email), look up the profile to find the auth email
      if (!isEmail(value)) {
        // Look up profile by phone to get user_id, then get auth email
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("phone", value)
          .single();

        if (profileError || !profile) {
          setError("No account found with that phone number.");
          setSubmitting(false);
          return;
        }

        // Get the auth user's email via recruited_workers or use the phone-based email
        const { data: recruit } = await supabase
          .from("recruited_workers")
          .select("email")
          .eq("phone", value)
          .single();

        if (recruit?.email) {
          authEmail = recruit.email;
        } else {
          setError("No account found with that phone number.");
          setSubmitting(false);
          return;
        }
      }

      const ok = await login(authEmail, password);
      if (!ok) {
        setError("Invalid credentials or email not verified.");
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Recycle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-sidebar-foreground">
            Scrap<span className="text-primary">Flow</span>
          </h1>
          <p className="text-sidebar-foreground/60 mt-2">Scrap Dealing Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-2xl space-y-5">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your full name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-12"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="identifier">
              {mode === "signup" ? "Email" : mode === "forgot" ? "Email" : "Email or Phone Number"}
            </Label>
            <Input
              id="identifier"
              type={mode === "signup" || mode === "forgot" ? "email" : "text"}
              placeholder={mode === "signup" || mode === "forgot" ? "you@example.com" : "Email or phone number"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="h-12"
              required
            />
          </div>

          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                required
                minLength={6}
              />
            </div>
          )}

          {mode === "login" && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => {
                  setRememberMe(checked === true);
                  if (checked) {
                    localStorage.setItem("scrapflow_remember_email", identifier);
                  } else {
                    localStorage.removeItem("scrapflow_remember_email");
                  }
                }}
              />
              <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Remember my email
              </Label>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
          )}

          <Button type="submit" className="w-full h-12 text-base font-semibold gap-2" disabled={submitting}>
            {mode === "forgot" ? <Mail className="w-5 h-5" /> : mode === "signup" ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            {submitting ? "Please wait..." : mode === "forgot" ? "Send Reset Link" : mode === "signup" ? "Create Account" : "Sign In"}
          </Button>

          {mode === "signup" && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center space-y-1">
              <p className="text-sm font-medium text-primary">🎉 Pre-registered workers only</p>
              <p className="text-xs text-muted-foreground">
                If your admin has added your email, you can create your account here. Your role and permissions are already set.
              </p>
            </div>
          )}

          {mode === "login" && (
            <div className="bg-accent/50 border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">
                 Been pre-registered by your admin? <button type="button" onClick={() => { setMode("signup"); setError(""); }} className="text-primary font-medium hover:underline">Create your account →</button>
              </p>
            </div>
          )}

          <div className="text-center space-y-2">
            {mode === "login" && (
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); }}
                className="text-sm text-muted-foreground hover:text-primary hover:underline block w-full"
              >
                Forgot your password?
              </button>
            )}
            <button
              type="button"
              onClick={() => { setMode(mode === "signup" ? "login" : mode === "forgot" ? "login" : "signup"); setError(""); }}
              className="text-sm text-primary hover:underline"
            >
              {mode === "signup" ? "Already have an account? Sign in" : mode === "forgot" ? "Back to Sign In" : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
