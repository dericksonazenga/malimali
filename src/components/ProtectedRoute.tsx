import { forwardRef, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldX } from "lucide-react";

interface ProtectedRouteProps {
  permission: string;
  children: ReactNode;
}

const ProtectedRoute = forwardRef<HTMLDivElement, ProtectedRouteProps>(
  ({ permission, children }, ref) => {
    const { hasPermission, loading } = useAuth();

    // While auth/permissions are still resolving, render a transparent
    // placeholder instead of an "Access Denied" flash. This is what causes
    // the brief blank screen during navigation.
    if (loading) {
      return (
        <div
          ref={ref}
          className="flex items-center justify-center min-h-[40vh]"
          aria-busy="true"
        >
          <div className="h-8 w-8 rounded-full border-2 border-amber-500/25 border-t-amber-500 animate-spin" />
        </div>
      );
    }

    if (!hasPermission(permission)) {
      return (
        <div
          ref={ref}
          className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-3"
        >
          <ShieldX className="w-12 h-12" />
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-sm">You don't have permission to view this page.</p>
        </div>
      );
    }

    return <>{children}</>;
  }
);

ProtectedRoute.displayName = "ProtectedRoute";

export default ProtectedRoute;
