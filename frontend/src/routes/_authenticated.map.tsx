import "mapbox-gl/dist/mapbox-gl.css";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import {
  Layers,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  BarChart3,
  Leaf,
  FileText,
  X,
} from "lucide-react";
import { useMapStore, CHOROPLETH_OPTIONS } from "@/stores/mapStore";
import type { ChoroplethField } from "@/stores/mapStore";
import { projectService } from "@/services/project.service";
import { jobService } from "@/services/job.service";
import { useState } from "react";
import type { Project, Job, GeoJSONResult } from "@/types";

export const Route = createFileRoute("/_authenticated/map")({
  component: MapPage,
});

// ── Color scale stops ──────────────────────────────────────────────────────────
const COLOR_STOPS = [
  { value: 0,   color: "#e0f3f8", label: "0"    },
  { value: 25,  color: "#74c476", label: "25"   },
  { value: 50,  color: "#41ab5d", label: "50"   },
  { value: 100, color: "#006d2c", label: "100+" },
];

function buildColorExpression(field: string): mapboxgl.Expression {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", field], 0],
    0,   "#e0f3f8",
    25,  "#74c476",
    50,  "#41ab5d",
    100, "#006d2c",
  ] as mapboxgl.Expression;
}

function fmt(n: number | null | undefined, dp = 1) {
  return n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: dp });
}

