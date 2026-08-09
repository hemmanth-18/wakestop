import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();
if (fs.existsSync(path.join(process.cwd(), "backend", ".env"))) {
  dotenv.config({ path: path.join(process.cwd(), "backend", ".env") });
}

const supabaseUrl = process.env.SUPABASE_URL || "https://iyopwqdzsyqjvpqskpna.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_08iOI-cbjid0d3kz_pQQOQ_oTPoJblA";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ CRITICAL ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in environment!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
console.log("⚡ Connected strictly to Supabase Cloud Database:", supabaseUrl);

function parseFavoriteLocations(userRow) {
  if (!userRow) return [];

  let raw = userRow.favorite_locations || userRow.favoriteLocations || userRow.favorite_location || userRow.favoriteLocation;

  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (_) {}
  }

  if (Array.isArray(raw)) {
    return raw.filter((item) => item && typeof item === "object" && item.name);
  }

  if (raw && typeof raw === "object") {
    if (raw.favourite_1 || raw.favorite_1 || raw.favourite_2 || raw.favorite_2) {
      const list = [];
      if (raw.favourite_1 || raw.favorite_1) list.push(raw.favourite_1 || raw.favorite_1);
      if (raw.favourite_2 || raw.favorite_2) list.push(raw.favourite_2 || raw.favorite_2);
      if (raw.favourite_3 || raw.favorite_3) list.push(raw.favourite_3 || raw.favorite_3);
      return list;
    }
    if (raw.name && raw.lat != null) {
      return [raw];
    }
  }

  return [];
}

function mapUserRow(userRow) {
  if (!userRow) return null;
  const favList = parseFavoriteLocations(userRow);
  return {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    passwordHash: userRow.password_hash || userRow.passwordHash,
    profileImage: userRow.profile_image || userRow.profileImage || "",
    favoriteLocations: favList,
    favoriteLocation: userRow.favorite_location || userRow.favoriteLocation || (favList[0] || null),
    resetCode: userRow.reset_code || userRow.resetCode || null,
    resetCodeExpiry: userRow.reset_code_expiry || userRow.resetCodeExpiry || null,
    createdAt: userRow.created_at || userRow.createdAt,
    updatedAt: userRow.updated_at || userRow.updatedAt,
  };
}

function mapTripRow(t) {
  if (!t) return null;
  return {
    id: t.id,
    userId: t.user_id || t.userId,
    start: { name: t.start_name || t.start?.name || null, lat: t.start_lat ?? t.start?.lat ?? null, lng: t.start_lng ?? t.start?.lng ?? null },
    destination: {
      name: t.destination_name || t.destination?.name,
      lat: t.destination_lat ?? t.destination?.lat,
      lng: t.destination_lng ?? t.destination?.lng,
    },
    startTime: t.start_time || t.startTime,
    endTime: t.end_time || t.endTime,
    status: t.status,
    wakeResponseSec: t.wake_response_sec ?? t.wakeResponseSec ?? null,
  };
}

function mapStopRow(s) {
  if (!s) return null;
  const latVal = Number(s.latitude ?? s.lat);
  const lngVal = Number(s.longitude ?? s.lng);
  return {
    id: String(s.id),
    name: s.name,
    latitude: latVal,
    longitude: lngVal,
    lat: latVal,
    lng: lngVal,
  };
}

