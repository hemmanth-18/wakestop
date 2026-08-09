/**
 * Group Travel API service.
 * All group HTTP calls, following the same pattern as api.js.
 */

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

  if (import.meta.env.PROD) {
    return "/api";
  }

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
  if (!res.ok) throw new Error(data.error || `Request failed ${res.status}`);
  return data;
}

export const groupApi = {
  /** Host creates a group. Returns { code, pin, destination, destinations, expiresAt } */
  create: (token, destinations, displayName) => {
    let destArray = [];
    if (Array.isArray(destinations)) {
      destArray = destinations;
    } else if (destinations && typeof destinations === "object") {
      destArray = [destinations];
    }
    const primary = destArray[0] || {};
    return request("/groups/create", {
      method: "POST",
      token,
      body: {
        destinations: destArray,
        destinationName: primary.name,
        destinationLat: primary.lat,
        destinationLng: primary.lng,
        displayName,
      },
    });
  },

  /** Joiner enters code + PIN + optional selectedDestinationId. Returns { code, destination, destinations, alarmStage } */
  join: (token, code, pin, displayName, selectedDestinationId = null) =>
    request("/groups/join", {
      method: "POST",
      token,
      body: { code, pin, displayName, selectedDestinationId },
    }),

  /** Member posts GPS position every 3s */
  updatePosition: (token, code, lat, lng) =>
    request(`/groups/${code}/position`, {
      method: "POST",
      token,
      body: { lat, lng },
    }),

  /** Member broadcasts an alarm stage to the whole group */
  triggerAlarm: (token, code, stage) =>
    request(`/groups/${code}/alarm`, {
      method: "POST",
      token,
      body: { stage },
    }),

  /** Poll group state every 3s. Returns { alarmStage, members[], destination } */
  getState: (token, code) =>
    request(`/groups/${code}/state`, { token }),

  /** Host starts the trip (activates status for all members) */
  startGroupTrip: (token, code) =>
    request(`/groups/${code}/start`, { method: "POST", token }),

  /** Host dissolves the group after trip ends */
  dissolve: (token, code) =>
    request(`/groups/${code}`, { method: "DELETE", token }),

  /** Member or host updates their target drop-off stop on live tracking without page reload */
  updateMemberStop: (token, code, selectedDestinationId) =>
    request(`/groups/${code}/stop`, {
      method: "POST",
      token,
      body: { selectedDestinationId },
    }),
};
