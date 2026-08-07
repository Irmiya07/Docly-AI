import api from "./axios";

export const loginUser = async (username, password) => {
  const response = await api.post("/auth/login", { username, password });
  return response.data;
};

export const signupUser = async (username, email, password) => {
  const response = await api.post("/auth/signup", { username, email, password });
  return response.data;
};