export const db = {
  users: {
    findByEmail: async (email) => {
      const targetEmail = (typeof email === "string" ? email : "").trim().toLowerCase();
      if (!targetEmail) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", targetEmail)
        .limit(1);

      if (error) {
        console.error("Supabase findByEmail error:", error.message);
        return null;
      }

      return data && data.length > 0 ? mapUserRow(data[0]) : null;
    },

    findById: async (id) => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .limit(1);

      if (error) {
        console.error("Supabase findById error:", error.message);
        return null;
      }

      return data && data.length > 0 ? mapUserRow(data[0]) : null;
    },

    insert: async (user) => {
      const supabasePayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: user.passwordHash,
        profile_image: user.profileImage || "",
        created_at: user.createdAt || new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("users")
        .insert(supabasePayload)
        .select()
        .single();

      if (error) {
        console.error("❌ Supabase insert user error:", error.message);
        throw new Error(error.message);
      }

      console.log("✅ Supabase user created successfully:", data.email);
      return mapUserRow(data);
    },

    update: async (id, patch) => {
      if (!id) return null;

      const updateObj = {};
      if (patch.name !== undefined) updateObj.name = patch.name;
      if (patch.passwordHash !== undefined) updateObj.password_hash = patch.passwordHash;
      if (patch.profileImage !== undefined) updateObj.profile_image = patch.profileImage;
      if (patch.favoriteLocations !== undefined) {
        updateObj.favorite_location = patch.favoriteLocations;
      } else if (patch.favoriteLocation !== undefined) {
        updateObj.favorite_location = patch.favoriteLocation;
      }
      if (patch.resetCode !== undefined) updateObj.reset_code = patch.resetCode;
      if (patch.resetCodeExpiry !== undefined) updateObj.reset_code_expiry = patch.resetCodeExpiry;
      updateObj.updated_at = new Date().toISOString();

      let { data, error } = await supabase
        .from("users")
        .update(updateObj)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Supabase update user error:", error.message);
      }

      if (!data && patch.email) {
        const fallbackRes = await supabase
          .from("users")
          .update(updateObj)
          .ilike("email", patch.email)
          .select()
          .maybeSingle();
        data = fallbackRes.data;
      }

      return mapUserRow(data);
    },
  },

  trips: {
    findByUser: async (userId) => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", userId)
        .order("start_time", { ascending: false });

      if (error) {
        console.error("Supabase findByUser trips error:", error.message);
        return [];
      }

      return (data || []).map(mapTripRow);
    },

    findById: async (id) => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Supabase findById trip error:", error.message);
        return null;
      }

      return mapTripRow(data);
    },

    insert: async (trip) => {
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

      if (error) {
        console.error("Supabase insert trip error:", error.message);
        throw new Error(error.message);
      }

      return mapTripRow(data);
    },

    update: async (id, patch) => {
      const updateObj = {};
      if (patch.status !== undefined) updateObj.status = patch.status;
      if (patch.endTime !== undefined) updateObj.end_time = patch.endTime;

      const { data, error } = await supabase
        .from("trips")
        .update(updateObj)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Supabase update trip error:", error.message);
        return null;
      }

      return mapTripRow(data);
    },

    deleteByUser: async (userId) => {
      const { error } = await supabase.from("trips").delete().eq("user_id", userId);
      if (error) {
        console.error("Supabase deleteByUser trips error:", error.message);
        return false;
      }
      return true;
    },
  },

  stops: {
    all: async () => {
      const { data, error } = await supabase.from("stops").select("*");
      if (error) {
        console.error("Supabase stops.all error:", error.message);
        return [];
      }
      return (data || []).map(mapStopRow);
    },

    search: async (q) => {
      const { data, error } = await supabase
        .from("stops")
        .select("*")
        .ilike("name", `%${q || ""}%`);

      if (error) {
        console.error("Supabase stops.search error:", error.message);
        return [];
      }
      return (data || []).map(mapStopRow);
    },
  },
};

const INITIAL_STOPS = [
  { id: "1", name: "Coimbatore Gandhipuram Bus Stand", latitude: 11.0183, longitude: 76.9725 },
  { id: "2", name: "Tirupur Bus Stand", latitude: 11.1085, longitude: 77.3411 },
  { id: "3", name: "Erode Bus Stand", latitude: 11.341, longitude: 77.7172 },
  { id: "4", name: "Salem Central Bus Stand", latitude: 11.6643, longitude: 78.146 },
  { id: "5", name: "Krishnagiri Bus Stand", latitude: 12.5186, longitude: 78.2137 },
  { id: "6", name: "Vellore Bus Stand", latitude: 12.9165, longitude: 79.1325 },
  { id: "7", name: "Kanchipuram Bus Stand", latitude: 12.8342, longitude: 79.7036 },
  { id: "8", name: "Chennai Koyambedu (CMBT)", latitude: 13.0693, longitude: 80.1948 },
];

export async function seedStops() {
  if (!supabase) return;
  try {
    const { count, error } = await supabase
      .from("stops")
      .select("*", { count: "exact", head: true });

    if (!error && count === 0) {
      const { error: seedError } = await supabase.from("stops").insert(INITIAL_STOPS);
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
