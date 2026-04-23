import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
}

// accessToken stored IN MEMORY only — never localStorage
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, token) =>
    set({ user, accessToken: token, isAuthenticated: true }),
  setToken: (token) => set({ accessToken: token }),
  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),
}));
