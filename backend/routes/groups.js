import { Router } from "express";
import { supabase } from "../data/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 confusion
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit numeric
}

// ─── POST /api/groups/create ─────────────────────────────────────────────────
// Host creates a group. Returns code + pin.
router.post("/create", requireAuth, async (req, res) => {
  try {
    const { destinationName, destinationLat, destinationLng, destinations } = req.body || {};

    let destList = Array.isArray(destinations) && destinations.length > 0 ? destinations.slice(0, 3) : [];

    if (destList.length === 0) {
      if (!destinationName || destinationLat == null || destinationLng == null) {
        return res.status(400).json({ error: "At least one destination is required" });
      }
      destList = [{ id: "dest-1", name: destinationName, lat: destinationLat, lng: destinationLng }];
    }

    const primaryDest = destList[0];

    // Generate unique code (retry if collision)
    let code;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode();
      const { data: existing } = await supabase.from("groups").select("code").eq("code", code).maybeSingle();
      if (!existing) break;
    }

    const pin = generatePin();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours

    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        code,
        pin,
        host_user_id: req.userId,
        destination_name: primaryDest.name,
        destination_lat: primaryDest.lat,
        destination_lng: primaryDest.lng,
        destinations: destList,
        status: "waiting",
        alarm_stage: null,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase create group error:", error.message);
      return res.status(500).json({ error: "Could not create group" });
    }

    // Add host as first member
    await supabase.from("group_members").insert({
      group_code: code,
      user_id: req.userId,
      display_name: req.body.displayName || "Host",
      selected_destination_id: primaryDest.id || "dest-1",
      lat: null,
      lng: null,
      last_updated: new Date().toISOString(),
    });

    return res.status(201).json({
      code: group.code,
      pin: group.pin,
      destination: primaryDest,
      destinations: destList,
      expiresAt: group.expires_at,
    });
  } catch (err) {
    console.error("Create group error:", err);
    return res.status(500).json({ error: err.message || "Could not create group" });
  }
});

// ─── POST /api/groups/join ───────────────────────────────────────────────────
// Member joins with code + PIN. Returns destination.
router.post("/join", requireAuth, async (req, res) => {
  try {
    const { code, pin, displayName, selectedDestinationId } = req.body || {};

    if (!code || !pin) {
      return res.status(400).json({ error: "code and pin are required" });
    }

    const { data: group, error } = await supabase
      .from("groups")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .maybeSingle();

    if (error || !group) {
      return res.status(404).json({ error: "Group not found. Check your code." });
    }

    if (group.pin !== String(pin).trim()) {
      return res.status(403).json({ error: "Incorrect PIN. Ask the host for the correct PIN." });
    }

    // Check if not expired
    if (new Date(group.expires_at) < new Date()) {
      return res.status(410).json({ error: "This group has expired. Ask the host to create a new one." });
    }

    const destList = Array.isArray(group.destinations) && group.destinations.length > 0
      ? group.destinations
      : [{ id: "dest-1", name: group.destination_name, lat: group.destination_lat, lng: group.destination_lng }];

    const selectedDest = destList.find((d) => d.id === selectedDestinationId) || destList[0];

    // Upsert member (re-join is allowed)
    await supabase
      .from("group_members")
      .upsert({
        group_code: code.toUpperCase().trim(),
        user_id: req.userId,
        display_name: displayName || "Member",
        selected_destination_id: selectedDest.id,
        lat: null,
        lng: null,
        last_updated: new Date().toISOString(),
      }, { onConflict: "group_code,user_id" });

    return res.json({
      code: group.code,
      destination: selectedDest,
      destinations: destList,
      status: group.status || "waiting",
      alarmStage: group.alarm_stage,
    });
  } catch (err) {
    console.error("Join group error:", err);
    return res.status(500).json({ error: err.message || "Could not join group" });
  }
});

