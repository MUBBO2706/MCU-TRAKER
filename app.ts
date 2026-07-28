import express from "express";
import path from "path";
import * as telegramDb from "./backend/Database.js";
import * as telegramCharacterImages from "./backend/CharacterImages.js";
import { resolveDeviceName } from "./backend/deviceResolver.js";
import { resolveIpAndLocation } from "./backend/ipResolver.js";
import crypto from "crypto";
import { MCU_TITLES } from "./src/data/mcuData.js";
import dotenv from "dotenv";

dotenv.config();

// Helper to convert Wikipedia thumbnail URL to original image URL as a fallback
function getOriginalWikipediaUrl(url: string): string | null {
  if (url.includes("upload.wikimedia.org") && url.includes("/thumb/")) {
    try {
      let original = url.replace("/thumb/", "/");
      const lastSlashIdx = original.lastIndexOf("/");
      if (lastSlashIdx !== -1) {
        original = original.substring(0, lastSlashIdx);
        return original;
      }
    } catch (e) {
      console.warn("Failed to parse original wikipedia URL:", e);
    }
  }
  return null;
}




function formatStatusLabel(status: string | undefined): string {
  if (!status) return "Unwatched";
  const s = status.toLowerCase();
  if (s === "unwatched") return "Unwatched";
  if (s === "completed") return "Completed";
  if (s === "dropped") return "Dropped";
  if (s === "watching") return "Watching";
  if (s === "later") return "Later";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatRatingLabel(rating: number | undefined): string {
  if (!rating || rating <= 0) return "No Rating";
  const filled = "★".repeat(rating);
  const empty = "☆".repeat(5 - rating);
  return filled + empty;
}

function formatToIndianDateTime(timestamp: number | string | Date | undefined): string {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as Record<string, string>);

  const monthStr = partMap.month || '';
  const monthTitle = monthStr ? monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase() : '';
  return `${partMap.day} ${monthTitle} ${partMap.year} ${partMap.hour}:${partMap.minute}:${partMap.second}`;
}

function addUpdateLog(userJson: any, log: {
  action: string;
  previousValue: string;
  newValue: string;
  source: string;
  userPerformed: string;
  metadata?: any;
  timestamp?: number;
}) {
  if (!userJson.updates) {
    userJson.updates = [];
  }
  const newLog = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...log
  };
  userJson.updates = [newLog, ...userJson.updates];
  
  if (userJson.updates.length > 500) {
    const overflow = userJson.updates.slice(500);
    userJson.updates = userJson.updates.slice(0, 500);
    if (!userJson.updatesBuffer) {
      userJson.updatesBuffer = [];
    }
    userJson.updatesBuffer.push(...overflow);
  }

  if (typeof userJson.totalLogCount !== "number") {
    userJson.totalLogCount = (userJson.updates?.length || 0) + (userJson.updatesBuffer?.length || 0);
  } else {
    userJson.totalLogCount += 1;
  }
}

const app = express();

// Parse JSON payloads for incoming requests with a larger size limit for base64 uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Serve static assets from public folder
app.use(express.static(path.join(process.cwd(), "public")));

// Custom Vercel routing adjustment middleware to preserve the original requested subpath
app.use((req, res, next) => {
  const vercelForwardedPath = req.headers["x-vercel-forwarded-path"];
  const forwardedUrl = req.headers["x-forwarded-url"];
  const matchedPath = req.headers["x-matched-path"];
  
  console.log(`[Express API Route Interceptor] method=${req.method} url=${req.url} originalUrl=${req.originalUrl} x-vercel-forwarded-path=${vercelForwardedPath} x-forwarded-url=${forwardedUrl} x-matched-path=${matchedPath}`);

  // 1. If Vercel provided the true original path, always restore it.
  if (vercelForwardedPath && typeof vercelForwardedPath === "string" && vercelForwardedPath.startsWith("/api")) {
    if (req.url !== vercelForwardedPath) {
      console.log(`[Express API Route Interceptor] Restoring req.url to x-vercel-forwarded-path: ${req.url} -> ${vercelForwardedPath}`);
      req.url = vercelForwardedPath;
    }
  } else if (forwardedUrl && typeof forwardedUrl === "string" && forwardedUrl.startsWith("/api")) {
    if (req.url !== forwardedUrl) {
      console.log(`[Express API Route Interceptor] Restoring req.url to x-forwarded-url: ${req.url} -> ${forwardedUrl}`);
      req.url = forwardedUrl;
    }
  } 
  // 2. Fallback: If we are executing as a Vercel serverless function (which only receives /api/* requests)
  // but Vercel stripped the "/api" prefix (e.g. req.url is "/auth/status"), prepend "/api" so Express router matches correctly.
  else {
    const isVercelApiCall = (matchedPath && typeof matchedPath === "string" && matchedPath.includes("/api/index")) || !!process.env.VERCEL;
    if (isVercelApiCall && req.url && !req.url.startsWith("/api") && req.url.startsWith("/")) {
      const reconstructed = `/api${req.url}`;
      console.log(`[Express API Route Interceptor] Reconstructing missing /api prefix for Vercel API function: ${req.url} -> ${reconstructed}`);
      req.url = reconstructed;
    }
  }
  next();
});

