import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "../backend/routes/auth.js";
import tripRoutes from "../backend/routes/trips.js";
import stopRoutes from "../backend/routes/stops.js";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get(["/api/health", "/health"], (req, res) =>
  res.json({ ok: true, service: "wakestop-backend" })
);

app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/trips", tripRoutes);
app.use("/trips", tripRoutes);

app.use("/api/stops", stopRoutes);
app.use("/stops", stopRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

export default app;
