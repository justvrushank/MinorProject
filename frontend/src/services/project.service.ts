import api from "@/lib/axios";
import type { Project, Job } from "@/types";

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const { data } = await api.get<Project[]>("/api/projects");
    return data;
  },
  async createProject(payload: Partial<Project>): Promise<Project> {
    const { data } = await api.post<Project>("/api/projects", payload);
    return data;
  },
  async getProject(id: string): Promise<Project> {
    const { data } = await api.get<Project>(`/api/projects/${id}`);
    return data;
  },
  async updateProject(id: string, payload: Partial<Project>): Promise<Project> {
    const { data } = await api.put<Project>(`/api/projects/${id}`, payload);
    return data;
  },
  async deleteProject(id: string): Promise<void> {
    await api.delete(`/api/projects/${id}`);
  },
  /** Fetch the latest COMPLETE job for a given project. Returns null if none exists. */
  async getLatestCompleteJob(projectId: string): Promise<Job | null> {
    try {
      const { data } = await api.get<Job>(
        `/api/projects/${projectId}/jobs/latest-complete`
      );
      return data;
    } catch (err: unknown) {
      // 404 means no complete job — that's expected
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 404
      ) {
        return null;
      }
      throw err;
    }
  },
};
