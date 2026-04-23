import { createFileRoute } from "@tanstack/react-router";
import { Layers, Eye, EyeOff } from "lucide-react";
import { useMapStore } from "@/stores/mapStore";
import { mockProjects, mockJobs } from "@/lib/mockData";

export const Route = createFileRoute("/_authenticated/map")({
  component: MapPage,
});

function MapPage() {
  const {
    selectedProjectId,
    setSelectedProject,
    visibleLayers,
    toggleLayer,
    choroplethField,
    setChoroplethField,
  } = useMapStore();

  const selectedProject = mockProjects.find((p) => p.id === selectedProjectId);
  const projectJobs = mockJobs.filter((j) => j.projectId === selectedProjectId);
  const result = projectJobs.find((j) => j.result)?.result;

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Map controls</h2>
        </div>

        <div className="space-y-5 overflow-y-auto p-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Project
            </label>
            <select
              value={selectedProjectId ?? ""}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="">All projects</option>
              {mockProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Choropleth
            </label>
            <select
              value={choroplethField}
              onChange={(e) =>
                setChoroplethField(e.target.value as typeof choroplethField)
              }
              className="w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="carbon_stock_tCO2e">Carbon stock (tCO₂e)</option>
              <option value="area_ha">Area (ha)</option>
            </select>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Layers className="h-3 w-3" /> Layers
            </p>
            <ul className="space-y-1">
              {Object.entries(visibleLayers).map(([id, on]) => (
                <li key={id}>
                  <button
                    onClick={() => toggleLayer(id)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-surface-hover"
                  >
                    <span className="capitalize">{id}</span>
                    {on ? (
                      <Eye className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1 p-4">
        <div className="mapbox-container">
          Mapbox GL JS — injected in Phase 3
        </div>
      </div>

      {/* Right panel */}
      <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Result details
          </h2>
        </div>
        <div className="overflow-y-auto p-4">
          {selectedProject ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Project
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {selectedProject.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedProject.location}
                </p>
              </div>

              {result ? (
                <dl className="space-y-2 rounded-md border border-border bg-surface p-3 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Carbon stock</dt>
                    <dd className="font-mono text-foreground">
                      {result.properties.carbon_stock_tCO2e.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Area (ha)</dt>
                    <dd className="font-mono text-foreground">
                      {result.properties.area_ha.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Model</dt>
                    <dd className="font-mono text-foreground">
                      {result.properties.model_version}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No results available for this project.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a project to view its computed results.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
