import React, { createContext, useState, useContext, useEffect } from "react";
import { loginUser, signupUser } from "../api/authApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on load
    const savedToken = localStorage.getItem("docly_token");
    const savedUser = localStorage.getItem("docly_user");
    const savedGuest = localStorage.getItem("docly_guest") === "true";

    if (savedToken && savedUser && !savedGuest) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else if (savedGuest) {
      // If we are a guest and refreshed, we must clear the guest session history!
      // This enforces: "Refreshing the page should remove the guest document workspace. Closing the browser should remove guest data."
      setIsGuest(false);
      setToken(null);
      setUser(null);
      localStorage.removeItem("docly_token");
      localStorage.removeItem("docly_user");
      localStorage.removeItem("docly_guest");
      localStorage.removeItem("docly_workspace_data");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("auth_unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth_unauthorized", handleUnauthorized);
  }, []);

  const login = async (username, password) => {
    const data = await loginUser(username, password);
    if (data && data.access_token) {
      setToken(data.access_token);
      setUser(data.user);
      setIsGuest(false);
      localStorage.setItem("docly_token", data.access_token);
      localStorage.setItem("docly_user", JSON.stringify(data.user));
      localStorage.removeItem("docly_guest");
      localStorage.removeItem("docly_workspace_data"); // clear previous guest/user lists on fresh login
      return data.user;
    }
    throw new Error("Invalid response received from auth server.");
  };

  const signup = async (username, email, password) => {
    return await signupUser(username, email, password);
  };

  const continueAsGuest = () => {
    const guestToken = `guest_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    setIsGuest(true);
    setToken(guestToken);
    setUser({ username: "Guest Counsel", email: "guest@docly.ai", role: "guest" });
    localStorage.setItem("docly_guest", "true");
    localStorage.setItem("docly_token", guestToken);
    localStorage.setItem("docly_user", JSON.stringify({ username: "Guest Counsel", email: "guest@docly.ai", role: "guest" }));
    localStorage.removeItem("docly_workspace_data"); // clear any stale list
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem("docly_token");
    localStorage.removeItem("docly_user");
    localStorage.removeItem("docly_guest");
    localStorage.removeItem("docly_workspace_data");
  };

  const value = {
    user,
    token,
    isGuest,
    isAuthenticated: !!token || isGuest,
    isLoading,
    login,
    signup,
    continueAsGuest,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be nested within an AuthProvider");
  }
  return context;
};
