import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../data/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/start", async (req, res) => {
  try {
    const { destinationName, destinationLat, destinationLng, startName, startLat, startLng, destination, groupCode, destinations } = req.body || {};
    const destName = destinationName || destination?.name;
    const destLat = destinationLat ?? destination?.lat;
    const destLng = destinationLng ?? destination?.lng;

    if (!destName || destLat == null || destLng == null) {
      return res.status(400).json({ error: "destinationName, destinationLat and destinationLng are required" });
    }

    const trip = {
      id: uuid(),
      userId: req.userId,
      start: { name: startName || destination?.startName || "Current location", lat: startLat ?? null, lng: startLng ?? null },
      destination: { name: destName, lat: destLat, lng: destLng },
      groupCode: groupCode || null,
      destinations: Array.isArray(destinations) ? destinations : [],
      startTime: new Date().toISOString(),
      endTime: null,
      status: "active",
    };
    await db.trips.insert(trip);
    return res.status(201).json(trip);
  } catch (err) {
    console.error("Trip start error:", err);
    return res.status(500).json({ error: err.message || "Could not start trip" });
  }
});

router.post("/:id/end", async (req, res) => {
  try {
    const trip = await db.trips.findById(req.params.id);
    if (!trip || trip.userId !== req.userId) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const { wakeResponseSec } = req.body || {};
    const patch = { status: "completed", endTime: new Date().toISOString() };
    if (wakeResponseSec != null) {
      patch.wakeResponseSec = wakeResponseSec;
    }
    const updated = await db.trips.update(trip.id, patch);
    return res.json(updated);
  } catch (err) {
    console.error("Trip end error:", err);
    return res.status(500).json({ error: err.message || "Could not end trip" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const trips = await db.trips.findByUser(req.userId);
    return res.json(trips);
  } catch (err) {
    console.error("Trip history error:", err);
    return res.status(500).json({ error: err.message || "Could not fetch trip history" });
  }
});

router.delete("/history", async (req, res) => {
  try {
    await db.trips.deleteByUser(req.userId);
    return res.json({ message: "All trip history deleted successfully" });
  } catch (err) {
    console.error("Delete trip history error:", err);
    return res.status(500).json({ error: err.message || "Could not delete trip history" });
  }
});

export default router;
