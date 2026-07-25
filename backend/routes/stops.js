import { Router } from "express";
import { db } from "../data/db.js";

const router = Router();

// Haversine distance in metres
function distanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

router.get("/", async (req, res) => {
  const stops = await db.stops.all();
  res.json(stops);
});

router.get("/search", async (req, res) => {
  const { q } = req.query;
  const stops = await db.stops.search(q || "");
  res.json(stops);
});

router.get("/nearby", async (req, res) => {
  const { lat, lng, radius } = req.query;
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const radiusM = radius ? parseFloat(radius) : 15000;
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return res.status(400).json({ error: "lat and lng query params are required" });
  }
  const allStops = await db.stops.all();
  const stops = allStops
    .map((s) => ({ ...s, distanceM: distanceMetres(latitude, longitude, s.latitude, s.longitude) }))
    .filter((s) => s.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
  res.json(stops);
});

export default router;

