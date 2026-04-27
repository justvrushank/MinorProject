import { useEffect, useRef, useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { GeoTIFFUploader } from "./GeoTIFFUploader";
import { jobService } from "@/services/job.service";
import { projectService } from "@/services/project.service";
import { useMapStore } from "@/stores/mapStore";
import type { Job, Project } from "@/types";

type Phase = "idle" | "uploading" | "processing" | "complete" | "failed";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  onJobCreated?: (job: Job) => void;
  onJobComplete?: (job: Job) => void;
}

export function JobUploadModal({
  open,
  onClose,
  defaultProjectId,
  onJobCreated,
  onJobComplete,
}: Props) {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [file, setFile]           = useState<File | null>(null);
  const [phase, setPhase]         = useState<Phase>("idle");
  const [errorMsg, setErrorMsg]   = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addCompletedJob } = useMapStore();

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  useEffect(() => {
    if (open) {
      projectService
        .getProjects()
        .then((ps) => {
          setProjects(ps);
          if (!projectId && ps.length > 0) {
            setProjectId(defaultProjectId ?? ps[0].id);
          }
        })
        .catch(console.error);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setErrorMsg("");
    setPhase("idle");
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!file || !projectId) {
      setErrorMsg("Please select a project and a GeoTIFF file.");
      return;
    }

    setPhase("uploading");
    setErrorMsg("");

    let newJob: Job;
    try {
      newJob = await jobService.createJob(projectId, file);
      onJobCreated?.(newJob);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Upload failed. Please try again.";
      setErrorMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
      setPhase("failed");
      return;
    }

    setPhase("processing");

    // Start 2-second polling
    pollRef.current = setInterval(async () => {
      try {
        const job = await jobService.getJobStatus(newJob.id);
        if (job.status === "complete") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          addCompletedJob(job);
          setPhase("complete");
          onJobComplete?.(job);
          setTimeout(() => handleClose(), 1200);
        } else if (job.status === "failed") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setPhase("failed");
          const r = job.result as { error_message?: string } | null | undefined;
          setErrorMsg(r?.error_message ?? "Processing failed.");
        }
      } catch (err) {
        console.warn("Poll error:", err);
      }
    }, 2000);
  };

  // ── Phase stepper display ─────────────────────────────────────────────────
  const steps: Array<{ key: Phase | "uploading" | "processing" | "complete"; label: string }> = [
    { key: "uploading",  label: "Uploading…"             },
    { key: "processing", label: "Processing GeoTIFF…"    },
    { key: "complete",   label: "Complete! Adding to map…" },
  ];
  const phaseIndex: Record<Phase, number> = {
    idle:       -1,
    uploading:   0,
    processing:  1,
    complete:    2,
    failed:     -1,
  };
  const currentStep = phaseIndex[phase];
  const isActive = phase !== "idle" && phase !== "failed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Upload GeoTIFF for analysis
            </h2>
            <p className="text-xs text-muted-foreground">
              Submit a raster to queue a carbon stock estimation job.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={phase === "uploading" || phase === "processing"}
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Project selector — disabled while active */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={isActive}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              {projects.length === 0 && (
                <option value="">Loading projects…</option>
              )}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* File uploader — disabled while active */}
          {!isActive && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                GeoTIFF file
              </label>
              <GeoTIFFUploader file={file} onFileSelect={setFile} />
            </div>
          )}

          {/* Phase stepper */}
          {isActive && (
            <div className="rounded-lg border border-border bg-surface px-4 py-4 space-y-3">
              {steps.map((step, i) => {
                const done    = i < currentStep;
                const active  = i === currentStep;
                const pending = i > currentStep;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
                        ${done   ? "bg-status-complete text-white"          : ""}
                        ${active ? "bg-primary text-primary-foreground"     : ""}
                        ${pending ? "bg-surface-elevated text-muted-foreground" : ""}
                      `}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className={`text-xs ${
                        active  ? "text-foreground font-medium" :
                        done    ? "text-status-complete" :
                        "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                    {active && (
                      <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-primary" />
                    )}
                    {done && (
                      <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-status-complete" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Complete state */}
          {phase === "complete" && (
            <div className="flex items-center gap-2 rounded-lg border border-status-complete/30 bg-status-complete/10 px-4 py-3 text-sm text-status-complete">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Job complete! Adding result layer to map…</span>
            </div>
          )}

          {/* Error state */}
          {phase === "failed" && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg || "Processing failed."}</span>
            </div>
          )}

          {/* Generic error */}
          {phase === "idle" && errorMsg && (
            <p className="text-xs text-destructive">{errorMsg}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          {/* Cancel — always visible except during active phases */}
          {(phase === "idle" || phase === "failed") && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            >
              {phase === "failed" ? "Close" : "Cancel"}
            </button>
          )}

          {/* Try again button after failure */}
          {phase === "failed" && (
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-surface-elevated px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              Try again
            </button>
          )}

          {/* Submit — only in idle state */}
          {phase === "idle" && (
            <button
              type="button"
              disabled={!file || !projectId}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
