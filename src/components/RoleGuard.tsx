import { Navigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/types";

export function RoleGuard({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }
  return <>{children}</>;
}
