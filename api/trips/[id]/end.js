import app from "../../../backend/server.js";

export default function handler(req, res) {
  if (!req.url || req.url === "/" || !req.url.startsWith("/api")) {
    const id = req.query?.id || "";
    req.url = `/api/trips/${id}/end`;
  }
  return app(req, res);
}