// ─── POST /api/groups/:code/position ─────────────────────────────────────────
// Member posts their GPS position.
router.post("/:code/position", requireAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body || {};
    const code = req.params.code.toUpperCase();

    if (lat == null || lng == null) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const { error } = await supabase
      .from("group_members")
      .update({ lat, lng, last_updated: new Date().toISOString() })
      .eq("group_code", code)
      .eq("user_id", req.userId);

    if (error) {
      console.error("Position update error:", error.message);
      return res.status(500).json({ error: "Could not update position" });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/groups/:code/alarm ────────────────────────────────────────────
// Member triggers alarm stage for the whole group.
router.post("/:code/alarm", requireAuth, async (req, res) => {
  try {
    const { stage } = req.body || {};
    const code = req.params.code.toUpperCase();

    // Only escalate (never go from critical back to stage1)
    const stageOrder = { stage1_1km: 1, stage2_500m: 2, stage3_100m: 3, critical: 3, arrived: 4 };
    const { data: group } = await supabase.from("groups").select("alarm_stage").eq("code", code).maybeSingle();

    const currentOrder = stageOrder[group?.alarm_stage] ?? 0;
    const newOrder = stageOrder[stage] ?? 0;

    if (newOrder > currentOrder) {
      await supabase.from("groups").update({ alarm_stage: stage }).eq("code", code);
    }

// ─── POST /api/groups/:code/start ────────────────────────────────────────────
// Host starts the group trip (changes status from 'waiting' to 'active').
router.post("/:code/start", requireAuth, async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { data: group } = await supabase.from("groups").select("host_user_id").eq("code", code).maybeSingle();

    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.host_user_id !== req.userId) return res.status(403).json({ error: "Only the host can start the trip" });

    await supabase.from("groups").update({ status: "active" }).eq("code", code);
    return res.json({ ok: true, status: "active" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/groups/:code/state ─────────────────────────────────────────────
// Poll: returns all member positions + current alarm_stage + destinations.
router.get("/:code/state", requireAuth, async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();

    const [groupRes, membersRes] = await Promise.all([
      supabase.from("groups").select("alarm_stage, status, destination_name, destination_lat, destination_lng, destinations, host_user_id, expires_at").eq("code", code).maybeSingle(),
      supabase.from("group_members").select("user_id, display_name, selected_destination_id, lat, lng, last_updated").eq("group_code", code),
    ]);

    if (!groupRes.data) {
      return res.status(404).json({ error: "Group not found" });
    }

    const destList = Array.isArray(groupRes.data.destinations) && groupRes.data.destinations.length > 0
      ? groupRes.data.destinations
      : [{ id: "dest-1", name: groupRes.data.destination_name, lat: groupRes.data.destination_lat, lng: groupRes.data.destination_lng }];

    // Filter out stale members (no update in >2 minutes = offline)
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const members = (membersRes.data || []).map((m) => ({
      userId: m.user_id,
      displayName: m.display_name,
      selectedDestinationId: m.selected_destination_id || destList[0].id,
      lat: m.lat,
      lng: m.lng,
      isActive: m.last_updated && new Date(m.last_updated).getTime() > twoMinutesAgo,
    }));

    return res.json({
      status: groupRes.data.status || "waiting",
      alarmStage: groupRes.data.alarm_stage,
      hostUserId: groupRes.data.host_user_id,
      members,
      destinations: destList,
      destination: destList[0],
      expiresAt: groupRes.data.expires_at,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/groups/:code ─────────────────────────────────────────────────
// Host dissolves the group.
router.delete("/:code", requireAuth, async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();

    const { data: group } = await supabase.from("groups").select("host_user_id").eq("code", code).maybeSingle();
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.host_user_id !== req.userId) return res.status(403).json({ error: "Only the host can dissolve the group" });

    await supabase.from("group_members").delete().eq("group_code", code);
    await supabase.from("groups").delete().eq("code", code);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
