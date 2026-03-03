import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Recycle, LogIn } from "lucide-react";

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!login(email, password)) {
      setError("Invalid credentials. Try: admin@scrap.com, accountant@scrap.com, datamanager@scrap.com, or worker@scrap.com");
    }
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
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@scrap.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
              required
            />
          </div>
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
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
          )}

          <Button type="submit" className="w-full h-12 text-base font-semibold gap-2">
            <LogIn className="w-5 h-5" />
            Sign In
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p className="font-medium">Demo Accounts:</p>
            <p>Admin: admin@scrap.com</p>
            <p>Accountant: accountant@scrap.com</p>
            <p>Data Manager: datamanager@scrap.com</p>
            <p>Worker: worker@scrap.com</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
