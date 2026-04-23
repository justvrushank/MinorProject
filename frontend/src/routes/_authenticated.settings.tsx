import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const handleChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setMsg("New passwords do not match.");
      return;
    }
    setMsg("Password change request submitted (stub).");
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account profile and credentials.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        </div>
        <dl className="divide-y divide-border text-sm">
          <div className="flex justify-between px-5 py-3">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between px-5 py-3">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="text-foreground capitalize">{user?.role ?? "—"}</dd>
          </div>
          <div className="flex justify-between px-5 py-3">
            <dt className="text-muted-foreground">User ID</dt>
            <dd className="font-mono text-xs text-foreground">
              {user?.id ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">
            Change password
          </h2>
        </div>
        <form onSubmit={handleChange} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Current password
            </label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              New password
            </label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          {msg && (
            <p className="text-xs text-muted-foreground">{msg}</p>
          )}
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Update password
          </button>
        </form>
      </section>
    </div>
  );
}
