import api from "@/lib/axios";
import type { User } from "@/types";

export const userService = {
  async getMe(): Promise<User> {
    const { data } = await api.get<User>("/api/users/me");
    return data;
  },
  async updateUser(id: string, payload: Partial<User>): Promise<User> {
    const { data } = await api.put<User>(`/api/users/${id}`, payload);
    return data;
  },
  async getUsers(): Promise<User[]> {
    const { data } = await api.get<User[]>("/api/users");
    return data;
  },
};
