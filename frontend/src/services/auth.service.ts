import api from "@/lib/axios";
import type { User, UserRole } from "@/types";

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export const authService = {
  async register(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/register", {
      email,
      password,
    });
    return data;
  },
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/login", {
      email,
      password,
    });
    return data;
  },
  async refresh(): Promise<{ accessToken: string }> {
    const { data } = await api.post("/api/auth/refresh");
    return data;
  },
  async logout(): Promise<void> {
    await api.post("/api/auth/logout");
  },
};

export type { UserRole };
