import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { mockJobs } from "@/lib/mockData";
import type { JobStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  component: JobDetailPage,
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">
      Job not found.{" "}
      <Link to="/jobs" className="text-primary hover:underline">
        Back to jobs
      </Link>
    </div>
  ),
  loader: ({ params }) => {
    const j = mockJobs.find((x) => x.id === params.jobId);
    if (!j) throw notFound();
    return j;
  },
});

const TIMELINE: JobStatus[] = ["pending", "running", "complete"];

function JobDetailPage() {
  const job = Route.useLoaderData();
  const currentStep =
    job.status === "failed" ? 1 : TIMELINE.indexOf(job.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to jobs
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{job.id}</p>
          <h1 className="text-2xl font-semibold text-foreground">
            {job.projectName ?? job.projectId}
          </h1>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Status timeline
            </h2>
            <ol className="space-y-3">
              {TIMELINE.map((step, i) => {
                const done = i <= currentStep && job.status !== "failed";
                const isCurrent = i === currentStep;
                return (
                  <li key={step} className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-status-complete" />
                    ) : (
                      <Circle
                        className={`h-4 w-4 ${
                          isCurrent
                            ? "text-status-running"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    )}
                    <span
                      className={`text-sm capitalize ${
                        done || isCurrent
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step}
                    </span>
                  </li>
                );
              })}
              {job.status === "failed" && (
                <li className="flex items-center gap-3 text-status-failed">
                  <Circle className="h-4 w-4 fill-current" />
                  <span className="text-sm">Failed</span>
                </li>
              )}
            </ol>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Result preview
            </h2>
            {job.result ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Carbon stock</p>
                  <p className="mt-1 font-mono text-lg text-foreground">
                    {job.result.properties.carbon_stock_tCO2e.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">tCO₂e</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Area</p>
                  <p className="mt-1 font-mono text-lg text-foreground">
                    {job.result.properties.area_ha.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">ha</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="mt-1 font-mono text-sm text-foreground">
                    {job.result.properties.model_version}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Geometry</p>
                  <p className="mt-1 font-mono text-sm text-foreground">
                    {job.result.geometry.type}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No result available yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Metadata
          </h2>
          <dl className="space-y-2.5 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">File</dt>
              <dd className="mt-0.5 font-mono text-xs text-foreground">
                {job.fileName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Project ID</dt>
              <dd className="mt-0.5 font-mono text-xs text-foreground">
                {job.projectId}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd className="mt-0.5 text-xs text-foreground">
                {new Date(job.createdAt).toLocaleString()}
              </dd>
            </div>
            {job.updatedAt && (
              <div>
                <dt className="text-xs text-muted-foreground">Updated</dt>
                <dd className="mt-0.5 text-xs text-foreground">
                  {new Date(job.updatedAt).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
