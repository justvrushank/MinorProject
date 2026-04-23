import api from "@/lib/axios";
import type { Alert } from "@/types";

export const alertService = {
  async getAlerts(): Promise<Alert[]> {
    const { data } = await api.get<Alert[]>("/api/alerts");
    return data;
  },
  async markAlertRead(id: string): Promise<Alert> {
    const { data } = await api.post<Alert>(`/api/alerts/${id}/read`);
    return data;
  },
};
