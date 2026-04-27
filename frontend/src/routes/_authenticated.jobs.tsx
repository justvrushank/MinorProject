import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, X, Eye, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { JobUploadModal } from "@/components/JobUploadModal";
import { jobService } from "@/services/job.service";
import type { Job, JobStatus, TifResult } from "@/types";

export const Route = createFileRoute("/_authenticated/jobs")({
  component: JobsPage,
});

// ─── Utility ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 2, suffix = ""): string {
  if (n == null) return "N/A";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}${suffix}`;
}

// ─── Results Detail Modal ─────────────────────────────────────────────────────

interface ResultsModalProps {
  job: Job | null;
  onClose: () => void;
}

function ResultsModal({ job, onClose }: ResultsModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TifResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!job) {
      setResult(null);
      setError(null);
      return;
    }

    // Try to use inline result first (already on the job object)
    const inline = job.result as TifResult | null;
    if (inline && "valid_area_ha" in inline) {
      setResult(inline);
      return;
    }

    // Otherwise fetch from dedicated endpoint
    setLoading(true);
    setError(null);
    jobService
      .getJobResults(job.id)
      .then(setResult)
      .catch((e: unknown) => {
        const msg =
          (e as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ?? "Failed to load results.";
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
      })
      .finally(() => setLoading(false));
  }, [job]);

  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-primary/5">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Carbon Stock Results
            </h2>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {job.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading results…</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {result && (
            <>
              {/* ── Hero metrics ─────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                {/* Total Carbon Stock */}
                <div className="col-span-2 rounded-lg border border-primary/30 bg-primary/8 px-4 py-3 text-center">
                  <p className="text-xs font-medium text-primary/70 uppercase tracking-wider mb-1">
                    Total Carbon Stock
                  </p>
                  <p className="text-3xl font-bold tabular-nums text-primary">
                    {Math.round(result.total_carbon_tco2e).toLocaleString()}
                  </p>
                  <p className="text-xs text-primary/70 mt-0.5">tCO₂e</p>
                </div>

                {/* Area Analyzed */}
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Area Analyzed</p>
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {fmt(result.valid_area_ha, 1)}
                  </p>
                  <p className="text-xs text-muted-foreground">ha</p>
                </div>

                {/* Avg Carbon / ha */}
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Avg Carbon / ha
                  </p>
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {fmt(result.avg_carbon_per_ha, 1)}
                  </p>
                  <p className="text-xs text-muted-foreground">tCO₂e / ha</p>
                </div>
              </div>

              {/* ── Remote sensing ───────────────────────────────────────── */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Remote Sensing
                </h3>
                {[
                  {
                    label: "NDVI Mean",
                    value: result.ndvi_mean != null
                      ? result.ndvi_mean.toFixed(4)
                      : "N/A",
                  },
                  { label: "Band 1 Mean (norm.)", value: fmt(result.band_mean, 4) },
                  { label: "Band 1 Min / Max", value: `${fmt(result.band_min, 4)} / ${fmt(result.band_max, 4)}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Image metadata ───────────────────────────────────────── */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Image Metadata
                </h3>
                {[
                  { label: "CRS", value: result.crs },
                  {
                    label: "Dimensions",
                    value: `${result.width_px.toLocaleString()} × ${result.height_px.toLocaleString()} px`,
                  },
                  {
                    label: "Band Count",
                    value: String(result.band_count),
                  },
                  {
                    label: "Valid Pixels",
                    value: `${result.valid_pixels.toLocaleString()} / ${result.total_pixels.toLocaleString()}`,
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="text-sm text-muted-foreground shrink-0">{label}</span>
                    <span className="text-sm font-medium text-foreground text-right break-all">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Bounding box ─────────────────────────────────────────── */}
              {result.bbox && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Bounding Box (WGS-84)
                  </h3>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    {(["west", "south", "east", "north"] as const).map((k) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-muted-foreground capitalize">{k}</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {result.bbox[k].toFixed(5)}°
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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
  const [toast, setToast] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup toast timer on unmount
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  // Initial fetch
  useEffect(() => {
    jobService.getJobs().then(setJobs).catch(console.error);
  }, []);

  function handleJobComplete(job: Job) {
    // Refresh job list
    jobService.getJobs().then(setJobs).catch(console.error);
    // Show toast
    const msg = `✓ Job complete${job.fileName ? ` — ${job.fileName}` : ""}`;
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

  // 5-second polling while any job is pending / running
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
      {/* Toast notification */}
      {toast && <div className="toast toast-success">{toast}</div>}
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
        {/* Filter tabs */}
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
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-primary hover:bg-primary/10 transition"
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
        onJobCreated={(job) => setJobs((prev) => [job, ...prev])}
        onJobComplete={handleJobComplete}
      />

      <ResultsModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}
