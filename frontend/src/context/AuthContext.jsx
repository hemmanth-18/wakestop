import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("wakestop_token");
    const savedUser = localStorage.getItem("wakestop_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
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
  }

  async function register(name, email, password) {
    const res = await api.register(name, email, password);
    persist(res.token, res.user);
  }

  function logout() {
    localStorage.removeItem("wakestop_token");
    localStorage.removeItem("wakestop_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
