import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { db } from "../data/db.js";
import { JWT_SECRET, requireAuth } from "../middleware/auth.js";

const router = Router();

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
      return res.status(409).json({ error: "An account with this email already exists. Please sign in instead." });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const createdAt = new Date().toISOString();
    const user = { id: uuid(), name: cleanName, email: cleanEmail, passwordHash, profileImage: "", createdAt };
    await db.users.insert(user);

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "30d" });
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, profileImage: "", createdAt } });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: err.message || "Failed to register user account" });
  }
};

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
      console.warn("⚠️ Login failed: User not found for email:", cleanEmail);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordHash = user.passwordHash || user.password_hash;
    if (!passwordHash) {
      console.warn("⚠️ Login failed: No password hash stored for email:", cleanEmail);
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
      console.warn("⚠️ Login failed: Password mismatch for email:", cleanEmail);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "30d" });
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage || "",
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: err.message || "Failed to authenticate user" });
  }
};

// Fetch current user details
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await db.users.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage || "",
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Update profile (username / profile picture)
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { name, profileImage } = req.body || {};
    const patch = {};
    if (typeof name === "string" && name.trim()) {
      patch.name = name.trim();
    }
    if (profileImage !== undefined && typeof profileImage === "string") {
      patch.profileImage = profileImage;
    }

    const updated = await db.users.update(req.userId, patch);
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        profileImage: updated.profileImage || "",
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Could not update profile" });
  }
});

// Change password inside profile
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    const user = await db.users.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(String(currentPassword), String(user.passwordHash || user.password_hash));
    if (!match) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password cannot be the same as current password" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }

    const newHash = await bcrypt.hash(String(newPassword), 10);
    await db.users.update(req.userId, { passwordHash: newHash });

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to change password" });
  }
});

import { sendResetCodeEmail } from "../services/emailService.js";

// Forgot Password - Step 1: Request 6-digit code
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    const cleanEmail = (typeof email === "string" ? email : "").trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: "Registered email address is required" });
    }

    const user = await db.users.findByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: "No account registered with this email address" });
    }

    // Generate secure 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

    await db.users.update(user.id, { resetCode: code, resetCodeExpiry: expiry });

    // Send email dispatch
    try {
      await sendResetCodeEmail(cleanEmail, code, user.name || "Commuter");
    } catch (emailErr) {
      console.warn("⚠️ SMTP email dispatch failed:", emailErr?.message);
    }

    return res.json({
      message: "Verification code sent to your email address",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Failed to generate verification code" });
  }
});

// Forgot Password - Step 2: Verify Code
router.post("/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body || {};
    const cleanEmail = (typeof email === "string" ? email : "").trim().toLowerCase();
    const cleanCode = (typeof code === "string" ? code : "").trim();

    if (!cleanEmail || !cleanCode) {
      return res.status(400).json({ error: "Email and verification code are required" });
    }

    const user = await db.users.findByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: "Invalid email" });
    }

    if (!user.resetCode || user.resetCode !== cleanCode) {
      return res.status(400).json({ error: "Invalid 6-digit verification code" });
    }

    if (new Date().getTime() > new Date(user.resetCodeExpiry).getTime()) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
    }

    return res.json({ message: "Verification code verified successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to verify code" });
  }
});

// Forgot Password - Step 3: Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    const cleanEmail = (typeof email === "string" ? email : "").trim().toLowerCase();
    const cleanCode = (typeof code === "string" ? code : "").trim();
    const cleanPass = typeof newPassword === "string" ? newPassword : "";

    if (!cleanEmail || !cleanCode || !cleanPass) {
      return res.status(400).json({ error: "Email, verification code, and new password are required" });
    }

    const user = await db.users.findByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.resetCode || user.resetCode !== cleanCode) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    if (new Date().getTime() > new Date(user.resetCodeExpiry).getTime()) {
      return res.status(400).json({ error: "Verification code has expired" });
    }

    if (cleanPass.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const newHash = await bcrypt.hash(cleanPass, 10);
    await db.users.update(user.id, {
      passwordHash: newHash,
      resetCode: null,
      resetCodeExpiry: null,
    });

    return res.json({ message: "Password updated successfully. You can now sign in." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to reset password" });
  }
});

router.post("/register", handleRegister);
router.post("/login", handleLogin);

export default router;
