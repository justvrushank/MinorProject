import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Eye } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { JobUploadModal } from "@/components/JobUploadModal";
import { jobService } from "@/services/job.service";
import type { Job, JobStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/jobs")({
  component: JobsPage,
});

// ─── Results Detail Modal ─────────────────────────────────────────────────────
interface ResultsModalProps {
  job: Job | null;
  onClose: () => void;
}

function ResultsModal({ job, onClose }: ResultsModalProps) {
  if (!job) return null;

  // Support both `results` (new) and legacy `result.properties`
  const r = (job as Job & { results?: Record<string, unknown> }).results as
    | {
        total_area_ha?: number;
        carbon_stock_tco2e?: number;
        mean_ndvi?: number;
        pixel_count?: number;
        resolution_m?: number;
        verified?: boolean;
      }
    | undefined;

  const legacy = job.result?.properties;

  const area = r?.total_area_ha ?? legacy?.area_ha;
  const carbon = r?.carbon_stock_tco2e ?? legacy?.carbon_stock_tCO2e;
  const ndvi = r?.mean_ndvi;
  const pixels = r?.pixel_count;
  const res = r?.resolution_m;
  const verified = r?.verified;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Job Results
            </h2>
            <p className="text-xs text-muted-foreground">{job.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Project</span>
            <span className="text-sm font-medium text-foreground">
              {job.projectName ?? job.projectId}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={job.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">File</span>
            <span className="text-xs font-mono text-muted-foreground">
              {job.fileName ?? "—"}
            </span>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Analysis Metrics
            </h3>

            {[
              {
                label: "Total Area",
                value: area != null ? `${area.toLocaleString()} ha` : "—",
              },
              {
                label: "Carbon Stock",
                value:
                  carbon != null
                    ? `${Math.round(carbon).toLocaleString()} tCO₂e`
                    : "—",
              },
              {
                label: "Mean NDVI",
                value: ndvi != null ? ndvi.toFixed(2) : "—",
              },
              {
                label: "Pixel Count",
                value:
                  pixels != null ? pixels.toLocaleString() : "—",
              },
              {
                label: "Resolution",
                value: res != null ? `${res} m/px` : "—",
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {value}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Verified</span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  verified
                    ? "bg-status-complete/15 text-status-complete"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {verified ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Jobs Page ────────────────────────────────────────────────────────────────
function JobsPage() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial fetch
  useEffect(() => {
    jobService.getJobs().then(setJobs).catch(console.error);
  }, []);

  // Auto-refresh polling when any job is pending/running
  useEffect(() => {
    const hasActive = jobs.some(
      (j) => j.status === "pending" || j.status === "running",
    );

    if (hasActive) {
      if (!pollRef.current) {
        pollRef.current = setInterval(() => {
          jobService
            .getJobs()
            .then(setJobs)
            .catch(console.error);
        }, 5000);
      }
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobs]);

  const filters: Array<JobStatus | "all"> = [
    "all",
    "pending",
    "running",
    "complete",
    "failed",
  ];

  const filtered =
    filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

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
                <th className="px-5 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => (
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
                  <td className="px-5 py-3 text-right">
                    {j.status === "complete" && (
                      <button
                        onClick={() => setSelectedJob(j)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-primary hover:bg-primary/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Results
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    No jobs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <JobUploadModal
        open={open}
        onClose={() => setOpen(false)}
      />

      <ResultsModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}
