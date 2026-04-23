import api from "@/lib/axios";
import type { Job } from "@/types";

export const jobService = {
  async createJob(projectId: string, file: File): Promise<Job> {
    const form = new FormData();
    form.append("projectId", projectId);
    form.append("file", file);
    const { data } = await api.post<Job>("/api/jobs", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  async getJobStatus(id: string): Promise<Job> {
    const { data } = await api.get<Job>(`/api/jobs/${id}`);
    return data;
  },
  async getJobs(): Promise<Job[]> {
    const { data } = await api.get<Job[]>("/api/jobs");
    return data;
  },
};
