const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  // In production (e.g. Vercel), use relative /api unless a valid remote HTTPS URL is provided
  if (import.meta.env.PROD) {
    if (envUrl && envUrl.startsWith("https://")) {
      return envUrl;
    }
    return "/api";
  }

  // In development, if custom non-localhost env URL exists, use it
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }

  // Otherwise dynamically use the current device's hostname (e.g. 10.229.4.203, 192.168.x.x)
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
};
