import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "../backend/routes/auth.js";
import tripRoutes from "../backend/routes/trips.js";
import stopRoutes from "../backend/routes/stops.js";
import groupRoutes from "../backend/routes/groups.js";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get(["/api/health", "/health"], (req, res) =>
  res.json({ ok: true, service: "wakestop-backend" })
);

app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/trips", tripRoutes);
app.use("/trips", tripRoutes);

app.use("/api/stops", stopRoutes);
app.use("/stops", stopRoutes);

app.use("/api/groups", groupRoutes);
app.use("/groups", groupRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

export default app;
