import axios from "axios";

const api = axios.create({
    baseURL: "https://docly-ai.onrender.com",
    headers: {
        "Content-Type": "application/json"
    }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("docly_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("docly_token");
      localStorage.removeItem("docly_workspace_data");
      window.dispatchEvent(new Event("auth_unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default api;