import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

const LOCAL_DB_FILE = path.join(process.cwd(), "backend", "data", "local_db.json");

let supabaseClient = null;

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey && typeof supabaseKey === "string" && supabaseKey.length > 20) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log("⚡ Connected strictly to Supabase Cloud Database");
  }
} catch (e) {
  console.warn("Supabase init warning:", e?.message);
}

export const supabase = supabaseClient;

let localStore = {
  users: [],
  trips: [],
  stops: [
    { id: "1", name: "Coimbatore Gandhipuram Bus Stand", latitude: 11.0183, longitude: 76.9725 },
    { id: "2", name: "Tirupur Bus Stand", latitude: 11.1085, longitude: 77.3411 },
    { id: "3", name: "Erode Bus Stand", latitude: 11.341, longitude: 77.7172 },
    { id: "4", name: "Salem Central Bus Stand", latitude: 11.6643, longitude: 78.146 },
    { id: "5", name: "Krishnagiri Bus Stand", latitude: 12.5186, longitude: 78.2137 },
    { id: "6", name: "Vellore Bus Stand", latitude: 12.9165, longitude: 79.1325 },
    { id: "7", name: "Kanchipuram Bus Stand", latitude: 12.8342, longitude: 79.7036 },
    { id: "8", name: "Chennai Koyambedu (CMBT)", latitude: 13.0693, longitude: 80.1948 },
  ],
};

try {
  if (fs.existsSync(LOCAL_DB_FILE)) {
    const raw = fs.readFileSync(LOCAL_DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed) {
      localStore = { ...localStore, ...parsed };
    }
  }
} catch (e) {
  // Ignore filesystem read errors (read-only environment on Vercel)
}

function saveLocalStore() {
  try {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(localStore, null, 2), "utf-8");
  } catch (e) {
    // Ignore read-only file system errors on Vercel
  }
}

