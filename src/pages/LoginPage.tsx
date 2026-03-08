import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Recycle, LogIn, UserPlus, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
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
      // Validate against pre-registered workers
      const identifier = loginMethod === "email" ? email.trim().toLowerCase() : phone.trim();
      if (!identifier) {
        setError(loginMethod === "email" ? "Please enter your email" : "Please enter your phone number");
        setSubmitting(false);
        return;
      }
      if (!displayName.trim()) {
        setError("Please enter your name");
        setSubmitting(false);
        return;
      }

      // Check if pre-registered
      let query = supabase
        .from("recruited_workers")
        .select("*")
        .eq("claimed", false);

      if (loginMethod === "email") {
        query = query.eq("email", identifier);
      } else {
        query = query.eq("phone", identifier);
      }

      const { data: recruits, error: checkError } = await query;
      if (checkError) {
        setError("Failed to verify registration. Try again.");
        setSubmitting(false);
        return;
      }
      if (!recruits || recruits.length === 0) {
        setError("Your " + (loginMethod === "email" ? "email" : "phone number") + " has not been pre-registered by an admin. Please contact your administrator.");
        setSubmitting(false);
        return;
      }

      const recruit = recruits[0];

      // For phone signup, we still need an email for Supabase auth
      // Use a generated email if signing up via phone
      const authEmail = loginMethod === "email" ? identifier : `${identifier.replace(/[^a-zA-Z0-9]/g, "")}@phone.local`;

      const err = await signup(authEmail, password, displayName.trim(), recruit.role as any);
      if (err) {
        setError(err);
      } else {
        // Mark recruit as claimed
        await supabase
          .from("recruited_workers")
          .update({ claimed: true })
          .eq("id", recruit.id);

        if (loginMethod === "phone") {
          toast.success("Account created! You can now sign in with your phone number.");
        } else {
          toast.success("Account created! Please check your email to verify your account before signing in.");
        }
        setMode("login");
        setDisplayName("");
      }
    } else {
      // Login
      let authEmail = email.trim();
      if (loginMethod === "phone") {
        // For phone login, reconstruct the generated email
        authEmail = `${phone.trim().replace(/[^a-zA-Z0-9]/g, "")}@phone.local`;
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
          {/* Login method toggle */}
          {mode !== "forgot" && (
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant={loginMethod === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setLoginMethod("email")}
                className="gap-1"
              >
                <Mail className="w-4 h-4" /> Email
              </Button>
              <Button
                type="button"
                variant={loginMethod === "phone" ? "default" : "outline"}
                size="sm"
                onClick={() => setLoginMethod("phone")}
                className="gap-1"
              >
                <Phone className="w-4 h-4" /> Phone
              </Button>
            </div>
          )}

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

          {loginMethod === "email" || mode === "forgot" ? (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+254..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12"
                required
              />
            </div>
          )}

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

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
          )}

          <Button type="submit" className="w-full h-12 text-base font-semibold gap-2" disabled={submitting}>
            {mode === "forgot" ? <Mail className="w-5 h-5" /> : mode === "signup" ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            {submitting ? "Please wait..." : mode === "forgot" ? "Send Reset Link" : mode === "signup" ? "Create Account" : "Sign In"}
          </Button>

          {mode === "signup" && (
            <p className="text-xs text-muted-foreground text-center">
              Only pre-registered workers can sign up. Contact your admin if you're not registered.
            </p>
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
