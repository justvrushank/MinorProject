import { create } from "zustand";

export interface Viewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

export type ChoroplethField = "carbon_stock_tCO2e" | "area_ha";

interface MapState {
  viewport: Viewport;
  selectedProjectId: string | null;
  visibleLayers: Record<string, boolean>;
  choroplethField: ChoroplethField;
  setViewport: (v: Viewport) => void;
  setSelectedProject: (id: string | null) => void;
  toggleLayer: (id: string) => void;
  setChoroplethField: (f: ChoroplethField) => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewport: { longitude: 80.27, latitude: 13.08, zoom: 5 },
  selectedProjectId: null,
  visibleLayers: {
    projects: true,
    results: true,
    alerts: false,
  },
  choroplethField: "carbon_stock_tCO2e",
  setViewport: (viewport) => set({ viewport }),
  setSelectedProject: (selectedProjectId) => set({ selectedProjectId }),
  toggleLayer: (id) =>
    set((s) => ({
      visibleLayers: { ...s.visibleLayers, [id]: !s.visibleLayers[id] },
    })),
  setChoroplethField: (choroplethField) => set({ choroplethField }),
}));
