import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, X } from "lucide-react";
import { projectService } from "@/services/project.service";
import type { Project } from "@/types";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

const statusStyles = {
  active: "bg-status-complete/15 text-status-complete",
  draft: "bg-status-pending/15 text-status-pending",
  archived: "bg-muted text-muted-foreground",
} as const;

// ─── New Project Modal ───────────────────────────────────────────────────────
interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "draft" | "archived">("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setLocation("");
      setDescription("");
      setStatus("active");
      setError(null);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    if (!location.trim()) {
      setError("Location is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await projectService.createProject({
        name: name.trim(),
        location: location.trim(),
        description: description.trim() || undefined,
        status,
      });
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to create project. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">New Project</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <p className="rounded-md border border-status-failed/30 bg-status-failed/10 px-3 py-2 text-xs text-status-failed">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Project Name <span className="text-status-failed">*</span>
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sundarbans Mangrove Restoration"
              required
              className="h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Location <span className="text-status-failed">*</span>
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. West Bengal, India"
              required
              className="h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Description <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of the project…"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "active" | "draft" | "archived")
              }
              className="h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Projects Page ───────────────────────────────────────────────────────────
function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    projectService.getProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          ((p as Project & { location?: string }).location ?? "")
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [q, projects],
  );

  function handleCreated(project: Project) {
    setProjects((prev) => [project, ...prev]);
    setToast(`Project "${project.name}" created successfully!`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-status-complete/40 bg-status-complete/10 px-4 py-3 text-sm text-status-complete shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            All registered blue carbon monitoring projects.
          </p>
        </div>
        <button
          id="new-project-btn"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New project
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects…"
              className="h-8 w-full rounded-md border border-border bg-input pl-8 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-5 py-2.5 text-left font-medium">Name</th>
                <th className="px-5 py-2.5 text-left font-medium">Location</th>
                <th className="px-5 py-2.5 text-left font-medium">Created</th>
                <th className="px-5 py-2.5 text-left font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover/40"
                >
                  <td className="px-5 py-3">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.id }}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {(p as Project & { location?: string }).location ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        statusStyles[p.status as keyof typeof statusStyles] ??
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.id }}
                      className="text-xs text-primary hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    {projects.length === 0
                      ? "No projects yet. Create your first project!"
                      : "No projects found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
