import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth.js";
import tripRoutes from "./routes/trips.js";
import stopRoutes from "./routes/stops.js";
import { seedStops } from "./data/db.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Enable full CORS and preflight handling for mobile devices & Vercel
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

app.use(express.json());
app.use(morgan("dev"));

// Match routes with or without /api prefix for Vercel serverless routing
app.get(["/api/health", "/health"], (req, res) => res.json({ ok: true, service: "wakestop-backend" }));

app.use(["/api/auth", "/auth"], authRoutes);
app.use(["/api/trips", "/trips"], tripRoutes);
app.use(["/api/stops", "/stops"], stopRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

seedStops();

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`WakeStop backend listening on http://localhost:${PORT}`);
  });
}

export default app;
