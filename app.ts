import express from "express";
import path from "path";
import dotenv from "dotenv";

import { vercelRouteInterceptor } from "./backend/middleware/routeInterceptor.js";
import authRoutes from "./backend/routes/authRoutes.js";
import userRoutes from "./backend/routes/userRoutes.js";
import mediaRoutes from "./backend/routes/mediaRoutes.js";

dotenv.config();

const app = express();

// Parse JSON payloads for incoming requests with a larger size limit for base64 uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Serve static assets from public folder
app.use(express.static(path.join(process.cwd(), "public")));

// Custom Vercel routing adjustment middleware to preserve the original requested subpath
app.use(vercelRouteInterceptor);

// Register Modular API Routers
app.use(authRoutes);
app.use(userRoutes);
app.use(mediaRoutes);

export default app;
