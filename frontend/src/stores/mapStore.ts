import { create } from "zustand";
import type { Job } from "@/types";

export type ChoroplethField = "carbon_tco2e" | "area_ha" | "raw_value";

export const CHOROPLETH_OPTIONS = [
  { label: "Carbon stock (tCO₂e)", value: "carbon_tco2e" },
  { label: "Area (ha)",             value: "area_ha"      },
  { label: "Risk score",            value: "raw_value"    },
] as const;

export interface Viewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface MapState {
  viewport: Viewport;
  selectedProjectId: string | null;
  visibleLayers: Record<string, boolean>;
  choroplethField: ChoroplethField;
  completedJobs: Job[];
  selectedFeatureProps: Record<string, any> | null;

  setViewport: (v: Viewport) => void;
  setSelectedProject: (id: string | null) => void;
  toggleLayer: (id: string) => void;
  setChoroplethField: (f: ChoroplethField) => void;
  setCompletedJobs: (jobs: Job[]) => void;
  /** Idempotent — skips if job.id already present */
  addCompletedJob: (job: Job) => void;
  setSelectedFeatureProps: (props: Record<string, any> | null) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  viewport: { longitude: 80.27, latitude: 13.08, zoom: 5 },
  selectedProjectId: null,
  visibleLayers: {
    projects: true,
    results: true,
    alerts: false,
  },
  choroplethField: "carbon_tco2e",
  completedJobs: [],
  selectedFeatureProps: null,

  setViewport: (viewport) => set({ viewport }),
  setSelectedProject: (selectedProjectId) => set({ selectedProjectId }),
  toggleLayer: (id) =>
    set((s) => ({
      visibleLayers: { ...s.visibleLayers, [id]: !s.visibleLayers[id] },
    })),
  setChoroplethField: (choroplethField) => set({ choroplethField }),
  setCompletedJobs: (completedJobs) => set({ completedJobs }),
  addCompletedJob: (job) => {
    const existing = get().completedJobs;
    if (existing.some((j) => j.id === job.id)) return;
    set({ completedJobs: [...existing, job] });
  },
  setSelectedFeatureProps: (selectedFeatureProps) =>
    set({ selectedFeatureProps }),
}));
