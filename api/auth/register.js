import app from "../../backend/server.js";

export default function handler(req, res) {
  if (!req.url || req.url === "/" || !req.url.startsWith("/api")) {
    req.url = "/api/auth/register";
  }
  return app(req, res);
}

