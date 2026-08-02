import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem("wakestop_token");
      const savedUser = localStorage.getItem("wakestop_user");
      if (savedToken) {
        setToken(savedToken);
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            // ignore JSON parse error
          }
        }
        // Validate & fetch fresh user profile from backend
        try {
          const res = await api.getProfile(savedToken);
          if (res.user) {
            persist(savedToken, res.user);
          }
        } catch (err) {
          console.warn("Session expired or invalid token:", err.message);
          logout();
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  function persist(t, u) {
    localStorage.setItem("wakestop_token", t);
    localStorage.setItem("wakestop_user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  async function login(email, password) {
    const res = await api.login(email, password);
    persist(res.token, res.user);
    return res.user;
  }

  async function register(name, email, password) {
    const res = await api.register(name, email, password);
    persist(res.token, res.user);
    return res.user;
  }

  async function updateUserProfile(patch) {
    if (!token) throw new Error("Not authenticated");
    const res = await api.updateProfile(token, patch);
    if (res.user) {
      persist(token, res.user);
    }
    return res.user;
  }

  async function changePassword(currentPassword, newPassword) {
    if (!token) throw new Error("Not authenticated");
    return await api.changePassword(token, currentPassword, newPassword);
  }

  async function deleteHistory() {
    if (!token) throw new Error("Not authenticated");
    return await api.deleteHistory(token);
  }

  function logout() {
    localStorage.removeItem("wakestop_token");
    localStorage.removeItem("wakestop_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        updateUserProfile,
        changePassword,
        deleteHistory,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
