import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../data/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/start", async (req, res) => {
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
});

router.post("/:id/end", async (req, res) => {
  const trip = await db.trips.findById(req.params.id);
  if (!trip || trip.userId !== req.userId) {
    return res.status(404).json({ error: "Trip not found" });
  }
  const updated = await db.trips.update(trip.id, { status: "completed", endTime: new Date().toISOString() });
  res.json(updated);
});

router.get("/history", async (req, res) => {
  const trips = await db.trips.findByUser(req.userId);
  res.json(trips);
});

export default router;