export const db = {
  users: {
    findByEmail: async (email) => {
      const targetEmail = (typeof email === "string" ? email : "").trim().toLowerCase();
      if (!targetEmail) return null;

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", targetEmail)
            .maybeSingle();

          if (!error && data) {
            return {
              id: data.id,
              name: data.name,
              email: data.email,
              passwordHash: data.password_hash || data.passwordHash,
              createdAt: data.created_at,
            };
          }
        } catch (e) {
          console.warn("Supabase findByEmail exception:", e?.message);
        }
      }

      const local = (localStore.users || []).find((u) => u && typeof u.email === "string" && u.email.toLowerCase() === targetEmail);
      return local ? { ...local, passwordHash: local.passwordHash || local.password_hash } : null;
    },
    findById: async (id) => {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", id)
            .maybeSingle();

          if (!error && data) {
            return {
              id: data.id,
              name: data.name,
              email: data.email,
              passwordHash: data.password_hash,
              createdAt: data.created_at,
            };
          }
        } catch (e) {
          console.warn("Supabase findById exception:", e?.message);
        }
      }
      const local = (localStore.users || []).find((u) => u && u.id === id);
      return local || null;
    },
    insert: async (user) => {
      const localUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
      };
      if (!localStore.users.some((u) => u.id === user.id)) {
        localStore.users.push(localUser);
        saveLocalStore();
      }

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("users")
            .insert({
              id: user.id,
              name: user.name,
              email: user.email,
              password_hash: user.passwordHash,
              created_at: user.createdAt,
            })
            .select()
            .single();

          if (!error && data) {
            return {
              id: data.id,
              name: data.name,
              email: data.email,
              passwordHash: data.password_hash,
              createdAt: data.created_at,
            };
          }
        } catch (e) {
          console.warn("Supabase insert user exception:", e?.message);
        }
      }
      return localUser;
    },
  },

  trips: {
    findByUser: async (userId) => {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("trips")
            .select("*")
            .eq("user_id", userId)
            .order("start_time", { ascending: false });

          if (!error && data) {
            return data.map((t) => ({
              id: t.id,
              userId: t.user_id,
              start: { name: t.start_name, lat: t.start_lat, lng: t.start_lng },
              destination: {
                name: t.destination_name,
                lat: t.destination_lat,
                lng: t.destination_lng,
              },
              startTime: t.start_time,
              endTime: t.end_time,
              status: t.status,
            }));
          }
        } catch (e) {
          console.warn("Supabase findByUser trips exception:", e?.message);
        }
      }
      return (localStore.trips || [])
        .filter((t) => t.userId === userId)
        .map((t) => ({ ...t, wakeResponseSec: t.wakeResponseSec }))
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    },
    findById: async (id) => {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("trips")
            .select("*")
            .eq("id", id)
            .maybeSingle();

          if (!error && data) {
            return {
              id: data.id,
              userId: data.user_id,
              start: { name: data.start_name, lat: data.start_lat, lng: data.start_lng },
              destination: {
                name: data.destination_name,
                lat: data.destination_lat,
                lng: data.destination_lng,
              },
              startTime: data.start_time,
              endTime: data.end_time,
              status: data.status,
              wakeResponseSec: data.wake_response_sec,
            };
          }
        } catch (e) {
          console.warn("Supabase findById trip exception:", e?.message);
        }
      }
      return (localStore.trips || []).find((t) => t.id === id) || null;
    },
    insert: async (trip) => {
      const localTrip = {
        id: trip.id,
        userId: trip.userId,
        start: { name: trip.start?.name || null, lat: trip.start?.lat ?? null, lng: trip.start?.lng ?? null },
        destination: {
          name: trip.destination.name,
          lat: trip.destination.lat,
          lng: trip.destination.lng,
        },
        startTime: trip.startTime,
        endTime: trip.endTime,
        status: trip.status,
        wakeResponseSec: trip.wakeResponseSec ?? null,
      };

      if (!localStore.trips.some((t) => t.id === trip.id)) {
        localStore.trips.push(localTrip);
        saveLocalStore();
      }

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("trips")
            .insert({
              id: trip.id,
              user_id: trip.userId,
              start_name: trip.start?.name,
              start_lat: trip.start?.lat,
              start_lng: trip.start?.lng,
              destination_name: trip.destination.name,
              destination_lat: trip.destination.lat,
              destination_lng: trip.destination.lng,
              start_time: trip.startTime,
              end_time: trip.endTime,
              status: trip.status,
            })
            .select()
            .single();

          if (!error && data) {
            return {
              id: data.id,
              userId: data.user_id,
              start: { name: data.start_name, lat: data.start_lat, lng: data.start_lng },
              destination: {
                name: data.destination_name,
                lat: data.destination_lat,
                lng: data.destination_lng,
              },
              startTime: data.start_time,
              endTime: data.end_time,
              status: data.status,
              wakeResponseSec: data.wake_response_sec,
            };
          }
        } catch (e) {
          console.warn("Supabase insert trip exception:", e?.message);
        }
      }
      return localTrip;
    },
    update: async (id, patch) => {
      const idx = localStore.trips.findIndex((t) => t.id === id);
      if (idx !== -1) {
        if (patch.status !== undefined) localStore.trips[idx].status = patch.status;
        if (patch.endTime !== undefined) localStore.trips[idx].endTime = patch.endTime;
        if (patch.wakeResponseSec !== undefined) localStore.trips[idx].wakeResponseSec = patch.wakeResponseSec;
        saveLocalStore();
      }

      if (supabase) {
        try {
          const updateObj = {};
          if (patch.status !== undefined) updateObj.status = patch.status;
          if (patch.endTime !== undefined) updateObj.end_time = patch.endTime;

          const { data, error } = await supabase
            .from("trips")
            .update(updateObj)
            .eq("id", id)
            .select()
            .maybeSingle();

          if (!error && data) {
            return {
              id: data.id,
              userId: data.user_id,
              start: { name: data.start_name, lat: data.start_lat, lng: data.start_lng },
              destination: {
                name: data.destination_name,
                lat: data.destination_lat,
                lng: data.destination_lng,
              },
              startTime: data.start_time,
              endTime: data.end_time,
              status: data.status,
              wakeResponseSec: localStore.trips[idx]?.wakeResponseSec,
            };
          }
        } catch (e) {
          console.warn("Supabase update trip exception:", e?.message);
        }
      }
      return idx !== -1 ? localStore.trips[idx] : null;
    },
  },

  stops: {
    all: async () => {
      if (supabase) {
        try {
          const { data, error } = await supabase.from("stops").select("*");
          if (!error && data && data.length > 0) {
            return data;
          }
        } catch (e) {
          console.warn("Supabase stops.all exception:", e?.message);
        }
      }
      return localStore.stops;
    },
    search: async (q) => {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("stops")
            .select("*")
            .ilike("name", `%${q || ""}%`);

          if (!error && data && data.length > 0) {
            return data;
          }
        } catch (e) {
          console.warn("Supabase stops.search exception:", e?.message);
        }
      }
      const queryStr = (q || "").toLowerCase();
      return localStore.stops.filter((s) => s.name.toLowerCase().includes(queryStr));
    },
  },
};

export async function seedStops() {
  if (!supabase) return;
  try {
    const { count, error } = await supabase
      .from("stops")
      .select("*", { count: "exact", head: true });

    if (!error && count === 0) {
      const { error: seedError } = await supabase.from("stops").insert(localStore.stops);
      if (seedError) {
        console.warn("Supabase seedStops warning:", seedError.message);
      } else {
        console.log("✅ Seeded initial stops into Supabase DB");
      }
    }
  } catch (err) {
    console.warn("Supabase seedStops catch:", err?.message);
  }
}
