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

    // While auth/permissions are still resolving, render an invisible
    // placeholder so we don't flash a spinner on top of the previous page.
    if (loading) {
      return <div ref={ref} aria-hidden="true" />;
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
