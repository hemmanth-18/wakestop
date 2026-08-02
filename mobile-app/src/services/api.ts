import AsyncStorage from '@react-native-async-storage/async-storage';

const API_HOST_KEY = '@wakestop_api_host';
let customApiHost = 'http://192.168.1.100:4000/api'; // Default LAN API address fallback

export async function setApiHost(host: string): Promise<void> {
  customApiHost = host;
  await AsyncStorage.setItem(API_HOST_KEY, host);
}

export async function getApiHost(): Promise<string> {
  const stored = await AsyncStorage.getItem(API_HOST_KEY);
  if (stored) {
    customApiHost = stored;
  }
  return customApiHost;
}

interface RequestOptions {
  method?: string;
  body?: any;
  token?: string;
}

async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const baseUrl = await getApiHost();
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
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

export const api = {
  register: (name: string, email: string, password: string) =>
    request('/auth/register', { method: 'POST', body: { name, email, password } }),

  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  getProfile: (token: string) => request('/auth/me', { token }),

  searchStops: (q: string) => request(`/stops/search?q=${encodeURIComponent(q)}`),

  allStops: () => request('/stops'),

  startTrip: (token: string, payload: any) =>
    request('/trips/start', { method: 'POST', token, body: payload }),

  endTrip: (token: string, tripId: string, wakeResponseSec?: number) =>
    request(`/trips/${tripId}/end`, { method: 'POST', token, body: { wakeResponseSec } }),

  tripHistory: (token: string) => request('/trips/history', { token }),
};
