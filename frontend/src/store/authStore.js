import { create } from "zustand";
import api from "../services/api.js";

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token") || null,
  loading: false,

  sendOtp: async (email) => {
    set({ loading: true });
    try {
      await api.post("/api/auth/send-otp", { email });
      set({ loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  register: async (username, email, password, otp) => {
    set({ loading: true });
    try {
      const res = await api.post("/api/auth/register", { username, email, password, otp });
      const { user, token } = res.data;
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
      set({ user, token, loading: false });
      return user;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post("/api/auth/login", { email, password });
      const { user, token } = res.data;
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
      set({ user, token, loading: false });
      return user;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    try { await api.post("/api/auth/logout"); } catch {}
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const res = await api.get("/api/auth/me");
      const user = res.data.user;
      localStorage.setItem("user", JSON.stringify(user));
      set({ user });
    } catch {
      set({ user: null, token: null });
    }
  },

  updateUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
}));

export default useAuthStore;
