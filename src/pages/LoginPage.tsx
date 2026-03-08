import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Recycle, LogIn, UserPlus, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";

const LoginPage = () => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("boss");
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
      if (!displayName.trim()) {
        setError("Please enter your name");
        setSubmitting(false);
        return;
      }
      const err = await signup(email, password, displayName.trim(), selectedRole);
      if (err) {
        setError(err);
      } else {
        toast.success("Account created! Please check your email to verify your account before signing in.");
        setMode("login");
        setDisplayName("");
      }
    } else {
      const ok = await login(email, password);
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
          {mode === "signup" && (
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="data_manager">Data Manager</SelectItem>
                  <SelectItem value="human_resource">Human Resource</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="boss">Boss</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
