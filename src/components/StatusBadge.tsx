import { cn } from "@/lib/utils";
import type { JobStatus } from "@/types";

const styles: Record<JobStatus, string> = {
  pending:
    "bg-status-pending/15 text-status-pending border-status-pending/30",
  running:
    "bg-status-running/15 text-status-running border-status-running/30",
  complete:
    "bg-status-complete/15 text-status-complete border-status-complete/30",
  failed:
    "bg-status-failed/15 text-status-failed border-status-failed/30",
};

const dotStyles: Record<JobStatus, string> = {
  pending: "bg-status-pending",
  running: "bg-status-running animate-pulse",
  complete: "bg-status-complete",
  failed: "bg-status-failed",
};

export function StatusBadge({
  status,
  className,
}: {
  status: JobStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[status],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[status])} />
      {status}
    </span>
  );
}
