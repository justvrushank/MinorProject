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

export interface Job {
  id: string;
  projectId: string;
  projectName?: string;
  status: JobStatus;
  createdAt: string;
  updatedAt?: string;
  fileName?: string;
  result?: ResultFeature;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  createdAt: string;
  status: "active" | "archived" | "draft";
  description?: string;
}

export interface Alert {
  id: string;
  type: "info" | "warning" | "critical";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
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
