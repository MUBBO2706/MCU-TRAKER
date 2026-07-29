import express from "express";
import crypto from "crypto";
import * as telegramDb from "../Database.js";
import { resolveDeviceName } from "../deviceResolver.js";
import { resolveIpAndLocation } from "../ipResolver.js";
import { addUpdateLog } from "../utils/formatters.js";

const router = express.Router();

// Check Telegram database connection configuration status
router.get("/api/auth/status", (req, res) => {
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
router.post("/api/auth/register", async (req, res) => {
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
    await telegramDb.registerUser(
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
router.post("/api/auth/login", async (req, res) => {
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
router.get("/api/auth/me", async (req, res) => {
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

    // Fetch user's individual JSON file using the User ID lookup flow
    const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId);

    // Verify that the current session is indeed still Active
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

// User Logout
router.post("/api/auth/logout", async (req, res) => {
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

    const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

    if (userFile.sessions) {
      const sessionIndex = userFile.sessions.findIndex(s => s.sessionId === decoded.sessionId);
      if (sessionIndex !== -1) {
        const s = userFile.sessions[sessionIndex];
        s.status = "Logged Out";
        s.endedAt = Date.now();
        s.durationSeconds = Math.round((s.endedAt - s.startedAt) / 1000);
        userFile.lastUpdated = Date.now();

        await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Logout error:", err);
    res.status(200).json({ success: true, warning: "Backend logout failed to synchronize with secure storage" });
  }
});

// Terminate a specific session (Revocation)
router.post("/api/auth/terminate", async (req, res) => {
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
      const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

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
            addUpdateLog(userFile, {
              action: "Session Terminated",
              previousValue: "ACTIVE",
              newValue: `${deviceName} Terminated`,
              source: "Settings",
              userPerformed: userFile.username,
              metadata: { terminatedSessionId: sessionIdToTerminate, deviceName }
            });

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

// Terminate all other sessions except current
router.post("/api/auth/terminate-others", async (req, res) => {
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
      const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

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

          addUpdateLog(userFile, {
            action: "Other Sessions Terminated",
            previousValue: "ACTIVE",
            newValue: `TERMINATED ${terminatedCount} OTHER SESSIONS`,
            source: "Settings",
            userPerformed: userFile.username,
          });

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

// Delete a specific inactive session
router.post("/api/auth/delete-session", async (req, res) => {
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
      const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

      const currentSession = userFile.sessions?.find(s => s.sessionId === decoded.sessionId);
      if (!currentSession || currentSession.status !== "Active") {
        throw new Error("UNAUTHORIZED_SESSION_INACTIVE");
      }

      if (userFile.sessions) {
        const sessionIndex = userFile.sessions.findIndex(s => s.sessionId === sessionIdToDelete);
        if (sessionIndex !== -1) {
          const s = userFile.sessions[sessionIndex];
          
          if (s.status === "Active") {
            throw new Error("CANNOT_DELETE_ACTIVE_SESSION");
          }

          userFile.sessions.splice(sessionIndex, 1);
          userFile.lastUpdated = Date.now();

          addUpdateLog(userFile, {
            action: "Session Deleted",
            previousValue: `${s.status} (OS: ${s.os}, Browser: ${s.browser})`,
            newValue: "Session Record Deleted",
            source: "Settings",
            userPerformed: userFile.username,
            metadata: { deletedSessionId: sessionIdToDelete }
          });

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
router.post("/api/auth/delete-inactive-sessions", async (req, res) => {
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
      const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

      const currentSession = userFile.sessions?.find(s => s.sessionId === decoded.sessionId);
      if (!currentSession || currentSession.status !== "Active") {
        throw new Error("UNAUTHORIZED_SESSION_INACTIVE");
      }

      if (userFile.sessions) {
        const originalCount = userFile.sessions.length;
        userFile.sessions = userFile.sessions.filter(s => s.status === "Active" || s.sessionId === decoded.sessionId);
        const deletedCount = originalCount - userFile.sessions.length;

        if (deletedCount > 0) {
          userFile.lastUpdated = Date.now();

          addUpdateLog(userFile, {
            action: "Inactive Sessions Deleted",
            previousValue: `Total: ${originalCount}`,
            newValue: `DELETED ${deletedCount} INACTIVE SESSIONS (Remaining Active: ${userFile.sessions.length})`,
            source: "Settings",
            userPerformed: userFile.username,
          });

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

export default router;
