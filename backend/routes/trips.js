import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../data/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/start", async (req, res) => {
  try {
    const { destinationName, destinationLat, destinationLng, startName, startLat, startLng } = req.body;
    if (!destinationName || destinationLat == null || destinationLng == null) {
      return res.status(400).json({ error: "destinationName, destinationLat and destinationLng are required" });
    }
    const trip = {
      id: uuid(),
      userId: req.userId,
      start: { name: startName || "Current location", lat: startLat ?? null, lng: startLng ?? null },
      destination: { name: destinationName, lat: destinationLat, lng: destinationLng },
      startTime: new Date().toISOString(),
      endTime: null,
      status: "active",
    };
    await db.trips.insert(trip);
    res.status(201).json(trip);
  } catch (err) {
    console.error("Trip start error:", err);
    res.status(500).json({ error: err.message || "Could not start trip" });
  }
});

router.post("/:id/end", async (req, res) => {
  try {
    const trip = await db.trips.findById(req.params.id);
    if (!trip || trip.userId !== req.userId) {
      return res.status(404).json({ error: "Trip not found" });
    }
    const updated = await db.trips.update(trip.id, { status: "completed", endTime: new Date().toISOString() });
    res.json(updated);
  } catch (err) {
    console.error("Trip end error:", err);
    res.status(500).json({ error: err.message || "Could not end trip" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const trips = await db.trips.findByUser(req.userId);
    res.json(trips);
  } catch (err) {
    console.error("Trip history error:", err);
    res.status(500).json({ error: err.message || "Could not fetch trip history" });
  }
});

export default router;
