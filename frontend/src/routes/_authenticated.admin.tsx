import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { mockUsers } from "@/lib/mockData";
import type { User, UserRole } from "@/types";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>(mockUsers);

  if (currentUser?.role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  const updateRole = (id: string, role: UserRole) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage user accounts and access roles.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-5 py-2.5 text-left font-medium">Email</th>
                <th className="px-5 py-2.5 text-left font-medium">Role</th>
                <th className="px-5 py-2.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover/40"
                >
                  <td className="px-5 py-3 text-foreground">{u.email}</td>
                  <td className="px-5 py-3">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        updateRole(u.id, e.target.value as UserRole)
                      }
                      className="rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                    >
                      <option value="analyst">Analyst</option>
                      <option value="verifier">Verifier</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        u.status === "active"
                          ? "bg-status-complete/15 text-status-complete"
                          : "bg-status-failed/15 text-status-failed"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
