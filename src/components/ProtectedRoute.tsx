import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldX } from "lucide-react";

interface ProtectedRouteProps {
  permission: string;
  children: ReactNode;
}

const ProtectedRoute = ({ permission, children }: ProtectedRouteProps) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-3">
        <ShieldX className="w-12 h-12" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm">You don't have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
