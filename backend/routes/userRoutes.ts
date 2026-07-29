import express from "express";
import path from "path";
import * as telegramDb from "../Database.js";
import { MCU_TITLES } from "../../src/data/mcuData.js";
import { addUpdateLog, formatStatusLabel, formatRatingLabel, formatToIndianDateTime } from "../utils/formatters.js";

const router = express.Router();

// Update User state / data synced to Telegram
router.post("/api/user/update", async (req, res) => {
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
      const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

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
              continue;
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
router.post("/api/user/log-action", async (req, res) => {
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
router.post("/api/user/update-profile", async (req, res) => {
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
      const { index } = await telegramDb.fetchUserIndex(token, chatId, true, { userId: decoded.userId });
      const userEntryIndex = index.users.findIndex(u => u.userId === decoded.userId);
      if (userEntryIndex === -1) {
        throw new Error("User profile not found in index");
      }

      const userEntry = index.users[userEntryIndex];

      if (trimmedUsername && trimmedUsername.toLowerCase() !== userEntry.username.toLowerCase()) {
        const usernameLower = trimmedUsername.toLowerCase();
        const conflict = index.users.some(u => u.username.toLowerCase() === usernameLower);
        if (conflict) {
          throw new Error("CONFLICT: Username is already taken");
        }
      }

      const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

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

      await telegramDb.updateUserFileAndIndex(token, chatId, decoded.userId, userFile);

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

// Fetch user's archived update logs
router.get("/api/user/logs/archive", async (req, res) => {
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

    const updates = await telegramDb.fetchUserArchive(token, chatId, decoded.userId);
    res.json({ success: true, updates });
  } catch (err: any) {
    console.error("Failed to fetch logs archive:", err);
    res.status(500).json({ error: `Failed to fetch logs archive: ${err.message}` });
  }
});

// Reset Password
router.post("/api/user/reset-password", async (req, res) => {
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

    const calculatedHash = telegramDb.hashPassword(currentPassword, userEntry.salt);
    if (calculatedHash !== userEntry.passwordHash) {
      return res.status(401).json({ error: "Invalid current password" });
    }

    const newSalt = telegramDb.generateSalt();
    const newHash = telegramDb.hashPassword(newPassword, newSalt);

    userEntry.salt = newSalt;
    userEntry.passwordHash = newHash;
    userEntry.authLastUpdated = Date.now();
    index.lastUpdated = Date.now();

    await telegramDb.saveUserIndex(token, chatId, index, pinnedMessageId);

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
router.post("/api/user/delete-account", async (req, res) => {
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

    const calculatedHash = telegramDb.hashPassword(password, userEntry.salt);
    if (calculatedHash !== userEntry.passwordHash) {
      return res.status(401).json({ error: "Invalid password confirmation" });
    }

    let userFile: telegramDb.UserJson | null = null;
    try {
      userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);
    } catch (e) {
      console.warn("Could not fetch user file during deletion:", e);
    }

    const messagesToDelete = [
      userEntry.authMessageId,
      userEntry.sessionsMessageId,
      userEntry.progressMessageId
    ].filter((id): id is number => typeof id === "number" && id > 0);

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

    index.users.splice(userEntryIndex, 1);
    index.lastUpdated = Date.now();

    await telegramDb.saveUserIndex(token, chatId, index, pinnedMessageId);

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err: any) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: `Account deletion failed: ${err.message}` });
  }
});

// Upload or Update Profile photo
router.post("/api/user/avatar", async (req, res) => {
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

    const userFile = await telegramDb.fetchUserFile(token, chatId, decoded.userId, true);

    const lastUpdatedIst = formatToIndianDateTime(new Date());
    const caption = `--- PROFILE PICTURE METADATA ---
User ID: ${decoded.userId}
Username: @${userFile.username || decoded.username || ""}
Full Name: ${userFile.fullName || ""}
Last Updated: ${lastUpdatedIst}
--------------------------------`;

    let avatarMessageId = userFile.avatarMessageId;
    let avatarFileId = userFile.avatarFileId;

    if (avatarMessageId) {
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

    userFile.avatarMessageId = avatarMessageId;
    userFile.avatarFileId = avatarFileId;
    userFile.avatarUrl = "";
    userFile.lastUpdated = Date.now();

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
router.get("/api/user/avatar", async (req, res) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).send("User ID parameter is required");
  }

  try {
    const { token, chatId } = telegramDb.getTelegramConfig();
    const avatarChatId = process.env.TELEGRAM_AVATAR_CHAT_ID || chatId;

    const { index } = await telegramDb.fetchUserIndex(token, chatId, false, { userId });
    const userEntry = index.users.find(u => u.userId === userId);

    let avatarFileId = userEntry?.avatarFileId;

    if (!avatarFileId) {
      console.log(`[Avatar Lookup] Avatar not found in sharded index for ${userId}, falling back to user file...`);
      const userFile = await telegramDb.fetchUserFile(token, chatId, userId);
      avatarFileId = userFile.avatarFileId;

      if (avatarFileId && userEntry) {
        userEntry.avatarFileId = avatarFileId;
        userEntry.avatarMessageId = userFile.avatarMessageId;
        userEntry.avatarLastUpdated = userFile.lastUpdated || Date.now();
        telegramDb.saveUserIndex(token, chatId, index, null).catch(err => {
          console.error("Failed to asynchronously heal avatar in index:", err);
        });
      }
    }

    if (avatarFileId) {
      const filePath = await telegramDb.getTelegramFilePath(token, avatarFileId);
      const buffer = await telegramDb.downloadTelegramFileBinary(token, filePath);

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

export default router;
