import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { db } from "../data/db.js";
import { JWT_SECRET } from "../middleware/auth.js";

const router = Router();

// Registration handler
const handleRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const cleanName = (typeof name === "string" ? name : "").trim();
    const cleanEmail = (typeof email === "string" ? email : "").trim().toLowerCase();
    const cleanPassword = typeof password === "string" ? password : (password ? String(password) : "");

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    const existing = await db.users.findByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const user = { id: uuid(), name: cleanName, email: cleanEmail, passwordHash, createdAt: new Date().toISOString() };
    await db.users.insert(user);

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "30d" });
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: err.message || "Failed to register user account" });
  }
};

// Login handler
const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = (typeof email === "string" ? email : "").trim().toLowerCase();
    const cleanPassword = typeof password === "string" ? password : (password ? String(password) : "");

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await db.users.findByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordHash = user.passwordHash || user.password_hash;
    if (!passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    let match = false;
    try {
      match = await bcrypt.compare(cleanPassword, String(passwordHash));
    } catch (bcryptErr) {
      console.warn("Bcrypt comparison error:", bcryptErr);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "30d" });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: err.message || "Failed to authenticate user" });
  }
};

router.post("/register", handleRegister);
router.post("/api/auth/register", handleRegister);
router.post("/auth/register", handleRegister);

router.post("/login", handleLogin);
router.post("/api/auth/login", handleLogin);
router.post("/auth/login", handleLogin);

export default router;
