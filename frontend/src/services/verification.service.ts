import api from "@/lib/axios";
import type { Verification } from "@/types";

export const verificationService = {
  async getVerifications(): Promise<Verification[]> {
    const { data } = await api.get<Verification[]>("/api/verifications");
    return data;
  },
  async createVerification(
    payload: Partial<Verification>,
  ): Promise<Verification> {
    const { data } = await api.post<Verification>(
      "/api/verifications",
      payload,
    );
    return data;
  },
  async updateVerification(
    id: string,
    payload: Partial<Verification>,
  ): Promise<Verification> {
    const { data } = await api.put<Verification>(
      `/api/verifications/${id}`,
      payload,
    );
    return data;
  },
};
