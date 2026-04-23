import { Navigate, Outlet } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  return <>{children ?? <Outlet />}</>;
}
