export default async function handler(req, res) {
  try {
    const { default: app } = await import("../../backend/server.js");
    return app(req, res);
  } catch (err) {
    console.error("Vercel auth/login error:", err);
    return res.status(500).json({
      error: "Vercel serverless module load error",
      message: err?.message || String(err),
      stack: err?.stack,
    });
  }
}
