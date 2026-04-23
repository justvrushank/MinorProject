import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { GeoTIFFUploader } from "./GeoTIFFUploader";
import { jobService } from "@/services/job.service";
import { useJobStore } from "@/stores/jobStore";
import { mockProjects } from "@/lib/mockData";
import type { Job } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

export function JobUploadModal({ open, onClose, defaultProjectId }: Props) {
  const [projectId, setProjectId] = useState(
    defaultProjectId ?? mockProjects[0]?.id ?? "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const addJob = useJobStore((s) => s.addJob);

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setErr(null);
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!file || !projectId) return;
    setSubmitting(true);
    setErr(null);
    try {
      const job = await jobService.createJob(projectId, file);
      addJob(job);
      reset();
      onClose();
    } catch {
      // Backend not wired — push optimistic local job so UX still works
      const project = mockProjects.find((p) => p.id === projectId);
      const optimistic: Job = {
        id: `j_${Math.random().toString(36).slice(2, 8)}`,
        projectId,
        projectName: project?.name,
        status: "pending",
        createdAt: new Date().toISOString(),
        fileName: file.name,
      };
      addJob(optimistic);
      reset();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
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
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {mockProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              GeoTIFF file
            </label>
            <GeoTIFFUploader file={file} onFileSelect={setFile} />
          </div>

          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || submitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit job
          </button>
        </div>
      </div>
    </div>
  );
}
