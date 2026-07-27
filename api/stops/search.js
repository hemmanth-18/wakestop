import app from "../../backend/server.js";

export default function handler(req, res) {
  if (!req.url || req.url === "/" || !req.url.startsWith("/api")) {
    const query = req.url && req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    req.url = `/api/stops/search${query}`;
  }
  return app(req, res);
}

