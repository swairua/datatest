import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleExtraction } from "./routes/extract";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "600mb" })); // Support up to 500MB files (accounting for base64 encoding overhead)
  app.use(express.urlencoded({ extended: true, limit: "600mb" }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Database extraction endpoint
  app.post("/api/extract", handleExtraction);

  return app;
}
