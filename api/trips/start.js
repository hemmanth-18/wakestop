import app from "../../backend/server.js";

export default function handler(req, res) {
  if (!req.url || req.url === "/" || !req.url.startsWith("/api")) {
    req.url = "/api/trips/start";
  }
  return app(req, res);
}

