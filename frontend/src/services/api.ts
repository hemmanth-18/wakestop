const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
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
  return data as T;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceM?: number;
}

export interface Trip {
  id: string;
  userId: string;
  start: { name: string; lat: number | null; lng: number | null };
  destination: { name: string; lat: number; lng: number };
  startTime: string;
  endTime: string | null;
  status: "active" | "completed";
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: { name, email, password } }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }),

  searchStops: (q: string) => request<Stop[]>(`/stops/search?q=${encodeURIComponent(q)}`),

  nearbyStops: (lat: number, lng: number, radius = 15000) =>
    request<Stop[]>(`/stops/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),

  allStops: () => request<Stop[]>("/stops"),

  startTrip: (
    token: string,
    payload: {
      destinationName: string;
      destinationLat: number;
      destinationLng: number;
      startName?: string;
      startLat?: number;
      startLng?: number;
    }
  ) => request<Trip>("/trips/start", { method: "POST", token, body: payload }),

  endTrip: (token: string, tripId: string) =>
    request<Trip>(`/trips/${tripId}/end`, { method: "POST", token }),

  tripHistory: (token: string) => request<Trip[]>("/trips/history", { token }),
};
