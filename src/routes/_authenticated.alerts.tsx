import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { mockAlerts } from "@/lib/mockData";
import type { Alert } from "@/types";

export const Route = createFileRoute("/_authenticated/alerts")({
  component: AlertsPage,
});

const typeStyles = {
  info: "bg-status-running/15 text-status-running border-status-running/30",
  warning: "bg-status-pending/15 text-status-pending border-status-pending/30",
  critical: "bg-status-failed/15 text-status-failed border-status-failed/30",
} as const;

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);

  const markRead = (id: string) =>
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          System and project alerts requiring attention.
        </p>
      </div>

      <ul className="space-y-2">
        {alerts.map((a) => (
          <li
            key={a.id}
            className={`flex items-start gap-4 rounded-lg border bg-card p-4 ${
              a.read ? "border-border" : "border-primary/40"
            }`}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {a.title}
                </h3>
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${typeStyles[a.type]}`}
                >
                  {a.type}
                </span>
                {!a.read && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                    New
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
            {!a.read && (
              <button
                onClick={() => markRead(a.id)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-surface-hover"
              >
                <Check className="h-3 w-3" /> Mark read
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
