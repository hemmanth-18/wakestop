import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://iyopwqdzsyqjvpqskpna.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_08iOI-cbjid0d3kz_pQQOQ_oTPoJblA";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be configured");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log("⚡ Connected strictly to Supabase Cloud Database");

export const db = {
  users: {
    findByEmail: async (email) => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        console.error("Supabase findByEmail error:", error.message);
        throw new Error(error.message);
      }
      if (!data) return null;
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        passwordHash: data.password_hash,
        createdAt: data.created_at,
      };
    },
    findById: async (id) => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Supabase findById error:", error.message);
        throw new Error(error.message);
      }
      if (!data) return null;
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        passwordHash: data.password_hash,
        createdAt: data.created_at,
      };
    },
    insert: async (user) => {
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

      if (error) {
        console.error("Supabase insert user error:", error.message);
        throw new Error(error.message);
      }
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        passwordHash: data.password_hash,
        createdAt: data.created_at,
      };
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
        throw new Error(error.message);
      }
      if (!data) return [];
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
    },
    findById: async (id) => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Supabase findById trip error:", error.message);
        throw new Error(error.message);
      }
      if (!data) return null;
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
      };
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
      };
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
        throw new Error(error.message);
      }
      if (!data) return null;
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
      };
    },
  },

  stops: {
    all: async () => {
      const { data, error } = await supabase.from("stops").select("*");
      if (error) {
        console.error("Supabase stops.all error:", error.message);
        throw new Error(error.message);
      }
      return data || [];
    },
    search: async (q) => {
      const { data, error } = await supabase
        .from("stops")
        .select("*")
        .ilike("name", `%${q || ""}%`);

      if (error) {
        console.error("Supabase stops.search error:", error.message);
        throw new Error(error.message);
      }
      return data || [];
    },
  },
};

export async function seedStops() {
  try {
    const { count, error } = await supabase
      .from("stops")
      .select("*", { count: "exact", head: true });

    if (!error && count === 0) {
      const { error: seedError } = await supabase.from("stops").insert([
        { id: "1", name: "Coimbatore Gandhipuram Bus Stand", latitude: 11.0183, longitude: 76.9725 },
        { id: "2", name: "Tirupur Bus Stand", latitude: 11.1085, longitude: 77.3411 },
        { id: "3", name: "Erode Bus Stand", latitude: 11.341, longitude: 77.7172 },
        { id: "4", name: "Salem Central Bus Stand", latitude: 11.6643, longitude: 78.146 },
        { id: "5", name: "Krishnagiri Bus Stand", latitude: 12.5186, longitude: 78.2137 },
        { id: "6", name: "Vellore Bus Stand", latitude: 12.9165, longitude: 79.1325 },
        { id: "7", name: "Kanchipuram Bus Stand", latitude: 12.8342, longitude: 79.7036 },
        { id: "8", name: "Chennai Koyambedu (CMBT)", latitude: 13.0693, longitude: 80.1948 },
      ]);
      if (seedError) {
        console.warn("Supabase seedStops warning:", seedError.message);
      } else {
        console.log("✅ Seeded initial stops into Supabase DB");
      }
    }
  } catch (err) {
    console.warn("Supabase seedStops catch:", err.message);
  }
}
