import api from "@/lib/axios";
import type { Project } from "@/types";

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
};
