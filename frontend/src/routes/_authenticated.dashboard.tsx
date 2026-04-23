import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  FolderKanban,
  Cpu,
  Leaf,
  ShieldCheck,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { JobUploadModal } from "@/components/JobUploadModal";
import { useJobStore } from "@/stores/jobStore";
import { mockJobs, mockProjects, mockAlerts } from "@/lib/mockData";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function Kpi({
  label,
  value,
  hint,
  Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  Icon: typeof FolderKanban;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div
          className={`grid h-8 w-8 place-items-center rounded-md ${accent ?? "bg-primary/15 text-primary"}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function DashboardPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const storeJobs = useJobStore((s) => s.jobs);
  const allJobs = useMemo(
    () => (storeJobs.length ? storeJobs : mockJobs),
    [storeJobs],
  );

  const totalCarbon = mockJobs
    .filter((j) => j.result)
    .reduce((sum, j) => sum + (j.result?.properties.carbon_stock_tCO2e ?? 0), 0);

  const verifiedCount = mockJobs.filter((j) => j.status === "complete").length;
  const activeJobs = allJobs.filter(
    (j) => j.status === "pending" || j.status === "running",
  ).length;

  const recentJobs = allJobs.slice(0, 5);
  const recentAlerts = mockAlerts.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of monitoring activity across all blue carbon projects.
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New analysis job
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total Projects"
          value={mockProjects.length.toString()}
          hint={`${mockProjects.filter((p) => p.status === "active").length} active`}
          Icon={FolderKanban}
        />
        <Kpi
          label="Active Jobs"
          value={activeJobs.toString()}
          hint="pending + running"
          Icon={Cpu}
          accent="bg-status-running/15 text-status-running"
        />
        <Kpi
          label="Carbon Stock"
          value={`${(totalCarbon / 1000).toFixed(1)}k`}
          hint="tCO₂e (cumulative)"
          Icon={Leaf}
          accent="bg-status-complete/15 text-status-complete"
        />
        <Kpi
          label="Verified Results"
          value={verifiedCount.toString()}
          hint="complete + signed off"
          Icon={ShieldCheck}
          accent="bg-primary/15 text-primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">
              Recent jobs
            </h2>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-2.5 text-left font-medium">Job</th>
                  <th className="px-5 py-2.5 text-left font-medium">Project</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="px-5 py-2.5 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((j) => (
                  <tr
                    key={j.id}
                    className="border-b border-border last:border-0 hover:bg-surface-hover/40"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-foreground">
                      {j.id}
                    </td>
                    <td className="px-5 py-3 text-foreground">
                      {j.projectName ?? j.projectId}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(j.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">
              Recent alerts
            </h2>
            <Link
              to="/alerts"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recentAlerts.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      a.type === "critical"
                        ? "bg-status-failed"
                        : a.type === "warning"
                          ? "bg-status-pending"
                          : "bg-status-running"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {a.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {a.message}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <JobUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
    </div>
  );
}
