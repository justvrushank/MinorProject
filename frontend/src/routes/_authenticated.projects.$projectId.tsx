import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MapPin, Calendar, Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { JobUploadModal } from "@/components/JobUploadModal";
import { mockProjects, mockJobs } from "@/lib/mockData";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  component: ProjectDetailPage,
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">
      Project not found.{" "}
      <Link to="/projects" className="text-primary hover:underline">
        Back to projects
      </Link>
    </div>
  ),
  loader: ({ params }) => {
    const p = mockProjects.find((x) => x.id === params.projectId);
    if (!p) throw notFound();
    return p;
  },
});

function ProjectDetailPage() {
  const project = Route.useLoaderData();
  const [uploadOpen, setUploadOpen] = useState(false);
  const projectJobs = mockJobs.filter((j) => j.projectId === project.id);
  const latestResult = projectJobs.find((j) => j.result)?.result;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to projects
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {project.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {project.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />{" "}
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">
              {project.status}
            </span>
          </div>
          {project.description && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Upload GeoTIFF
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card lg:col-span-2">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">
              Analysis jobs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-2.5 text-left font-medium">Job</th>
                  <th className="px-5 py-2.5 text-left font-medium">File</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="px-5 py-2.5 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {projectJobs.map((j) => (
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
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {j.fileName}
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
                {projectJobs.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-sm text-muted-foreground"
                    >
                      No jobs yet for this project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">
              Latest result
            </h2>
          </div>
          {latestResult ? (
            <dl className="divide-y divide-border text-sm">
              <div className="flex justify-between px-5 py-3">
                <dt className="text-muted-foreground">Carbon stock</dt>
                <dd className="font-mono text-foreground">
                  {latestResult.properties.carbon_stock_tCO2e.toLocaleString()}{" "}
                  tCO₂e
                </dd>
              </div>
              <div className="flex justify-between px-5 py-3">
                <dt className="text-muted-foreground">Area</dt>
                <dd className="font-mono text-foreground">
                  {latestResult.properties.area_ha.toLocaleString()} ha
                </dd>
              </div>
              <div className="flex justify-between px-5 py-3">
                <dt className="text-muted-foreground">Model</dt>
                <dd className="font-mono text-xs text-foreground">
                  {latestResult.properties.model_version}
                </dd>
              </div>
              <div className="flex justify-between px-5 py-3">
                <dt className="text-muted-foreground">Computed</dt>
                <dd className="text-xs text-foreground">
                  {new Date(
                    latestResult.properties.computed_at,
                  ).toLocaleString()}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              No results yet. Upload a GeoTIFF to start analysis.
            </p>
          )}
        </div>
      </div>

      <JobUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        defaultProjectId={project.id}
      />
    </div>
  );
}
