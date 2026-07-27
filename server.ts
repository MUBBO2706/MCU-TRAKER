import express from "express";
import path from "path";

// Allow hardcoded environment variables for local development only
if (process.env.NODE_ENV !== "production") {
  const DEV_ENV: Record<string, string> = {
    TELEGRAM_CHARACTER_BOT_TOKEN: "8883457872:AAE0bWufmJOA0yRziAWxfBpSciylItZzlzE",
    TELEGRAM_AVATAR_CHAT_ID: "-1004227434158",
    JWT_SECRET: "a94f5c2b3d8e7a1f6c4b9d0e2a5f8c7b3d1e4a6c9b2f5d8e7a0c3b1f4d6e9a2c",
    TELEGRAM_BOT_TOKEN: "8797548819:AAHZ79vO1M5lQiBZ8wc8WhMQgh5kYGAaNf4",
    TELEGRAM_AUTH_CHANNEL_ID: "-1004319796169",
    TELEGRAM_STORAGE_CHANNEL_ID: "-1004464149531",
    TELEGRAM_CHARACTER_CHANNEL_ID: "-1003842908427",
  };
  for (const [key, val] of Object.entries(DEV_ENV)) {
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

import app from "./app.js";

async function startServer() {
  const PORT = 3000;

  // 2. Vite middleware setup based on environment
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
