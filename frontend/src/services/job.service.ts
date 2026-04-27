import api from "@/lib/axios";
import type { Job, TifResult, GeoJSONResult } from "@/types";

export const jobService = {
  /** Submit a new GeoTIFF analysis job via multipart/form-data */
  async createJob(projectId: string, file: File): Promise<Job> {
    const form = new FormData();
    // Backend expects `project_id` (snake_case) as the form field name
    form.append("project_id", projectId);
    form.append("file", file);
    const { data } = await api.post<Job>("/api/jobs", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  /** Fetch a single job by ID */
  async getJobStatus(id: string): Promise<Job> {
    const { data } = await api.get<Job>(`/api/jobs/${id}`);
    return data;
  },

  /** Fetch all jobs (backend filters by role) */
  async getJobs(): Promise<Job[]> {
    const { data } = await api.get<Job[]>("/api/jobs");
    return data;
  },

  /** Fetch the full result dict for a COMPLETE job */
  async getJobResults(jobId: string): Promise<TifResult> {
    const { data } = await api.get<TifResult>(`/api/jobs/${jobId}/results`);
    return data;
  },

  /** Fetch the GeoJSON FeatureCollection for a COMPLETE job */
  async getJobGeoJSON(jobId: string): Promise<GeoJSONResult> {
    const { data } = await api.get<GeoJSONResult>(`/api/jobs/${jobId}/geojson`);
    return data;
  },
};
