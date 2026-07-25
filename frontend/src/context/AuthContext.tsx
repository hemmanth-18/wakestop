import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api, type User } from "../services/api";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
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

  function persist(t: string, u: User) {
    localStorage.setItem("wakestop_token", t);
    localStorage.setItem("wakestop_user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    persist(res.token, res.user);
  }

  async function register(name: string, email: string, password: string) {
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
