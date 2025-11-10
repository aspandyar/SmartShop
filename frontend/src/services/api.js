import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  logout: () => api.post("/api/auth/logout"),
  getCurrentUser: () => api.get("/api/auth/me"),
};

// Products API
export const productsAPI = {
  getAll: ({ limit = 10, cursor } = {}) =>
    api.get("/api/products", { params: { limit, cursor } }),
  getById: (id) => api.get(`/api/products/${id}`),
  search: (query) => api.get("/api/products/search", { params: { q: query } }),
  create: (data) => api.post("/api/products", data),
  update: (id, data) => api.put(`/api/products/${id}`, data),
  patch: (id, data) => api.patch(`/api/products/${id}`, data),
  delete: (id) => api.delete(`/api/products/${id}`),
};

// Users API
export const usersAPI = {
  getAll: () => api.get("/api/users"),
  getById: (id) => api.get(`/api/users/${id}`),
  create: (data) => api.post("/api/users", data),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  patch: (id, data) => api.patch(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`),
  updateProfile: (data) => api.put("/api/users/profile", data),
};

// Interactions API
export const interactionsAPI = {
  create: (data) => api.post("/api/interactions", data),
  getUserInteractions: (userId) => api.get(`/api/interactions/${userId}`),
};

// Recommendations API
export const recommendationsAPI = {
  get: (userId) => api.get(`/api/recommendations/${userId}`),
  save: (userId, data) => api.post(`/api/recommendations/${userId}`, data),
  regenerate: (userId) => api.post(`/api/recommendations/${userId}/regenerate`),
};

// Interaction Types API
export const interactionTypesAPI = {
  getAll: () => api.get("/api/interaction-types"),
  getByName: (name) => api.get(`/api/interaction-types/${name}`),
  create: (data) => api.post("/api/interaction-types", data),
  update: (name, data) => api.put(`/api/interaction-types/${name}`, data),
  patch: (name, data) => api.patch(`/api/interaction-types/${name}`, data),
  delete: (name) => api.delete(`/api/interaction-types/${name}`),
};

export default api;
