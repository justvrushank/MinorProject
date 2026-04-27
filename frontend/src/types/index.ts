export type UserRole = "analyst" | "verifier" | "admin";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status?: "active" | "suspended";
}

export type JobStatus = "pending" | "running" | "complete" | "failed";

export interface ResultProperties {
  carbon_stock_tCO2e: number;
  area_ha: number;
  model_version: string;
  computed_at: string;
}

export interface ResultFeature {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: ResultProperties;
}

/** Legacy JobResults shape (from job_results table via Celery worker) */
export interface JobResults {
  total_area_ha: number;
  carbon_stock_tco2e: number;
  mean_ndvi: number;
  pixel_count: number;
  resolution_m: number;
  verified: boolean;
}

/** Full result dict returned by tif_processor (stored in jobs.result JSON column) */
export interface TifResult {
  valid_area_ha: number;
  total_carbon_tco2e: number;
  avg_carbon_per_ha: number;
  ndvi_mean: number | null;
  band_mean: number;
  band_min: number;
  band_max: number;
  crs: string;
  width_px: number;
  height_px: number;
  band_count: number;
  valid_pixels: number;
  total_pixels: number;
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  geojson?: GeoJSONResult;
}

/** GeoJSON FeatureCollection returned by /api/jobs/{id}/geojson */
export interface GeoJSONResult {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: number[][][] };
    properties: {
      carbon_tco2e: number;
      raw_value: number;
      row: number;
      col: number;
    };
  }>;
}

export interface Job {
  id: string;
  projectId: string;
  projectName?: string;
  status: JobStatus;
  createdAt: string;
  updatedAt?: string;
  fileName?: string;
  result?: TifResult | ResultFeature | JobResults | null; // inline JSON column
  results?: TifResult | JobResults | null;               // alias from API
}

export interface Project {
  id: string;
  name: string;
  location?: string;
  createdAt: string;
  status: "active" | "archived" | "draft" | string;
  description?: string;
}

export interface Alert {
  id: string;
  type: "info" | "warning" | "critical";
  severity?: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  status?: string;
  projectId?: string;
}

export interface Verification {
  id: string;
  jobId: string;
  verifierId: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  createdAt: string;
}
