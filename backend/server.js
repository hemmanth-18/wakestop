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

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "wakestop-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/stops", stopRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

seedStops();

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`WakeStop backend listening on http://localhost:${PORT}`);
  });
}

export default app;
