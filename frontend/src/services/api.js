const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith("https://")) return envUrl;

  // Check if running inside Capacitor Android native webview
  const isNativeCapacitor =
    typeof window !== "undefined" &&
    (window.Capacitor?.isNativePlatform() ||
      window.location.protocol === "capacitor:" ||
      (import.meta.env.PROD && window.location.hostname === "localhost"));

  if (isNativeCapacitor) {
    return "https://wakestop.vercel.app/api";
  }

  // In production web (e.g. Vercel domain), use relative /api
  if (import.meta.env.PROD) {
    return "/api";
  }

  // In development, dynamically use current device hostname
  const host = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
  return `http://${host}:4000/api`;
};

const BASE_URL = getBaseUrl();

async function request(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  register: (name, email, password) =>
    request("/auth/register", { method: "POST", body: { name, email, password } }),

  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),

  searchStops: (q) => request(`/stops/search?q=${encodeURIComponent(q)}`),

  nearbyStops: (lat, lng, radius = 15000) =>
    request(`/stops/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),

  allStops: () => request("/stops"),

  startTrip: (
    token,
    payload
  ) => request("/trips/start", { method: "POST", token, body: payload }),

  endTrip: (token, tripId, wakeResponseSec) =>
    request(`/trips/${tripId}/end`, { method: "POST", token, body: { wakeResponseSec } }),

  tripHistory: (token) => request("/trips/history", { token }),

  getProfile: (token) => request("/auth/me", { token }),

  updateProfile: (token, patch) =>
    request("/auth/profile", { method: "PUT", token, body: patch }),

  changePassword: (token, currentPassword, newPassword) =>
    request("/auth/change-password", { method: "POST", token, body: { currentPassword, newPassword } }),

  forgotPassword: (email) =>
    request("/auth/forgot-password", { method: "POST", body: { email } }),

  verifyCode: (email, code) =>
    request("/auth/verify-code", { method: "POST", body: { email, code } }),

  resetPassword: (email, code, newPassword) =>
    request("/auth/reset-password", { method: "POST", body: { email, code, newPassword } }),

  deleteHistory: (token) => request("/trips/history", { method: "DELETE", token }),
};
