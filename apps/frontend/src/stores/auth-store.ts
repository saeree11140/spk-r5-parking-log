import type { AuthUser } from "@spk-r5-parking-log/shared-types";
import { create } from "zustand";

export type AuthStatus = "checking" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  setAuthenticated: (user: AuthUser) => void;
  setUnauthenticated: () => void;
  setChecking: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "checking",
  user: null,
  setAuthenticated: (user) => set({ status: "authenticated", user }),
  setUnauthenticated: () => set({ status: "unauthenticated", user: null }),
  setChecking: () => set({ status: "checking", user: null }),
}));