function MapPage() {
  const mapStore = useMapStore();
  const {
    selectedProjectId,
    setSelectedProject,
    visibleLayers,
    toggleLayer,
    choroplethField,
    setChoroplethField,
    completedJobs,
    setCompletedJobs,
    addCompletedJob,
    selectedFeatureProps,
    setSelectedFeatureProps,
  } = mapStore;

  // ── Refs ──────────────────────────────────────────────────────────────────
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<mapboxgl.Map | null>(null);
  const mapInitialized  = useRef(false);
  const popupRef        = useRef<mapboxgl.Popup | null>(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [projects,      setProjects]      = useState<Project[]>([]);
  const [loadingProj,   setLoadingProj]   = useState(true);
  const [loadingData,   setLoadingData]   = useState(false);
  const [tokenMissing,  setTokenMissing]  = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // ── Load projects ─────────────────────────────────────────────────────────
  useEffect(() => {
    projectService
      .getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoadingProj(false));
  }, []);

  // ── Per-job layer helper ──────────────────────────────────────────────────
  const addJobLayerToMap = useCallback(
    (job: Job, geojson: GeoJSONResult) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      const sourceId = `job-result-${job.id}`;
      const fillId   = `layer-result-${job.id}`;
      const lineId   = `outline-result-${job.id}`;

      // Idempotent guard
      if (map.getSource(sourceId)) return;

      map.addSource(sourceId, {
        type: "geojson",
        data: geojson as unknown as GeoJSON.FeatureCollection,
      });

      map.addLayer({
        id: fillId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": buildColorExpression("carbon_tco2e"),
          "fill-opacity": 0.7,
        },
      });

      map.addLayer({
        id: lineId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#ffffff",
          "line-width": 0.5,
        },
      });

      // Click → populate right panel
      map.on("click", fillId, (e) => {
        const props = e.features?.[0]?.properties ?? {};
        setSelectedFeatureProps({
          ...props,
          _jobId:       job.id,
          _fileName:    job.fileName,
          _projectName: job.projectName,
          _createdAt:   job.createdAt,
        });
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          className: "carbon-popup",
        })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="
              background:#1a1d27;border:1px solid #2e3347;border-radius:6px;
              padding:8px 12px;font-family:'JetBrains Mono',monospace;
              font-size:12px;color:#e6eaf4;white-space:nowrap;">
              <span style="color:#74c476;">⬤</span>&nbsp;
              <strong>${Number(props.carbon_tco2e ?? 0).toFixed(2)}</strong>
              <span style="color:#8892aa;"> tCO₂e</span>
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseenter", fillId, () => {
        if (map) map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", fillId, () => {
        if (map) map.getCanvas().style.cursor = "";
      });
    },
    [setSelectedFeatureProps]
  );

  // ── Load all complete jobs when map style loads ───────────────────────────
  const loadAllCompleteJobs = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    setLoadingData(true);
    try {
      const allJobs = await jobService.getJobs();
      const complete = allJobs.filter((j) => j.status === "complete");
      setCompletedJobs(complete);
      for (const job of complete) {
        try {
          const geojson = await jobService.getJobGeoJSON(job.id);
          addJobLayerToMap(job, geojson);
        } catch (err) {
          console.warn(`Skipping job ${job.id} — GeoJSON unavailable`, err);
        }
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoadingData(false);
    }
  }, [setCompletedJobs, addJobLayerToMap]);

  // ── Map initialization ────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInitialized.current || !mapContainerRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!token || token === "your-mapbox-token-here") {
      console.warn("VITE_MAPBOX_TOKEN is not set — map will not load.");
      setTokenMissing(true);
      return;
    }

    mapInitialized.current = true;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [80.27, 13.08],
      zoom: 5,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("load", () => {
      // Step 0D: resize first to fix flex/grid blank map
      map.resize();
      // Load all complete job layers
      loadAllCompleteJobs();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapInitialized.current = false;
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 0E: ResizeObserver ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !mapRef.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Choropleth field change → repaint all layers ──────────────────────────
  const handleChoroplethChange = useCallback(
    (newField: ChoroplethField) => {
      setChoroplethField(newField);
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      for (const job of completedJobs) {
        const fillId = `layer-result-${job.id}`;
        if (!map.getLayer(fillId)) continue;
        map.setPaintProperty(fillId, "fill-color", buildColorExpression(newField));
      }
    },
    [setChoroplethField, completedJobs]
  );

  // ── Layer visibility toggle ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const resultsVisible = visibleLayers["results"] !== false;
    const vis = resultsVisible ? "visible" : "none";
    for (const job of completedJobs) {
      const fillId = `layer-result-${job.id}`;
      const lineId = `outline-result-${job.id}`;
      if (map.getLayer(fillId)) map.setLayoutProperty(fillId, "visibility", vis);
      if (map.getLayer(lineId)) map.setLayoutProperty(lineId, "visibility", vis);
    }
  }, [visibleLayers, completedJobs]);

  // ── Project selector → fitBounds ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (!selectedProjectId) {
      // "All projects" — reset view
      map.flyTo({ center: [80.27, 13.08], zoom: 5, duration: 1000 });
      return;
    }

    const jobsForProject = completedJobs.filter(
      (j) => j.projectId === selectedProjectId
    );
    if (jobsForProject.length === 0) return;

    // Use result bbox if available
    const firstJob = jobsForProject[0];
    const r = firstJob.result as {
      bbox?: { west: number; south: number; east: number; north: number };
    } | null | undefined;

    if (r?.bbox) {
      const { west, south, east, north } = r.bbox;
      map.fitBounds([[west, south], [east, north]], { padding: 60, duration: 1000 });
    }
  }, [selectedProjectId, completedJobs]);

  // ── Live update: watch completedJobs for newly added entries ─────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || completedJobs.length === 0) return;
    const latest = completedJobs[completedJobs.length - 1];
    const sourceId = `job-result-${latest.id}`;
    if (map.getSource(sourceId)) return; // already rendered
    jobService
      .getJobGeoJSON(latest.id)
      .then((geojson) => addJobLayerToMap(latest, geojson))
      .catch((err) => console.warn("Live update failed", err));
  }, [completedJobs.length, addJobLayerToMap]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full">
      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Map controls</h2>
        </div>

        <div className="space-y-5 overflow-y-auto p-4">
          {/* Project dropdown */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Project
            </label>
            {loadingProj ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading projects…
              </div>
            ) : (
              <select
                id="map-project-select"
                value={selectedProjectId ?? ""}
                onChange={(e) => setSelectedProject(e.target.value || null)}
                className="w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="">— All projects —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Choropleth dropdown */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Choropleth
            </label>
            <select
              id="map-choropleth-select"
              value={choroplethField}
              onChange={(e) =>
                handleChoroplethChange(e.target.value as ChoroplethField)
              }
              className="w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            >
              {CHOROPLETH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Layer toggles */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Layers className="h-3 w-3" /> Layers
            </p>
            <ul className="space-y-1">
              {Object.entries(visibleLayers).map(([id, on]) => (
                <li key={id}>
                  <button
                    id={`layer-toggle-${id}`}
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

          {/* Color scale legend */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Carbon scale (tCO₂e)
            </p>
            <div className="rounded-md border border-border bg-surface p-2.5">
              {COLOR_STOPS.map((stop) => (
                <div key={stop.value} className="flex items-center gap-2 py-0.5">
                  <span
                    className="inline-block h-3 w-5 shrink-0 rounded-sm border border-white/10"
                    style={{ backgroundColor: stop.color }}
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    {stop.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Loading indicator */}
          {loadingData && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading job layers…
            </div>
          )}

          {/* Loaded jobs count */}
          {!loadingData && completedJobs.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {completedJobs.length} completed job{completedJobs.length !== 1 ? "s" : ""} loaded
            </p>
          )}
        </div>
      </aside>

      {/* ── Map panel ─────────────────────────────────────────────────────── */}
      <div className="relative flex-1">
        {/* Token missing banner */}
        {tokenMissing && (
          <div className="absolute inset-x-0 top-0 z-20 bg-destructive/90 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
            ⚠ VITE_MAPBOX_TOKEN is not set — map will not load. Add it to{" "}
            <code className="font-mono">frontend/.env</code> and restart the dev
            server.
          </div>
        )}

        {/* Map container */}
        <div
          ref={mapContainerRef}
          className="absolute inset-0"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Bottom-left legend overlay */}
        {completedJobs.length > 0 && (
          <div
            className="absolute bottom-8 left-4 z-10 rounded-lg border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-sm"
            style={{ pointerEvents: "none" }}
          >
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/60">
              tCO₂e
            </p>
            <div className="flex flex-col gap-0.5">
              {[...COLOR_STOPS].reverse().map((stop) => (
                <div key={stop.value} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-4 rounded-sm"
                    style={{ backgroundColor: stop.color }}
                  />
                  <span className="font-mono text-[10px] text-white/80">
                    {stop.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel ───────────────────────────────────────────────────── */}
      <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Result details</h2>
        </div>

        <div className="overflow-y-auto p-4">
          {!selectedFeatureProps ? (
            <p className="text-xs text-muted-foreground">
              Select a project to view its computed results.
              <br />
              <span className="mt-1 block text-[10px]">
                Click any polygon on the map to inspect its values.
              </span>
            </p>
          ) : (
            <div className="space-y-4">
              {/* Clear button */}
              <button
                onClick={() => setSelectedFeatureProps(null)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Clear selection
              </button>

              {/* Project */}
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Project
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {String(selectedFeatureProps._projectName ?? selectedProject?.name ?? "—")}
                  </p>
                </div>
              </div>

              {/* File + Job ID */}
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    File
                  </p>
                  <p className="mt-0.5 truncate text-xs text-foreground">
                    {String(selectedFeatureProps._fileName ?? "—")}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Job:{" "}
                    {selectedFeatureProps._jobId
                      ? String(selectedFeatureProps._jobId).slice(0, 8) + "…"
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Key metrics */}
              <dl className="space-y-2 rounded-md border border-border bg-surface p-3 text-xs">
                {/* Carbon stock */}
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <BarChart3 className="h-3 w-3" /> Carbon stock
                  </dt>
                  <dd className="font-mono font-semibold text-emerald-400">
                    {selectedFeatureProps.carbon_tco2e != null
                      ? Number(selectedFeatureProps.carbon_tco2e).toFixed(2) + " tCO₂e"
                      : "—"}
                  </dd>
                </div>

                {/* Area */}
                {selectedFeatureProps.area_ha != null && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Area</dt>
                    <dd className="font-mono text-foreground">
                      {fmt(Number(selectedFeatureProps.area_ha), 2)} ha
                    </dd>
                  </div>
                )}

                {/* Mean NDVI */}
                {selectedFeatureProps.mean_ndvi != null && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1 text-muted-foreground">
                      <Leaf className="h-3 w-3" /> Mean NDVI
                    </dt>
                    <dd className="font-mono text-foreground">
                      {Number(selectedFeatureProps.mean_ndvi).toFixed(4)}
                    </dd>
                  </div>
                )}

                {/* Raw value */}
                {selectedFeatureProps.raw_value != null && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Raw value</dt>
                    <dd className="font-mono text-foreground">
                      {Number(selectedFeatureProps.raw_value).toFixed(4)}
                    </dd>
                  </div>
                )}

                {/* Pixel count */}
                {selectedFeatureProps.pixel_count != null && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Pixel count</dt>
                    <dd className="font-mono text-foreground">
                      {Number(selectedFeatureProps.pixel_count).toLocaleString()}
                    </dd>
                  </div>
                )}

                {/* Grid cell coords */}
                {(selectedFeatureProps.row != null || selectedFeatureProps.col != null) && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Grid cell</dt>
                    <dd className="font-mono text-[10px] text-foreground">
                      row {String(selectedFeatureProps.row)}, col {String(selectedFeatureProps.col)}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Processing timestamp */}
              {selectedFeatureProps._createdAt && (
                <p className="text-[10px] text-muted-foreground">
                  Processed:{" "}
                  {new Date(String(selectedFeatureProps._createdAt)).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
