import api from "@/lib/axios";
import type { ResultFeature } from "@/types";

export const resultService = {
  async getResult(jobId: string): Promise<ResultFeature> {
    const { data } = await api.get<ResultFeature>(`/api/results/${jobId}`);
    return data;
  },
  async getProjectResults(projectId: string): Promise<ResultFeature[]> {
    const { data } = await api.get<ResultFeature[]>(
      `/api/projects/${projectId}/results`,
    );
    return data;
  },
};