// Check Telegram database connection configuration status
app.get("/api/auth/status", (req, res) => {
    try {
      const config = telegramDb.getTelegramConfig();
      res.json({
        configured: true,
        hasToken: !!config.token,
        hasChatId: !!config.chatId,
      });
    } catch (err: any) {
      res.json({
        configured: false,
        error: err.message,
      });
    }
  });

  // User Registration
  app.post("/api/auth/register", async (req, res) => {
    const { fullName, username, password, initialData } = req.body;
    if (!username || !password || !fullName || typeof username !== "string" || typeof password !== "string" || typeof fullName !== "string") {
      return res.status(400).json({ error: "Full Name, Username, and password are required and must be strings" });
    }

    const trimmedFullName = fullName.trim();
    const trimmedUsername = username.trim();
    if (trimmedFullName.length < 2) {
      return res.status(400).json({ error: "Full Name must be at least 2 characters" });
    }
    if (trimmedUsername.length < 3 || password.length < 4) {
      return res.status(400).json({ error: "Username must be at least 3 characters and password at least 4 characters" });
    }

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      // Retrieve User Index lookup table from the private Telegram channel (optimized shard fetch)
      const { index, pinnedMessageId } = await telegramDb.fetchUserIndex(token, chatId, true, { username: trimmedUsername });

      // Check for pre-existing username (case-insensitive check)
      const usernameLower = trimmedUsername.toLowerCase();
      const userExists = index.users.some(u => u.username.toLowerCase() === usernameLower);
      if (userExists) {
        return res.status(400).json({ error: "Username is already registered" });
      }

      // Generate a new unique User ID
      const userId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();

      // Parse user agent and ip location
      const uaInfo = telegramDb.parseUserAgent(req.headers["user-agent"]);
      const rawDevice = req.body.deviceModel || uaInfo.device;
      const resolvedDeviceName = await resolveDeviceName(rawDevice);
      const finalDevice = resolvedDeviceName || rawDevice;
      const { ipAddress, location } = await resolveIpAndLocation(req);

      const initialSession: telegramDb.UserSession = {
        sessionId,
        startedAt: Date.now(),
        endedAt: null,
        durationSeconds: null,
        browser: uaInfo.browser,
        os: uaInfo.os,
        device: finalDevice,
        resolvedDeviceName: finalDevice,
        ipAddress,
        location,
        status: "Active",
      };

      // Create their personal user JSON file with structured data
      const userJson: telegramDb.UserJson = {
        userId,
        fullName: trimmedFullName,
        username: trimmedUsername,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        sessions: [initialSession],
        watchData: initialData?.watchData || {},
        unlockedAchievements: initialData?.unlockedAchievements || [],
        preferences: initialData?.preferences || {},
        avatarUrl: "",
      };

      const nowMs = Date.now();

      addUpdateLog(userJson, {
        action: "Account Created",
        previousValue: "N/A",
        newValue: "Account successfully created",
        source: "Account",
        userPerformed: trimmedUsername,
        metadata: { username: trimmedUsername, fullName: trimmedFullName },
        timestamp: nowMs - 3
      });

      addUpdateLog(userJson, {
        action: "Full Name",
        previousValue: "N/A",
        newValue: trimmedFullName,
        source: "Account",
        userPerformed: trimmedUsername,
        metadata: { fullName: trimmedFullName },
        timestamp: nowMs - 2
      });

      addUpdateLog(userJson, {
        action: "Username",
        previousValue: "N/A",
        newValue: trimmedUsername,
        source: "Account",
        userPerformed: trimmedUsername,
        metadata: { username: trimmedUsername },
        timestamp: nowMs - 1
      });

      addUpdateLog(userJson, {
        action: "Password",
        previousValue: "N/A",
        newValue: "********",
        source: "Account",
        userPerformed: trimmedUsername,
        timestamp: nowMs
      });

      // Data Migration Logs
      if (initialData?.watchData && Object.keys(initialData.watchData).length > 0) {
        const count = Object.keys(initialData.watchData).length;
        addUpdateLog(userJson, {
          action: "Watch History Migrated",
          previousValue: "N/A",
          newValue: `${count} title progress log(s) successfully migrated`,
          source: "Account",
          userPerformed: trimmedUsername,
          metadata: { count },
          timestamp: nowMs + 1
        });
      }

      if (initialData?.unlockedAchievements && initialData.unlockedAchievements.length > 0) {
        const count = initialData.unlockedAchievements.length;
        addUpdateLog(userJson, {
          action: "Achievements Migrated",
          previousValue: "N/A",
          newValue: `${count} S.H.I.E.L.D. achievement(s) successfully migrated`,
          source: "Account",
          userPerformed: trimmedUsername,
          metadata: { count },
          timestamp: nowMs + 2
        });
      }

      if (initialData?.preferences && Object.keys(initialData.preferences).length > 0) {
        const p = initialData.preferences;
        const details = [];
        if (p.theme) details.push(`Theme: ${p.theme}`);
        if (p.favPhase) details.push(`Favorite Phase: Phase ${p.favPhase}`);
        if (p.favChar) details.push(`Favorite Character: ${p.favChar}`);
        if (p.devMode) details.push(`Developer Mode: Enabled`);
        if (p.orderingMode) details.push(`Ordering Mode: ${p.orderingMode}`);

        if (details.length > 0) {
          addUpdateLog(userJson, {
            action: "Preferences Migrated",
            previousValue: "N/A",
            newValue: details.join(" | "),
            source: "Account",
            userPerformed: trimmedUsername,
            metadata: p,
            timestamp: nowMs + 3
          });
        }
      }

      // Add user metadata to the User Index lookup table
      const salt = telegramDb.generateSalt();
      const passwordHash = telegramDb.hashPassword(password, salt);

      // Register user using the new logical MessagePack binary document-splitting flow
      const userEntry = await telegramDb.registerUser(
        token,
        chatId,
        userJson,
        passwordHash,
        salt,
        index,
        pinnedMessageId
      );

      // Create a secure authentication session token containing sessionId
      const sessionToken = telegramDb.createToken({ userId, username: userJson.username, sessionId }, secret);

      res.status(201).json({
        success: true,
        token: sessionToken,
        user: {
          userId,
          fullName: userJson.fullName,
          username: userJson.username,
          createdAt: userJson.createdAt,
          lastUpdated: userJson.lastUpdated,
          sessions: userJson.sessions,
          watchData: userJson.watchData,
          unlockedAchievements: userJson.unlockedAchievements,
          preferences: userJson.preferences,
          avatarUrl: (userJson.avatarFileId || userJson.avatarUrl) ? `/api/user/avatar?userId=${userId}&v=${userJson.lastUpdated || userJson.createdAt}` : "",
          updates: userJson.updates || [],
          totalLogCount: userJson.totalLogCount || (userJson.updates?.length || 0),
          archiveFileId: userJson.archiveFileId || undefined,
        },
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.message === "TELEGRAM_NOT_CONFIGURED") {
        return res.status(503).json({
          error: "Private cloud storage backend is not configured in the environment variables (STORAGE_ACCESS_TOKEN and STORAGE_CHAT_ID must be set in the Settings menu).",
        });
      }
      res.status(500).json({ error: `Registration failed: ${err.message}` });
    }
  });

  // User Login
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      // Fetch the User Index lookup file (optimized shard fetch)
      const { index } = await telegramDb.fetchUserIndex(token, chatId, true, { username });

      // Locate user by case-insensitive username
      const usernameLower = username.trim().toLowerCase();
      const userEntry = index.users.find(u => u.username.toLowerCase() === usernameLower);

      if (!userEntry) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Validate the hashed password
      const calculatedHash = telegramDb.hashPassword(password, userEntry.salt);
      if (calculatedHash !== userEntry.passwordHash) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Fetch existing user file
      const userJson = await telegramDb.fetchUserFile(token, chatId, userEntry.userId, true);

      // Create new session
      const sessionId = crypto.randomUUID();
      const uaInfo = telegramDb.parseUserAgent(req.headers["user-agent"]);
      const rawDevice = req.body.deviceModel || uaInfo.device;
      const resolvedDeviceName = await resolveDeviceName(rawDevice);
      const finalDevice = resolvedDeviceName || rawDevice;
      const { ipAddress, location } = await resolveIpAndLocation(req);

      const newSession: telegramDb.UserSession = {
        sessionId,
        startedAt: Date.now(),
        endedAt: null,
        durationSeconds: null,
        browser: uaInfo.browser,
        os: uaInfo.os,
        device: finalDevice,
        resolvedDeviceName: finalDevice,
        ipAddress,
        location,
        status: "Active",
      };

      // Ensure sessions array exists
      if (!userJson.sessions) {
        userJson.sessions = [];
      }
      userJson.sessions.push(newSession);
      userJson.lastUpdated = Date.now();

      // Update user file on Telegram and index pointers
      await telegramDb.updateUserFileAndIndex(token, chatId, userEntry.userId, userJson);

      // Generate secure authentication session token
      const sessionToken = telegramDb.createToken({ userId: userEntry.userId, username: userEntry.username, sessionId }, secret);

      res.json({
        success: true,
        token: sessionToken,
        user: {
          userId: userEntry.userId,
          fullName: userJson.fullName || userEntry.fullName || userEntry.username,
          username: userEntry.username,
          createdAt: userEntry.createdAt,
          lastUpdated: userJson.lastUpdated,
          sessions: userJson.sessions,
          watchData: userJson.watchData || {},
          unlockedAchievements: userJson.unlockedAchievements || [],
          preferences: userJson.preferences || {},
          avatarUrl: (userEntry.avatarFileId || userJson.avatarFileId || userJson.avatarUrl) ? `/api/user/avatar?userId=${userEntry.userId}&v=${userJson.lastUpdated || userJson.createdAt}` : "",
          updates: userJson.updates || [],
          totalLogCount: userJson.totalLogCount || userEntry.totalLogCount || (userJson.updates?.length || 0),
          archiveFileId: userEntry.archiveFileId || userJson.archiveFileId || undefined,
        },
      });
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.message === "TELEGRAM_NOT_CONFIGURED") {
        return res.status(503).json({
          error: "Private cloud storage backend is not configured in the environment variables (STORAGE_ACCESS_TOKEN and STORAGE_CHAT_ID must be set in the Settings menu).",
        });
      }
      res.status(500).json({ error: `Login failed: ${err.message}` });
    }
  });

  // Validate Active Session & Fetch User details
  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      // Fetch user's individual JSON file using the User ID lookup flow to verify retrieval integrity
      const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId);

      // Verify that the current session is indeed still Active in the database
      const currentSession = userFile.sessions?.find(s => s.sessionId === decoded.sessionId);
      if (!currentSession || currentSession.status !== "Active") {
        return res.status(401).json({ error: "Unauthorized: Session has been terminated or expired" });
      }

      res.json({
        success: true,
        user: {
          userId: userFile.userId,
          fullName: userFile.fullName || userFile.username,
          username: userFile.username,
          createdAt: userFile.createdAt,
          lastUpdated: userFile.lastUpdated || userFile.createdAt,
          sessions: userFile.sessions || [],
          watchData: userFile.watchData || {},
          unlockedAchievements: userFile.unlockedAchievements || [],
          preferences: userFile.preferences || {},
          avatarUrl: (userFile.avatarFileId || userFile.avatarUrl) ? `/api/user/avatar?userId=${userFile.userId}&v=${userFile.lastUpdated || userFile.createdAt}` : "",
          updates: userFile.updates || [],
          totalLogCount: userFile.totalLogCount || (userFile.updates?.length || 0) + (userFile.updatesBuffer?.length || 0),
          archiveFileId: userFile.archiveFileId || undefined,
        },
      });
    } catch (err: any) {
      console.error("Session verification error:", err);
      if (err.message === "TELEGRAM_NOT_CONFIGURED") {
        return res.status(503).json({
          error: "Private cloud storage backend is not configured in the environment variables.",
        });
      }
      res.status(401).json({ error: "Unauthorized: Session is invalid or expired" });
    }
  });

  // User Logout (Closes Session & Updates JSON stored in Telegram)
  app.post("/api/auth/logout", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId || !decoded.sessionId) {
        return res.status(200).json({ success: true, message: "Logged out from local state only" });
      }

      // Fetch user's individual JSON file
      const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

      // Find active session matching this token's sessionId
      if (userFile.sessions) {
        const sessionIndex = userFile.sessions.findIndex(s => s.sessionId === decoded.sessionId);
        if (sessionIndex !== -1) {
          const s = userFile.sessions[sessionIndex];
          s.status = "Logged Out";
          s.endedAt = Date.now();
          s.durationSeconds = Math.round((s.endedAt - s.startedAt) / 1000);
          userFile.lastUpdated = Date.now();

          // Upload updated JSON file to Telegram
          await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Logout error:", err);
      // Fail gracefully for frontend client
      res.status(200).json({ success: true, warning: "Backend logout failed to synchronize with secure storage" });
    }
  });

  // Terminate a specific session (Revocation)
  app.post("/api/auth/terminate", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId || !decoded.sessionId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      const { sessionIdToTerminate } = req.body;
      if (!sessionIdToTerminate) {
        return res.status(400).json({ error: "Session ID to terminate is required" });
      }

      const result = await telegramDb.lockDatabase(async () => {
        // Fetch user's individual JSON file
        const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

        // Check if current session is active
        const currentSession = userFile.sessions?.find(s => s.sessionId === decoded.sessionId);
        if (!currentSession || currentSession.status !== "Active") {
          throw new Error("UNAUTHORIZED_SESSION_INACTIVE");
        }

        if (userFile.sessions) {
          const sessionIndex = userFile.sessions.findIndex(s => s.sessionId === sessionIdToTerminate);
          if (sessionIndex !== -1) {
            const s = userFile.sessions[sessionIndex];
            if (s.status === "Active") {
              s.status = "Terminated";
              s.endedAt = Date.now();
              s.durationSeconds = Math.round((s.endedAt - s.startedAt) / 1000);
              userFile.lastUpdated = Date.now();

              const deviceName = s.resolvedDeviceName || s.device || `${s.os} - ${s.browser}`;
              // Add a security audit log
              addUpdateLog(userFile, {
                action: "Session Terminated",
                previousValue: "ACTIVE",
                newValue: `${deviceName} Terminated`,
                source: "Settings",
                userPerformed: userFile.username,
                metadata: { terminatedSessionId: sessionIdToTerminate, deviceName }
              });

              // Upload updated JSON file to Telegram
              await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);
            }
          }
        }
        return userFile.sessions || [];
      });

      res.json({ success: true, sessions: result });
    } catch (err: any) {
      console.error("Terminate session error:", err);
      if (err.message === "UNAUTHORIZED_SESSION_INACTIVE") {
        return res.status(401).json({ error: "Unauthorized: Session has been terminated or expired" });
      }
      res.status(500).json({ error: `Failed to terminate session: ${err.message}` });
    }
  });

  // Terminate all other sessions except the current one
  app.post("/api/auth/terminate-others", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId || !decoded.sessionId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      const result = await telegramDb.lockDatabase(async () => {
        // Fetch user's individual JSON file
        const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

        // Check if current session is active
        const currentSession = userFile.sessions?.find(s => s.sessionId === decoded.sessionId);
        if (!currentSession || currentSession.status !== "Active") {
          throw new Error("UNAUTHORIZED_SESSION_INACTIVE");
        }

        let terminatedCount = 0;
        if (userFile.sessions) {
          userFile.sessions.forEach(s => {
            if (s.sessionId !== decoded.sessionId && s.status === "Active") {
              s.status = "Terminated";
              s.endedAt = Date.now();
              s.durationSeconds = Math.round((s.endedAt - s.startedAt) / 1000);
              terminatedCount++;
            }
          });

          if (terminatedCount > 0) {
            userFile.lastUpdated = Date.now();

            // Add security audit log
            addUpdateLog(userFile, {
              action: "Other Sessions Terminated",
              previousValue: "ACTIVE",
              newValue: `TERMINATED ${terminatedCount} OTHER SESSIONS`,
              source: "Settings",
              userPerformed: userFile.username,
            });

            // Upload updated JSON file to Telegram
            await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);
          }
        }
        return userFile.sessions || [];
      });

      res.json({ success: true, sessions: result });
    } catch (err: any) {
      console.error("Terminate others error:", err);
      if (err.message === "UNAUTHORIZED_SESSION_INACTIVE") {
        return res.status(401).json({ error: "Unauthorized: Session has been terminated or expired" });
      }
      res.status(500).json({ error: `Failed to terminate other sessions: ${err.message}` });
    }
  });

  // Delete a specific inactive session (Delete)
  app.post("/api/auth/delete-session", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId || !decoded.sessionId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      const { sessionIdToDelete } = req.body;
      if (!sessionIdToDelete) {
        return res.status(400).json({ error: "Session ID to delete is required" });
      }

      if (sessionIdToDelete === decoded.sessionId) {
        return res.status(400).json({ error: "Cannot delete the current active session" });
      }

      const result = await telegramDb.lockDatabase(async () => {
        // Fetch user's individual JSON file
        const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

        // Check if current session is active
        const currentSession = userFile.sessions?.find(s => s.sessionId === decoded.sessionId);
        if (!currentSession || currentSession.status !== "Active") {
          throw new Error("UNAUTHORIZED_SESSION_INACTIVE");
        }

        if (userFile.sessions) {
          const sessionIndex = userFile.sessions.findIndex(s => s.sessionId === sessionIdToDelete);
          if (sessionIndex !== -1) {
            const s = userFile.sessions[sessionIndex];
            
            // Check delete rules: A session must always be terminated first, then it becomes eligible for deletion.
            if (s.status === "Active") {
              throw new Error("CANNOT_DELETE_ACTIVE_SESSION");
            }

            // Remove session from array
            userFile.sessions.splice(sessionIndex, 1);
            userFile.lastUpdated = Date.now();

            // Add a security audit log
            addUpdateLog(userFile, {
              action: "Session Deleted",
              previousValue: `${s.status} (OS: ${s.os}, Browser: ${s.browser})`,
              newValue: "Session Record Deleted",
              source: "Settings",
              userPerformed: userFile.username,
              metadata: { deletedSessionId: sessionIdToDelete }
            });

            // Upload updated JSON file to Telegram
            await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);
          }
        }
        return userFile.sessions || [];
      });

      res.json({ success: true, sessions: result });
    } catch (err: any) {
      console.error("Delete session error:", err);
      if (err.message === "UNAUTHORIZED_SESSION_INACTIVE") {
        return res.status(401).json({ error: "Unauthorized: Session has been terminated or expired" });
      }
      if (err.message === "CANNOT_DELETE_ACTIVE_SESSION") {
        return res.status(400).json({ error: "Cannot delete an active session. It must be terminated first." });
      }
      res.status(500).json({ error: `Failed to delete session: ${err.message}` });
    }
  });

  // Delete all terminated/expired/logged out sessions
  app.post("/api/auth/delete-inactive-sessions", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId || !decoded.sessionId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      const result = await telegramDb.lockDatabase(async () => {
        // Fetch user's individual JSON file
        const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

        // Check if current session is active
        const currentSession = userFile.sessions?.find(s => s.sessionId === decoded.sessionId);
        if (!currentSession || currentSession.status !== "Active") {
          throw new Error("UNAUTHORIZED_SESSION_INACTIVE");
        }

        if (userFile.sessions) {
          const originalCount = userFile.sessions.length;
          // Deletes all terminated/expired/logged out sessions except the current and active sessions.
          // Active sessions should never be deleted directly.
          userFile.sessions = userFile.sessions.filter(s => s.status === "Active" || s.sessionId === decoded.sessionId);
          const deletedCount = originalCount - userFile.sessions.length;

          if (deletedCount > 0) {
            userFile.lastUpdated = Date.now();

            // Add security audit log
            addUpdateLog(userFile, {
              action: "Inactive Sessions Deleted",
              previousValue: `Total: ${originalCount}`,
              newValue: `DELETED ${deletedCount} INACTIVE SESSIONS (Remaining Active: ${userFile.sessions.length})`,
              source: "Settings",
              userPerformed: userFile.username,
            });

            // Upload updated JSON file to Telegram
            await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);
          }
        }
        return userFile.sessions || [];
      });

      res.json({ success: true, sessions: result });
    } catch (err: any) {
      console.error("Delete inactive sessions error:", err);
      if (err.message === "UNAUTHORIZED_SESSION_INACTIVE") {
        return res.status(401).json({ error: "Unauthorized: Session has been terminated or expired" });
      }
      res.status(500).json({ error: `Failed to delete inactive sessions: ${err.message}` });
    }
  });

  // Update User state / data synced to Telegram
  app.post("/api/user/update", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      const { watchData, unlockedAchievements, preferences, isRestore } = req.body;

      const resultUser = await telegramDb.lockDatabase(async () => {
        // Fetch user's individual JSON file
        const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

        // Verify active session
        const currentSession = userFile.sessions?.find(s => s.sessionId === decoded.sessionId);
        if (!currentSession || currentSession.status !== "Active") {
          throw new Error("UNAUTHORIZED_SESSION_INACTIVE");
        }

        const oldWatchData = userFile.watchData || {};
        const oldAchievements = userFile.unlockedAchievements || [];
        const oldPreferences = userFile.preferences || {};

        if (isRestore) {
          addUpdateLog(userFile, {
            action: "Backup Restored",
            previousValue: "Previous state backup",
            newValue: `Backup Restored at ${formatToIndianDateTime(Date.now()).split(' ').slice(0, 3).join(' ')}`,
            source: "Settings",
            userPerformed: userFile.username,
            metadata: { restore: true }
          });
        }

        // Merge / overwrite with new updates
        if (watchData !== undefined) {
          for (const [movieId, newRecord] of Object.entries(watchData) as [string, any][]) {
            const oldRecord = oldWatchData[movieId] || {
              status: "unwatched",
              rating: 0,
              favorite: false,
              notes: ""
            };
            const title = MCU_TITLES.find(m => m.id === movieId)?.title || movieId;

            const statusChanged = newRecord.status && newRecord.status !== oldRecord.status;
            const ratingChanged = newRecord.rating !== undefined && newRecord.rating !== oldRecord.rating;

            if (statusChanged && ratingChanged) {
              const oldStatusStr = formatStatusLabel(oldRecord.status);
              const newStatusStr = formatStatusLabel(newRecord.status);
              const oldRatingStr = formatRatingLabel(oldRecord.rating);
              const newRatingStr = formatRatingLabel(newRecord.rating);

              addUpdateLog(userFile, {
                action: `Watch Status / Rating: ${title}`,
                previousValue: `${oldStatusStr} / ${oldRatingStr}`,
                newValue: `${newStatusStr} / ${newRatingStr}`,
                source: "Watch Status",
                userPerformed: userFile.username,
                metadata: { movieId }
              });
            } else {
              // 1. Status changed
              if (statusChanged) {
                addUpdateLog(userFile, {
                  action: `Watch Status: ${title}`,
                  previousValue: oldRecord.status.toUpperCase(),
                  newValue: newRecord.status.toUpperCase(),
                  source: "Watch Status",
                  userPerformed: userFile.username,
                  metadata: { movieId }
                });
              }
              // 2. Rating changed
              if (ratingChanged) {
                addUpdateLog(userFile, {
                  action: `Rating: ${title}`,
                  previousValue: oldRecord.rating ? `${oldRecord.rating}★` : "No rating",
                  newValue: `${newRecord.rating}★`,
                  source: "Watch Status",
                  userPerformed: userFile.username,
                  metadata: { movieId }
                });
              }
            }

            // 3. Favorite changed
            if (newRecord.favorite !== undefined && newRecord.favorite !== oldRecord.favorite) {
              addUpdateLog(userFile, {
                action: `Favorite Status: ${title}`,
                previousValue: oldRecord.favorite ? "Favorited" : "Not Favorited",
                newValue: newRecord.favorite ? "Favorited" : "Not Favorited",
                source: "Watch Status",
                userPerformed: userFile.username,
                metadata: { movieId }
              });
            }
            // 4. Notes changed
            if (newRecord.notes !== undefined && newRecord.notes !== oldRecord.notes) {
              addUpdateLog(userFile, {
                action: `Watch Notes: ${title}`,
                previousValue: oldRecord.notes || "No notes",
                newValue: newRecord.notes || "No notes",
                source: "Watch Status",
                userPerformed: userFile.username,
                metadata: { movieId }
              });
            }
          }
          userFile.watchData = watchData;
        }

        if (unlockedAchievements !== undefined) {
          const added = unlockedAchievements.filter((id: string) => !oldAchievements.includes(id));
          const removed = oldAchievements.filter((id: string) => !unlockedAchievements.includes(id));

          if (added.length > 0) {
            added.forEach((id: string) => {
              addUpdateLog(userFile, {
                action: "Achievement Unlocked",
                previousValue: "Locked",
                newValue: `Unlocked: ${id}`,
                source: "Achievements",
                userPerformed: userFile.username,
                metadata: { achievementId: id }
              });
            });
          }
          if (removed.length > 0) {
            removed.forEach((id: string) => {
              addUpdateLog(userFile, {
                action: "Achievement Relocked",
                previousValue: "Unlocked",
                newValue: `Locked: ${id}`,
                source: "Achievements",
                userPerformed: userFile.username,
                metadata: { achievementId: id }
              });
            });
          }
          userFile.unlockedAchievements = unlockedAchievements;
        }

        if (preferences !== undefined) {
          const PREF_NAMES: Record<string, string> = {
            chartPreference: "Chart Type",
            orderingMode: "Story Order",
            timelineMode: "Timeline View",
            theme: "Theme",
            favChar: "Favorite Character",
            favPhase: "Favorite Phase",
            devMode: "Developer Mode",
            lastBackupAt: "Last Backup Date",
            lastRestoreAt: "Last Restore Date",
            spoilerMode: "Spoiler Mode",
            hideSpoilers: "Spoiler Mode",
            language: "Preferred Language",
            preferredLanguage: "Preferred Language",
          };

          for (const [key, val] of Object.entries(preferences)) {
            const oldVal = oldPreferences[key];
            if (val !== oldVal) {
              if (key === "lastBackupAt" || key === "lastRestoreAt") {
                continue; // Skip individual updates log for backup/restore dates
              }
              const prefName = PREF_NAMES[key] || key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
              const action = `${prefName} updated`;
              let source = "Preferences";
              if (key === "theme") {
                source = "Theme";
              } else if (key === "favChar" || key === "favPhase") {
                source = "Profile";
              } else if (key === "devMode") {
                source = "Settings";
              }

              addUpdateLog(userFile, {
                action,
                previousValue: oldVal !== undefined && oldVal !== null && oldVal !== "" ? String(oldVal) : "Default",
                newValue: val !== undefined && val !== null && val !== "" ? String(val) : "Default",
                source,
                userPerformed: userFile.username,
                metadata: { key }
              });
            }
          }
          userFile.preferences = {
            ...(userFile.preferences || {}),
            ...preferences
          };
        }

        userFile.lastUpdated = Date.now();

        // Write changes back to Telegram in-place
        await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);
        return userFile;
      });

      res.json({
        success: true,
        user: {
          userId: resultUser.userId,
          fullName: resultUser.fullName,
          username: resultUser.username,
          createdAt: resultUser.createdAt,
          lastUpdated: resultUser.lastUpdated,
          sessions: resultUser.sessions || [],
          watchData: resultUser.watchData,
          unlockedAchievements: resultUser.unlockedAchievements,
          preferences: resultUser.preferences,
          avatarUrl: (resultUser.avatarFileId || resultUser.avatarUrl) ? `/api/user/avatar?userId=${resultUser.userId}&v=${resultUser.lastUpdated || resultUser.createdAt}` : "",
          updates: resultUser.updates || [],
          totalLogCount: resultUser.totalLogCount || (resultUser.updates?.length || 0) + (resultUser.updatesBuffer?.length || 0),
          archiveFileId: resultUser.archiveFileId || undefined,
        }
      });
    } catch (err: any) {
      console.error("Failed to update user file:", err);
      if (err.message === "UNAUTHORIZED_SESSION_INACTIVE") {
        return res.status(401).json({ error: "Unauthorized: Session has been terminated or expired" });
      }
      res.status(500).json({ error: `Update failed: ${err.message}` });
    }
  });

  // Log custom actions to the database
  app.post("/api/user/log-action", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      const { action, previousValue, newValue, source, metadata } = req.body;
      if (!action || !newValue || !source) {
        return res.status(400).json({ error: "Action, newValue, and source are required" });
      }

      const resultUser = await telegramDb.lockDatabase(async () => {
        const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

        const currentSession = userFile.sessions?.find(s => s.sessionId === decoded.sessionId);
        if (!currentSession || currentSession.status !== "Active") {
          throw new Error("UNAUTHORIZED_SESSION_INACTIVE");
        }

        addUpdateLog(userFile, {
          action,
          previousValue: previousValue || "N/A",
          newValue,
          source,
          userPerformed: userFile.username,
          metadata: metadata || {}
        });

        userFile.lastUpdated = Date.now();
        await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);
        return userFile;
      });

      res.json({
        success: true,
        user: {
          userId: resultUser.userId,
          fullName: resultUser.fullName,
          username: resultUser.username,
          createdAt: resultUser.createdAt,
          lastUpdated: resultUser.lastUpdated,
          sessions: resultUser.sessions || [],
          watchData: resultUser.watchData,
          unlockedAchievements: resultUser.unlockedAchievements,
          preferences: resultUser.preferences,
          avatarUrl: (resultUser.avatarFileId || resultUser.avatarUrl) ? `/api/user/avatar?userId=${resultUser.userId}&v=${resultUser.lastUpdated || resultUser.createdAt}` : "",
          updates: resultUser.updates || [],
          totalLogCount: resultUser.totalLogCount || (resultUser.updates?.length || 0) + (resultUser.updatesBuffer?.length || 0),
          archiveFileId: resultUser.archiveFileId || undefined,
        }
      });
    } catch (err: any) {
      console.error("Failed to log custom action:", err);
      if (err.message === "UNAUTHORIZED_SESSION_INACTIVE") {
        return res.status(401).json({ error: "Unauthorized: Session has been terminated or expired" });
      }
      res.status(500).json({ error: `Logging failed: ${err.message}` });
    }
  });

  // Update Profile Info (Full Name & Username)
  app.post("/api/user/update-profile", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      const { fullName, username } = req.body;
      if (!fullName && !username) {
        return res.status(400).json({ error: "Full Name or Username is required to update" });
      }

      const trimmedFullName = fullName?.trim();
      const trimmedUsername = username?.trim();

      const resultUser = await telegramDb.lockDatabase(async () => {
        // Fetch User Index (optimized shard fetch)
        const { index } = await telegramDb.fetchUserIndex(token, chatId, true, { userId: decoded.userId });
        const userEntryIndex = index.users.findIndex(u => u.userId === decoded.userId);
        if (userEntryIndex === -1) {
          throw new Error("User profile not found in index");
        }

        const userEntry = index.users[userEntryIndex];

        // Check username conflicts if changing username
        if (trimmedUsername && trimmedUsername.toLowerCase() !== userEntry.username.toLowerCase()) {
          const usernameLower = trimmedUsername.toLowerCase();
          const conflict = index.users.some(u => u.username.toLowerCase() === usernameLower);
          if (conflict) {
            throw new Error("CONFLICT: Username is already taken");
          }
        }

        // Fetch user JSON file
        const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

        // Verify active session
        const currentSession = userFile.sessions?.find(s => s.sessionId === decoded.sessionId);
        if (!currentSession || currentSession.status !== "Active") {
          throw new Error("UNAUTHORIZED_SESSION_INACTIVE");
        }

        if (trimmedFullName && userFile.fullName !== trimmedFullName) {
          addUpdateLog(userFile, {
            action: "Profile Name updated",
            previousValue: userFile.fullName || "N/A",
            newValue: trimmedFullName,
            source: "Profile",
            userPerformed: userFile.username,
            metadata: { field: "fullName" }
          });
          userFile.fullName = trimmedFullName;
        }
        if (trimmedUsername && userFile.username !== trimmedUsername) {
          addUpdateLog(userFile, {
            action: "Profile Username updated",
            previousValue: userFile.username || "N/A",
            newValue: trimmedUsername,
            source: "Profile",
            userPerformed: userFile.username,
            metadata: { field: "username" }
          });
          userFile.username = trimmedUsername;
        }
        userFile.lastUpdated = Date.now();

        // Save user file (updates message ID, file ID)
        await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);

        // Re-fetch index and explicitly update names & username in index entry (optimized shard fetch)
        const { index: freshIndex, pinnedMessageId: freshPinnedId } = await telegramDb.fetchUserIndex(token, chatId, true, { userId: decoded.userId });
        if (freshIndex.users) {
          const idx = freshIndex.users.findIndex(u => u.userId === decoded.userId);
          if (idx !== -1) {
            if (trimmedFullName) freshIndex.users[idx].fullName = trimmedFullName;
            if (trimmedUsername) freshIndex.users[idx].username = trimmedUsername;
            freshIndex.users[idx].authLastUpdated = Date.now();
            freshIndex.lastUpdated = Date.now();
            await telegramDb.saveUserIndex(token, chatId, freshIndex, freshPinnedId);
          }
        }
        return userFile;
      });

      res.json({
        success: true,
        user: {
          userId: resultUser.userId,
          fullName: resultUser.fullName,
          username: resultUser.username,
          createdAt: resultUser.createdAt,
          lastUpdated: resultUser.lastUpdated,
          sessions: resultUser.sessions || [],
          watchData: resultUser.watchData,
          unlockedAchievements: resultUser.unlockedAchievements,
          preferences: resultUser.preferences,
          avatarUrl: (resultUser.avatarFileId || resultUser.avatarUrl) ? `/api/user/avatar?userId=${resultUser.userId}&v=${resultUser.lastUpdated || resultUser.createdAt}` : "",
          updates: resultUser.updates || [],
          totalLogCount: resultUser.totalLogCount || (resultUser.updates?.length || 0) + (resultUser.updatesBuffer?.length || 0),
          archiveFileId: resultUser.archiveFileId || undefined,
        }
      });
    } catch (err: any) {
      console.error("Profile update error:", err);
      if (err.message === "UNAUTHORIZED_SESSION_INACTIVE") {
        return res.status(401).json({ error: "Unauthorized: Session has been terminated or expired" });
      }
      if (err.message && err.message.includes("CONFLICT")) {
        return res.status(409).json({ error: "Username is already taken" });
      }
      res.status(500).json({ error: `Profile update failed: ${err.message}` });
    }
  });

  // Fetch user's archived update logs (transparently downloaded from Telegram)
  app.get("/api/user/logs/archive", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      // Fetch archived logs
      const updates = await telegramDb.fetchUserArchive(token, chatId, decoded.userId);
      res.json({ success: true, updates });
    } catch (err: any) {
      console.error("Failed to fetch logs archive:", err);
      res.status(500).json({ error: `Failed to fetch logs archive: ${err.message}` });
    }
  });

  // Reset Password
  app.post("/api/user/reset-password", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      const { index, pinnedMessageId } = await telegramDb.fetchUserIndex(token, chatId, true, { userId: decoded.userId });
      const userEntry = index.users.find(u => u.userId === decoded.userId);
      if (!userEntry) {
        return res.status(404).json({ error: "User profile not found in index" });
      }

      // Verify current password
      const calculatedHash = telegramDb.hashPassword(currentPassword, userEntry.salt);
      if (calculatedHash !== userEntry.passwordHash) {
        return res.status(401).json({ error: "Invalid current password" });
      }

      // Calculate new hash and update index entry
      const newSalt = telegramDb.generateSalt();
      const newHash = telegramDb.hashPassword(newPassword, newSalt);

      userEntry.salt = newSalt;
      userEntry.passwordHash = newHash;
      userEntry.authLastUpdated = Date.now();
      index.lastUpdated = Date.now();

      await telegramDb.saveUserIndex(token, chatId, index, pinnedMessageId);

      // Fetch, update with audit log, and save user file
      try {
        const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);
        addUpdateLog(userFile, {
          action: "Password Changed",
          previousValue: "********",
          newValue: "********",
          source: "Settings",
          userPerformed: userFile.username,
        });
        await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);
      } catch (logErr) {
        console.warn("Audit log for password change failed, continuing:", logErr);
      }

      res.json({ success: true, message: "Password updated successfully" });
    } catch (err: any) {
      console.error("Password reset error:", err);
      res.status(500).json({ error: `Password update failed: ${err.message}` });
    }
  });

  // Delete Account
  app.post("/api/user/delete-account", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Password verification is required to delete account" });
      }

      const { index, pinnedMessageId } = await telegramDb.fetchUserIndex(token, chatId, true, { userId: decoded.userId });
      const userEntryIndex = index.users.findIndex(u => u.userId === decoded.userId);
      if (userEntryIndex === -1) {
        return res.status(404).json({ error: "User profile not found in index" });
      }

      const userEntry = index.users[userEntryIndex];

      // Verify current password
      const calculatedHash = telegramDb.hashPassword(password, userEntry.salt);
      if (calculatedHash !== userEntry.passwordHash) {
        return res.status(401).json({ error: "Invalid password confirmation" });
      }

      // Fetch user's individual JSON file before delete to check avatar details
      let userFile: telegramDb.UserJson | null = null;
      try {
        userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);
      } catch (e) {
        console.warn("Could not fetch user file during deletion:", e);
      }

      // Try deleting the associated user MessagePack files on Telegram
      const messagesToDelete = [
        userEntry.authMessageId,
        userEntry.sessionsMessageId,
        userEntry.progressMessageId
      ].filter((id): id is number => typeof id === "number" && id > 0);

      // Deduplicate message IDs
      const uniqueMsgIds = Array.from(new Set(messagesToDelete));

      for (const msgId of uniqueMsgIds) {
        try {
          await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, message_id: msgId }),
          });
        } catch (e) {
          console.warn(`Failed to delete user message ${msgId}:`, e);
        }
      }

      // Try deleting the avatar image message on the dedicated avatar channel (if any)
      try {
        if (userFile && userFile.avatarMessageId) {
          const avatarChatId = process.env.TELEGRAM_AVATAR_CHAT_ID || chatId;
          await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: avatarChatId, message_id: userFile.avatarMessageId }),
          });
        }
      } catch (e) {
        console.warn("Failed to delete user avatar message:", e);
      }

      // Remove from index
      index.users.splice(userEntryIndex, 1);
      index.lastUpdated = Date.now();

      await telegramDb.saveUserIndex(token, chatId, index, pinnedMessageId);

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (err: any) {
      console.error("Delete account error:", err);
      res.status(500).json({ error: `Account deletion failed: ${err.message}` });
    }
  });

  // Upload or Update Profile photo to User Binary storage
  app.post("/api/user/avatar", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const sessionToken = authHeader.split(" ")[1];

    try {
      const { token, chatId, secret } = telegramDb.getTelegramConfig();
      const avatarChatId = process.env.TELEGRAM_AVATAR_CHAT_ID || chatId;

      const decoded = telegramDb.verifyToken(sessionToken, secret);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      }

      const { avatarData, filename } = req.body;
      if (!avatarData) {
        return res.status(400).json({ error: "Avatar base64 data is required" });
      }

      const matches = avatarData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let mimeType = "image/jpeg";
      let base64Content = avatarData;
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Content = matches[2];
      }

      const buffer = Buffer.from(base64Content, "base64");
      const name = filename || `avatar_${decoded.userId}.jpg`;

      // Fetch existing user file
      const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

      // Create structured caption metadata to store alongside profile picture
      const lastUpdatedIst = telegramDb.formatToIndianDateTime(new Date());
      const caption = `--- PROFILE PICTURE METADATA ---
User ID: ${decoded.userId}
Username: @${userFile.username || decoded.username || ""}
Full Name: ${userFile.fullName || ""}
Last Updated: ${lastUpdatedIst}
--------------------------------`;

      let avatarMessageId = userFile.avatarMessageId;
      let avatarFileId = userFile.avatarFileId;

      if (avatarMessageId) {
        // Edit existing message document in-place on Telegram to avoid spam
        try {
          const updated = await telegramDb.updateTelegramBinaryFile(
            token,
            avatarChatId,
            avatarMessageId,
            name,
            buffer,
            mimeType,
            caption
          );
          avatarMessageId = updated.messageId;
          avatarFileId = updated.fileId;
        } catch (err: any) {
          const errMsg = err.message || "";
          if (errMsg.includes("message is not modified")) {
            console.log("Avatar not modified. Keeping existing pointers.");
          } else if (errMsg.includes("message to edit not found") || errMsg.includes("message can't be edited") || errMsg.includes("chat not found")) {
            console.warn("Failed to edit existing avatar (not found), doing fresh upload:", err);
            const uploaded = await telegramDb.uploadTelegramBinaryFile(
              token,
              avatarChatId,
              name,
              buffer,
              mimeType,
              caption
            );
            avatarMessageId = uploaded.messageId;
            avatarFileId = uploaded.fileId;
          } else {
            console.error(`Temporary failure updating existing avatar ${avatarMessageId}:`, err);
            throw err;
          }
        }
      } else {
        const uploaded = await telegramDb.uploadTelegramBinaryFile(
          token,
          avatarChatId,
          name,
          buffer,
          mimeType,
          caption
        );
        avatarMessageId = uploaded.messageId;
        avatarFileId = uploaded.fileId;
      }

      const oldAvatarLogVal = userFile.avatarFileId ? "Previous Avatar" : "No Avatar";
      const newAvatarLogVal = "New Avatar Set";

      addUpdateLog(userFile, {
        action: "Profile Photo Updated",
        previousValue: oldAvatarLogVal,
        newValue: newAvatarLogVal,
        source: "Profile",
        userPerformed: userFile.username,
        metadata: { filename: name }
      });

      // Keep user JSON file lightweight: store only references, delete heavy base64 data
      userFile.avatarMessageId = avatarMessageId;
      userFile.avatarFileId = avatarFileId;
      userFile.avatarUrl = ""; // clear heavy base64 url
      userFile.lastUpdated = Date.now();

      // Write updated user JSON back to Telegram
      await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);

      res.json({
        success: true,
        avatarUrl: `/api/user/avatar?userId=${decoded.userId}&v=${userFile.lastUpdated}`
      });
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      res.status(500).json({ error: `Avatar upload failed: ${err.message}` });
    }
  });

  // Serves user profile photo dynamically from binary storage
  app.get("/api/user/avatar", async (req, res) => {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      return res.status(400).send("User ID parameter is required");
    }

    try {
      const { token, chatId } = telegramDb.getTelegramConfig();
      const avatarChatId = process.env.TELEGRAM_AVATAR_CHAT_ID || chatId;

      // Try looking up the user's avatar metadata inside the fast sharded Authentication Index first
      const { index } = await telegramDb.fetchUserIndex(token, chatId, false, { userId });
      const userEntry = index.users.find(u => u.userId === userId);

      let avatarFileId = userEntry?.avatarFileId;

      // Self-healing fallback: If not in index, fall back to fetching UserJson to check if they have it there
      if (!avatarFileId) {
        console.log(`[Avatar Lookup] Avatar not found in sharded index for ${userId}, falling back to user file...`);
        const userFile = await telegramDb.fetchUserFile(token, chatId, userId);
        avatarFileId = userFile.avatarFileId;

        // Automatically propagate/heal the index entry to prevent future slow lookups
        if (avatarFileId && userEntry) {
          userEntry.avatarFileId = avatarFileId;
          userEntry.avatarMessageId = userFile.avatarMessageId;
          userEntry.avatarLastUpdated = userFile.lastUpdated || Date.now();
          // Asynchronously save the updated index to optimize future requests
          telegramDb.saveUserIndex(token, chatId, index, null).catch(err => {
            console.error("Failed to asynchronously heal avatar in index:", err);
          });
        }
      }

      // If stored in binary format
      if (avatarFileId) {
        const filePath = await telegramDb.getTelegramFilePath(token, avatarFileId);
        const buffer = await telegramDb.downloadTelegramFileBinary(token, filePath);

        // Deduce content type from file path extension or use default
        const ext = path.extname(filePath).toLowerCase();
        let contentType = "image/jpeg";
        if (ext === ".png") contentType = "image/png";
        else if (ext === ".gif") contentType = "image/gif";
        else if (ext === ".webp") contentType = "image/webp";

        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return res.send(buffer);
      }

      // Fallback to base64 if present from legacy record in user file
      const userFile = await telegramDb.fetchUserFile(token, chatId, userId);
      if (userFile.avatarUrl && userFile.avatarUrl.startsWith("data:")) {
        const matches = userFile.avatarUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const base64Content = matches[2];
          const buffer = Buffer.from(base64Content, "base64");
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
          return res.send(buffer);
        }
      }

      return res.redirect("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150");
    } catch (err: any) {
      console.error("Failed to dynamically serve avatar:", err);
      res.redirect("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150");
    }
  });

  // 1. Server-Side Image Proxy
  app.get("/api/image-proxy", async (req, res) => {
    const url = req.query.url as string;
    const characterId = req.query.characterId as string;

    // Try to resolve character portraits directly from the Telegram Character Repository if characterId or telegram.local URL is provided
    let charFilename: string | null = characterId ? telegramCharacterImages.getCharacterFilename(characterId) : null;
    
    if (!charFilename && url && url.includes("telegram.local")) {
      const parts = url.split("/");
      const possibleFilename = parts[parts.length - 1];
      if (possibleFilename && possibleFilename.endsWith(".jpg")) {
        charFilename = possibleFilename;
      }
    }

    if (charFilename) {
      try {
        const imageResult = await telegramCharacterImages.getCharacterImage(charFilename);
        if (imageResult) {
          res.setHeader("Content-Type", imageResult.contentType);
          res.setHeader("Cache-Control", "public, max-age=604800, immutable"); // Cache for 7 days
          return res.send(imageResult.bytes);
        }
      } catch (err: any) {
        console.warn(`[Telegram Character Repo] Failed to serve character portrait for ${charFilename} from Telegram:`, err.message);
      }
    }

    // If url is a synthetic telegram.local URL and image wasn't found, do not attempt external fetches
    if (url && url.includes("telegram.local")) {
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="100%" height="100%">
          <rect width="100%" height="100%" fill="#121217"/>
          <g transform="translate(200, 270)">
            <circle r="45" fill="#22222a"/>
            <circle r="20" fill="#3a3a48"/>
            <path d="M-40,60 C-40,35 40,35 40,60 Z" fill="#3a3a48"/>
          </g>
          <text x="50%" y="370" dominant-baseline="middle" text-anchor="middle" fill="#666675" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="1">CHARACTER PORTRAIT</text>
        </svg>
      `);
    }

    if (!url) {
      return res.status(400).send("URL parameter is required");
    }

    const urlsToTry: string[] = [];

    // Try the original url and original wiki url last as fallbacks
    if (!urlsToTry.includes(url)) {
      urlsToTry.push(url);
    }

    const originalWiki = getOriginalWikipediaUrl(url);
    if (originalWiki && !urlsToTry.includes(originalWiki)) {
      urlsToTry.push(originalWiki);
    }

    for (const targetUrl of urlsToTry) {
      // Attempt 1: Try WordPress Photon Proxy first (enterprise scale, extremely fast, bypasses rate limits/hotlinking blocks)
      try {
        const cleanUrl = targetUrl.replace(/^https?:\/\//, "");
        const photonUrl = `https://i0.wp.com/${cleanUrl}`;
        const response = await fetch(photonUrl, {
          signal: AbortSignal.timeout(4000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          }
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.startsWith("image/")) {
            res.setHeader("Content-Type", contentType);
          } else {
            res.setHeader("Content-Type", "image/jpeg");
          }
          res.setHeader("Cache-Control", "public, max-age=604800, immutable"); // Cache for 7 days
          const arrayBuffer = await response.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (err) {
        console.warn(`WordPress Photon proxy failed for ${targetUrl}:`, err);
      }

      // Attempt 2: Try with Weserv (highly cached global proxy)
      try {
        const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(weservUrl, {
          signal: AbortSignal.timeout(4000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          }
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.startsWith("image/")) {
            res.setHeader("Content-Type", contentType);
          } else {
            res.setHeader("Content-Type", "image/jpeg");
          }
          res.setHeader("Cache-Control", "public, max-age=604800, immutable"); // Cache for 7 days
          const arrayBuffer = await response.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (err) {
        console.warn(`Weserv proxy failed for ${targetUrl}:`, err);
      }

      // Attempt 3: Direct fetch fallback with custom headers for hotlink-protected sites
      try {
        const isWiki = targetUrl.includes("wikimedia.org") || targetUrl.includes("wikipedia.org");
        const isFandom = targetUrl.includes("nocookie.net") || targetUrl.includes("fandom.com");
        const headers: Record<string, string> = {
          "User-Agent": isWiki 
            ? "MCUTimelineApp/1.0 (contact: mubasshirsunni@gmail.com; tool: fetch) NodeFetch/2.0" 
            : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/*, */*"
        };
        if (isWiki) {
          headers["Referer"] = "https://en.wikipedia.org/";
        } else if (isFandom) {
          headers["Referer"] = "https://marvelcinematicuniverse.fandom.com/";
        }

        const response = await fetch(targetUrl, {
          signal: AbortSignal.timeout(4000),
          headers
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.startsWith("image/")) {
            res.setHeader("Content-Type", contentType);
          } else {
            res.setHeader("Content-Type", "image/jpeg");
          }
          res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day cache
          const arrayBuffer = await response.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (err) {
        console.warn(`Direct fetch failed for ${targetUrl}:`, err);
      }
    }

    // All attempts failed - Return a professional SVG fallback image
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"); // do not cache failed states
    res.status(502).send(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="100%" height="100%">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0e0e13"/>
            <stop offset="100%" stop-color="#1c1d24"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" rx="12"/>
        <rect width="100%" height="100%" fill="none" stroke="#26262b" stroke-width="2" rx="12"/>
        <g transform="translate(200, 280)">
          <!-- Emblem shield representation -->
          <path d="M-40,-50 L40,-50 L50,-10 L0,50 L-50,-10 Z" fill="#e62429" opacity="0.8"/>
          <text font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="2" y="-5">MARVEL</text>
          <text font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="10" fill="#a3a3a3" text-anchor="middle" dominant-baseline="middle" letter-spacing="1" y="25">INTEL CLASSIFIED</text>
        </g>
      </svg>
    `);
  });

export default app;
