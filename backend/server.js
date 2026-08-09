import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth.js";
import tripRoutes from "./routes/trips.js";
import stopRoutes from "./routes/stops.js";
import groupRoutes from "./routes/groups.js";
import { seedStops } from "./data/db.js";

const app = express();
const PORT = process.env.PORT || 4000;

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

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("dev"));

app.get(["/api/health", "/health"], (req, res) => res.json({ ok: true, service: "wakestop-backend" }));

app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/trips", tripRoutes);
app.use("/trips", tripRoutes);

app.use("/api/stops", stopRoutes);
app.use("/stops", stopRoutes);

app.use("/api/groups", groupRoutes);
app.use("/groups", groupRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

if (process.argv[1] && process.argv[1].endsWith("server.js") && !process.env.VERCEL) {
  seedStops();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WakeStop backend listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;
