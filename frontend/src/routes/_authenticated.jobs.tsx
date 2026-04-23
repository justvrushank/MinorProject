import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { JobUploadModal } from "@/components/JobUploadModal";
import { useJobStore } from "@/stores/jobStore";
import { mockJobs } from "@/lib/mockData";
import type { JobStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/jobs")({
  component: JobsPage,
});

function JobsPage() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const storeJobs = useJobStore((s) => s.jobs);
  const allJobs = useMemo(
    () => (storeJobs.length ? [...storeJobs, ...mockJobs] : mockJobs),
    [storeJobs],
  );
  const filtered = filter === "all" ? allJobs : allJobs.filter((j) => j.status === filter);

  const filters: Array<JobStatus | "all"> = [
    "all",
    "pending",
    "running",
    "complete",
    "failed",
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            All carbon stock estimation jobs across projects.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New job
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-1 border-b border-border p-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${
                filter === f
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-5 py-2.5 text-left font-medium">Job ID</th>
                <th className="px-5 py-2.5 text-left font-medium">Project</th>
                <th className="px-5 py-2.5 text-left font-medium">File</th>
                <th className="px-5 py-2.5 text-left font-medium">Status</th>
                <th className="px-5 py-2.5 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => (
                <tr
                  key={j.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover/40"
                >
                  <td className="px-5 py-3">
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: j.id }}
                      className="font-mono text-xs text-foreground hover:text-primary"
                    >
                      {j.id}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-foreground">
                    {j.projectName ?? j.projectId}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {j.fileName ?? "—"}
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

      <JobUploadModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
