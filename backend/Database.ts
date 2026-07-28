import crypto from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import { encode, decode } from "@msgpack/msgpack";

const dbLockContext = new AsyncLocalStorage<boolean>();
let globalDbWritePromise = Promise.resolve();

export async function lockDatabase<T>(fn: () => Promise<T>): Promise<T> {
  if (dbLockContext.getStore()) {
    return await fn();
  }

  const currentPromise = globalDbWritePromise;
  let resolveNext: any;
  const nextPromise = new Promise<void>((resolve) => {
    resolveNext = resolve;
  });
  globalDbWritePromise = nextPromise;

  try {
    await currentPromise;
  } catch (err) {
    // ignore
  }

  try {
    return await dbLockContext.run(true, fn);
  } finally {
    resolveNext();
  }
}

export interface UserSession {
  sessionId: string;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number | null;
  browser: string;
  os: string;
  device?: string;
  resolvedDeviceName?: string;
  ipAddress?: string;
  location?: string;
  status: "Active" | "Terminated" | "Logged Out";
}

export interface UpdateLog {
  id: string;
  timestamp: number;
  action: string;
  previousValue: string;
  newValue: string;
  source: string;
  userPerformed: string;
  metadata?: any;
}

export interface UserJson {
  userId: string;
  fullName: string;
  username: string;
  createdAt: number;
  lastUpdated: number;
  sessions: UserSession[];
  watchData?: any;
  unlockedAchievements?: any;
  preferences?: any;
  avatarFileId?: string;
  avatarMessageId?: number;
  avatarUrl?: string;
  updates?: UpdateLog[];
  updatesBuffer?: UpdateLog[];
  totalLogCount?: number;
  archiveFileId?: string;
}

export interface UserIndexEntry {
  userId: string;
  fullName: string;
  username: string;
  authMessageId: number; // Primary Auth Document Message ID (Anchor)
  authFileId: string;    // Primary Auth Document File ID
  createdAt: number;
  authLastUpdated: number;
  progressLastUpdated: number;
  status: string;
  passwordHash: string;
  salt: string;
  sessionsMessageId?: number; // Kept for on-the-fly cleanup of legacy 3-file records
  sessionsFileId?: string;
  progressMessageId?: number; // Progress Document Message ID
  progressFileId?: string;    // Progress Document File ID
  avatarFileId?: string;
  avatarMessageId?: number;
  avatarLastUpdated?: number;
  archiveMessageId?: number;  // Archive Document Message ID
  archiveFileId?: string;     // Archive Document File ID
  archiveLastUpdated?: number;
  totalLogCount?: number;
}

export interface UserIndex {
  users: UserIndexEntry[];
  lastUpdated: number;
  shardKey?: string; // Track which shard this virtual index represents
}

export interface ShardInfo {
  messageId: number;
  fileId: string;
  lastUpdated: number;
}

export interface ShardUserIndex {
  users: UserIndexEntry[];
  lastUpdated: number;
}

export interface MasterIndex {
  isMaster: boolean; // flag to distinguish from legacy UserIndex
  shards: Record<string, ShardInfo>;
  userIdMap: Record<string, string>; // maps userId -> shardKey
  lastUpdated: number;
  metadata?: any;
}

// In-Memory Database Caches for Ultra-Low Latency Roundtrips
interface IndexCacheEntry {
  index: UserIndex;
  pinnedMessageId: number | null;
  timestamp: number;
}

interface UserCacheEntry {
  userJson: UserJson;
  timestamp: number;
}

interface MasterIndexCache {
  master: MasterIndex;
  pinnedMessageId: number | null;
  timestamp: number;
}

interface ShardCacheEntry {
  users: UserIndexEntry[];
  lastUpdated: number;
  timestamp: number;
}

let cachedIndex: IndexCacheEntry | null = null;
let cachedMaster: MasterIndexCache | null = null;
const cachedShards = new Map<string, ShardCacheEntry>();
const userFileCache = new Map<string, UserCacheEntry>();

const INDEX_CACHE_TTL = 15000; // 15 seconds TTL for the root index to prevent duplicate lookups
const USER_CACHE_TTL = 8000;   // 8 seconds TTL for individual user files during consecutive user operations


// Extract Browser and OS from user-agent string
export function parseUserAgent(userAgentString: string | undefined): { browser: string; os: string; device: string } {
  if (!userAgentString) {
    return { browser: "Unknown", os: "Unknown", device: "Unknown Device" };
  }
  let os = "Unknown OS";
  let browser = "Unknown Browser";
  let device = "Unknown Device";

  const ua = userAgentString.toLowerCase();

  // OS Detection
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  // Device Detection (Basic fallback)
  if (os === "Android") {
    // Try to extract Android device model (e.g., "Linux; Android 10; SM-A205U" -> "SM-A205U")
    const match = userAgentString.match(/Android\s+[0-9\.]+\s*;?\s*([^;]+)(?:;|\))/);
    if (match && match[1]) {
      device = match[1].replace(/Build.*/, '').trim();
    } else {
      device = "Android Device";
    }
  } else if (os === "iOS") {
    if (ua.includes("iphone")) device = "iPhone";
    else if (ua.includes("ipad")) device = "iPad";
  } else if (os === "macOS") {
    device = "Mac";
  } else if (os === "Windows") {
    device = "PC";
  } else if (os === "Linux") {
    device = "Linux PC";
  }

  // Browser Detection
  if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("chrome") && !ua.includes("chromium")) browser = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edge") || ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("opera") || ua.includes("opr/")) browser = "Opera";
  else if (ua.includes("chromium")) browser = "Chromium";

  return { browser, os, device };
}

// Lazy configurations and validation
export function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.STORAGE_ACCESS_TOKEN;
  const storageChannelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID || process.env.STORAGE_STORAGE_CHANNEL_ID;
  const authChannelId = process.env.TELEGRAM_AUTH_CHANNEL_ID || process.env.STORAGE_AUTH_CHANNEL_ID || storageChannelId;

  if (!token || (!storageChannelId && !authChannelId)) {
    throw new Error("TELEGRAM_NOT_CONFIGURED");
  }

  const secret = process.env.JWT_SECRET || "default_super_secret_mcu_timeline_key_12345_67890";
  return {
    token,
    chatId: storageChannelId,
    authChannelId: authChannelId || storageChannelId,
    storageChannelId: storageChannelId,
    secret
  };
}

// Secure PBKDF2 Password Hashing
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Custom Stateless JWT Sign/Verify using built-in Crypto API
export function createToken(payload: object, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const base64Payload = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${base64Payload}`).digest("base64url");
  return `${header}.${base64Payload}.${signature}`;
}

export function verifyToken(token: string, secret: string): any {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    const expectedSignature = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (decodedPayload.exp && decodedPayload.exp < Date.now()) return null; // Token expired
    return decodedPayload;
  } catch (err) {
    return null;
  }
}

// Telegram HTTP helper
async function telegramRequest(token: string, endpoint: string, options?: RequestInit) {
  const url = `https://api.telegram.org/bot${token}/${endpoint}`;
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
  }
  return response.json();
}

// Upload file helper
export async function uploadTelegramFile(
  token: string,
  chatId: string,
  filename: string,
  content: string,
  caption?: string
): Promise<{ messageId: number; fileId: string }> {
  const formData = new FormData();
  formData.append("chat_id", chatId);

  const blob = new Blob([content], { type: "application/json" });
  formData.append("document", blob, filename);

  if (caption) {
    formData.append("caption", caption);
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to upload file to Telegram: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  if (!data.ok || !data.result?.document?.file_id) {
    throw new Error("Telegram upload succeeded but document file ID was missing from response");
  }

  return {
    messageId: data.result.message_id,
    fileId: data.result.document.file_id,
  };
}

// Download file helper
export async function getTelegramFilePath(token: string, fileId: string): Promise<string> {
  const data = await telegramRequest(token, `getFile?file_id=${fileId}`);
  if (!data.ok || !data.result?.file_path) {
    throw new Error("Failed to get file path from Telegram");
  }
  return data.result.file_path;
}

export async function downloadTelegramFile(token: string, filePath: string): Promise<string> {
  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file from Telegram: ${response.statusText}`);
  }
  return response.text();
}

// Deterministic sharding based on the first character of the username
export function getShardKey(username: string): string {
  if (!username) return "index_other";
  const firstChar = username.trim().charAt(0).toLowerCase();
  if (/[a-z]/.test(firstChar)) {
    return `index_${firstChar}`;
  }
  if (/[0-9]/.test(firstChar)) {
    return "index_num";
  }
  return "index_other";
}

// Migrate legacy monolithic user_index.json to partitioned shards on the fly
async function migrateLegacyIndexToSharded(
  token: string,
  chatId: string,
  legacyIndex: UserIndex,
  pinnedMessageId: number | null
): Promise<MasterIndex> {
  console.log(`[Sharding Migration] Migrating legacy user index containing ${legacyIndex.users.length} users...`);
  
  const master: MasterIndex = {
    isMaster: true,
    shards: {},
    userIdMap: {},
    lastUpdated: Date.now()
  };

  // Group users by shard key
  const groups: Record<string, UserIndexEntry[]> = {};
  for (const user of legacyIndex.users) {
    const key = getShardKey(user.username);
    if (!groups[key]) groups[key] = [];
    groups[key].push(user);
    master.userIdMap[user.userId] = key;
  }

  // Upload each shard file to Telegram
  for (const [key, users] of Object.entries(groups)) {
    const filename = `${key}.json`;
    const content = JSON.stringify({ users, lastUpdated: Date.now() }, null, 2);
    
    console.log(`[Sharding Migration] Uploading shard file ${filename} containing ${users.length} users...`);
    const { messageId, fileId } = await uploadTelegramFile(token, chatId, filename, content);
    
    master.shards[key] = {
      messageId,
      fileId,
      lastUpdated: Date.now()
    };

    // Cache the shard in memory
    cachedShards.set(key, {
      users,
      lastUpdated: Date.now(),
      timestamp: Date.now()
    });
  }

  // Upload and pin the master index
  const masterContent = JSON.stringify(master, null, 2);
  const masterFilename = "user_index.json"; // Overwrite the same pinned file to keep it completely transparent

  console.log(`[Sharding Migration] Uploading and pinning new Master Index...`);
  let finalMessageId: number | null = null;
  if (pinnedMessageId) {
    try {
      const { messageId } = await updateTelegramFile(token, chatId, pinnedMessageId, masterFilename, masterContent);
      finalMessageId = messageId;
    } catch (err) {
      console.warn(`[Sharding Migration] Failed to edit existing pinned message, uploading new one:`, err);
    }
  }

  if (!finalMessageId) {
    const { messageId } = await uploadTelegramFile(token, chatId, masterFilename, masterContent);
    finalMessageId = messageId;
    
    // Pin it
    await telegramRequest(token, `pinChatMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: finalMessageId,
        disable_notification: true
      })
    });

    // Delete old pinned message if different
    if (pinnedMessageId && pinnedMessageId !== finalMessageId) {
      try {
        await telegramRequest(token, `deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: pinnedMessageId })
        });
      } catch (e) {
        console.warn("[Sharding Migration] Failed to delete old pinned message:", e);
      }
    }
  }

  cachedMaster = {
    master,
    pinnedMessageId: finalMessageId,
    timestamp: Date.now()
  };

  console.log(`[Sharding Migration] Sharded indexing migration successfully completed!`);
  return master;
}

// Fetch user index from Telegram pinned message (utilizes memory caching for high performance)
export async function fetchUserIndex(
  token: string,
  chatId: string,
  forceFresh = false,
  options?: { username?: string; userId?: string }
): Promise<{ index: UserIndex; pinnedMessageId: number | null }> {
  // 1. Load or fetch Master Index
  let master: MasterIndex;
  let masterPinnedMessageId: number | null = null;

  if (!forceFresh && cachedMaster && (Date.now() - cachedMaster.timestamp < INDEX_CACHE_TTL)) {
    master = cachedMaster.master;
    masterPinnedMessageId = cachedMaster.pinnedMessageId;
  } else {
    const config = getTelegramConfig();
    const targetAuthChatId = config.authChannelId;
    const targetStorageChatId = config.storageChannelId;

    try {
      const chatInfo = await telegramRequest(token, `getChat?chat_id=${targetAuthChatId}`);
      if (!chatInfo.ok || !chatInfo.result) {
        throw new Error("Failed to fetch chat details");
      }

      let pinnedMessage = chatInfo.result.pinned_message;

      // Index Migration fallback: if no pinned index exists in targetAuthChatId but exists in targetStorageChatId
      if ((!pinnedMessage || !pinnedMessage.document) && targetAuthChatId !== targetStorageChatId) {
        console.log(`[Index Migration] Pinned index not found in Authentication Channel (${targetAuthChatId}). Checking old Storage Channel (${targetStorageChatId}) for migration...`);
        try {
          const oldChatInfo = await telegramRequest(token, `getChat?chat_id=${targetStorageChatId}`);
          const oldPinnedMessage = oldChatInfo.result?.pinned_message;
          if (oldPinnedMessage && oldPinnedMessage.document) {
            console.log(`[Index Migration] Found existing index in Storage Channel (Message ID: ${oldPinnedMessage.message_id}). Performing transparent migration...`);
            const oldFileId = oldPinnedMessage.document.file_id;
            const oldFilePath = await getTelegramFilePath(token, oldFileId);
            const oldContent = await downloadTelegramFile(token, oldFilePath);
            const parsedIndex = JSON.parse(oldContent) as UserIndex;

            // Save and pin inside the new targetAuthChatId as master index
            master = await migrateLegacyIndexToSharded(token, targetAuthChatId, parsedIndex, null);
            masterPinnedMessageId = cachedMaster?.pinnedMessageId || null;

            // Try to unpin from old storage channel to keep it clean
            try {
              await telegramRequest(token, `unpinChatMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: targetStorageChatId,
                  message_id: oldPinnedMessage.message_id,
                }),
              });
              console.log(`[Index Migration] Successfully unpinned old index from Storage Channel`);
            } catch (unpinErr) {
              console.warn(`[Index Migration] Failed to unpin old index from Storage Channel:`, unpinErr);
            }
          } else {
            throw new Error("No pinned message in old Storage Channel either");
          }
        } catch (migrationErr: any) {
          console.error(`[Index Migration] Error during index migration:`, migrationErr);
          const emptyMaster: MasterIndex = {
            isMaster: true,
            shards: {},
            userIdMap: {},
            lastUpdated: Date.now()
          };
          master = emptyMaster;
        }
      } else if (!pinnedMessage || !pinnedMessage.document) {
        // Return empty master index if no pinned document exists
        const emptyMaster: MasterIndex = {
          isMaster: true,
          shards: {},
          userIdMap: {},
          lastUpdated: Date.now()
        };
        cachedMaster = { master: emptyMaster, pinnedMessageId: null, timestamp: Date.now() };
        return {
          index: { users: [], lastUpdated: Date.now() },
          pinnedMessageId: null
        };
      } else {
        const fileId = pinnedMessage.document.file_id;
        const filePath = await getTelegramFilePath(token, fileId);
        const content = await downloadTelegramFile(token, filePath);
        const parsed = JSON.parse(content);

        if (parsed && !parsed.isMaster) {
          // Legacy monolithic index found! Migrate it to sharded on the fly
          master = await migrateLegacyIndexToSharded(token, targetAuthChatId, parsed as UserIndex, pinnedMessage.message_id);
          masterPinnedMessageId = cachedMaster?.pinnedMessageId || pinnedMessage.message_id;
        } else {
          master = parsed as MasterIndex;
          masterPinnedMessageId = pinnedMessage.message_id;
          cachedMaster = { master, pinnedMessageId: masterPinnedMessageId, timestamp: Date.now() };
        }
      }
    } catch (err) {
      console.warn("Could not retrieve master index, initializing empty sharded database:", err);
      const emptyMaster: MasterIndex = {
        isMaster: true,
        shards: {},
        userIdMap: {},
        lastUpdated: Date.now()
      };
      cachedMaster = { master: emptyMaster, pinnedMessageId: null, timestamp: Date.now() };
      return {
        index: { users: [], lastUpdated: Date.now() },
        pinnedMessageId: null
      };
    }
  }

  // 2. Resolve Shard Key based on username or userId
  let shardKey: string | null = null;
  if (options?.username) {
    shardKey = getShardKey(options.username);
  } else if (options?.userId) {
    shardKey = master.userIdMap[options.userId] || null;
  }

  // Helper to fetch users for a specific shard
  const fetchShardUsers = async (key: string): Promise<UserIndexEntry[]> => {
    // Check shard cache
    if (!forceFresh) {
      const cached = cachedShards.get(key);
      if (cached && (Date.now() - cached.timestamp < INDEX_CACHE_TTL)) {
        return cached.users;
      }
    }

    const shardInfo = master.shards[key];
    if (!shardInfo) {
      return [];
    }

    try {
      const filePath = await getTelegramFilePath(token, shardInfo.fileId);
      const content = await downloadTelegramFile(token, filePath);
      const parsed = JSON.parse(content) as ShardUserIndex;
      
      // Backward-compatibility mapping of old fields to clean storage schema inside shard
      if (parsed && Array.isArray(parsed.users)) {
        parsed.users = parsed.users.map((u: any) => {
          if (u.messageId !== undefined && u.authMessageId === undefined) u.authMessageId = u.messageId;
          if (u.fileId !== undefined && u.authFileId === undefined) u.authFileId = u.fileId;
          if (u.lastUpdated !== undefined) {
            if (u.authLastUpdated === undefined) u.authLastUpdated = u.lastUpdated;
            if (u.progressLastUpdated === undefined) u.progressLastUpdated = u.lastUpdated;
          }
          delete u.messageId;
          delete u.fileId;
          delete u.lastUpdated;
          return u;
        });
      }

      const usersList = parsed.users || [];
      cachedShards.set(key, {
        users: usersList,
        lastUpdated: parsed.lastUpdated || Date.now(),
        timestamp: Date.now()
      });

      return usersList;
    } catch (err) {
      console.warn(`Failed to fetch shard ${key}, returning empty:`, err);
      return [];
    }
  };

  // 3. Return users list
  if (shardKey) {
    // Optimized flow: fetch and return ONLY the requested shard
    console.log(`[Sharded Indexing] Fetching only shard: ${shardKey}`);
    const users = await fetchShardUsers(shardKey);
    return {
      index: {
        users,
        lastUpdated: master.lastUpdated,
        shardKey
      },
      pinnedMessageId: masterPinnedMessageId
    };
  } else {
    // Fallback flow: fetch ALL non-empty shards in parallel and merge them
    console.log(`[Sharded Indexing] Fetching ALL shards in parallel (legacy transparent fallback)`);
    const shardKeys = Object.keys(master.shards);
    const allUsersArrays = await Promise.all(shardKeys.map(key => fetchShardUsers(key)));
    const mergedUsers = allUsersArrays.flat();
    return {
      index: {
        users: mergedUsers,
        lastUpdated: master.lastUpdated
      },
      pinnedMessageId: masterPinnedMessageId
    };
  }
}

// Edit an existing message's document media on Telegram
export async function updateTelegramFile(
  token: string,
  chatId: string,
  messageId: number,
  filename: string,
  content: string,
  caption?: string
): Promise<{ messageId: number; fileId: string }> {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("message_id", String(messageId));

  const mediaObject: any = {
    type: "document",
    media: "attach://docfile"
  };
  if (caption) {
    mediaObject.caption = caption;
  }
  formData.append("media", JSON.stringify(mediaObject));

  const blob = new Blob([content], { type: "application/json" });
  formData.append("docfile", blob, filename);

  const response = await fetch(`https://api.telegram.org/bot${token}/editMessageMedia`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to update file on Telegram: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  if (!data.ok || !data.result?.document?.file_id) {
    throw new Error("Telegram editMessageMedia succeeded but document file ID was missing from response");
  }

  return {
    messageId: data.result.message_id,
    fileId: data.result.document.file_id,
  };
}

// Save user index, updating the appropriate shard and Master Index
export async function saveUserIndex(
  token: string,
  chatId: string,
  index: UserIndex,
  pinnedMessageId: number | null
): Promise<number> {
  const config = getTelegramConfig();
  const targetAuthChatId = config.authChannelId; // Always save index to Authentication Channel

  // 1. Get current Master Index from cache or fetch fresh
  let master: MasterIndex;
  if (cachedMaster) {
    master = cachedMaster.master;
  } else {
    // If no cache, perform a fallback fetch to initialize or retrieve master
    const fetched = await fetchUserIndex(token, chatId, true);
    if (cachedMaster) {
      master = cachedMaster.master;
    } else {
      master = {
        isMaster: true,
        shards: {},
        userIdMap: {},
        lastUpdated: Date.now()
      };
    }
  }

  // 2. Determine if saving a single optimized shard (using index.shardKey)
  if (index.shardKey) {
    const targetShardKey = index.shardKey;
    console.log(`[Sharded Indexing] Saving optimized shard: ${targetShardKey}`);

    // Check if any user in index.users has changed their shard key (e.g. username rename)
    const usersForThisShard: UserIndexEntry[] = [];
    const usersToMigrate: { user: UserIndexEntry; newShardKey: string }[] = [];

    for (const user of index.users) {
      const actualKey = getShardKey(user.username);
      if (actualKey === targetShardKey) {
        usersForThisShard.push(user);
      } else {
        console.log(`[Sharded Indexing] User ${user.userId} (${user.username}) changed shard key from ${targetShardKey} to ${actualKey}`);
        usersToMigrate.push({ user, newShardKey: actualKey });
      }
    }

    // Update target shard with remaining users
    const filename = `${targetShardKey}.json`;
    const content = JSON.stringify({ users: usersForThisShard, lastUpdated: Date.now() }, null, 2);

    const shardInfo = master.shards[targetShardKey];
    let finalMessageId = shardInfo?.messageId || null;
    let finalFileId = shardInfo?.fileId || null;

    if (finalMessageId) {
      try {
        const updated = await updateTelegramFile(token, targetAuthChatId, finalMessageId, filename, content);
        finalMessageId = updated.messageId;
        finalFileId = updated.fileId;
      } catch (err) {
        finalMessageId = null;
      }
    }
    if (!finalMessageId) {
      const uploaded = await uploadTelegramFile(token, targetAuthChatId, filename, content);
      finalMessageId = uploaded.messageId;
      finalFileId = uploaded.fileId;
    }

    master.shards[targetShardKey] = {
      messageId: finalMessageId,
      fileId: finalFileId!,
      lastUpdated: Date.now()
    };
    cachedShards.set(targetShardKey, {
      users: usersForThisShard,
      lastUpdated: Date.now(),
      timestamp: Date.now()
    });

    // Clean up or update master.userIdMap for these users
    for (const user of usersForThisShard) {
      master.userIdMap[user.userId] = targetShardKey;
    }

    // Now, insert the migrated users into their new shards!
    for (const migration of usersToMigrate) {
      const newKey = migration.newShardKey;
      const user = migration.user;

      // Load destination shard
      const { index: destShardVirtual } = await fetchUserIndex(token, chatId, true, { username: user.username });
      // Remove any pre-existing entry with same userId if any
      destShardVirtual.users = destShardVirtual.users.filter(u => u.userId !== user.userId);
      // Push the user entry
      destShardVirtual.users.push(user);

      // Save the dest shard file
      const destFilename = `${newKey}.json`;
      const destContent = JSON.stringify({ users: destShardVirtual.users, lastUpdated: Date.now() }, null, 2);

      const destShardInfo = master.shards[newKey];
      let destMsgId = destShardInfo?.messageId || null;
      let destFileId = destShardInfo?.fileId || null;

      if (destMsgId) {
        try {
          const updated = await updateTelegramFile(token, targetAuthChatId, destMsgId, destFilename, destContent);
          destMsgId = updated.messageId;
          destFileId = updated.fileId;
        } catch (err) {
          destMsgId = null;
        }
      }
      if (!destMsgId) {
        const uploaded = await uploadTelegramFile(token, targetAuthChatId, destFilename, destContent);
        destMsgId = uploaded.messageId;
        destFileId = uploaded.fileId;
      }

      master.shards[newKey] = {
        messageId: destMsgId,
        fileId: destFileId!,
        lastUpdated: Date.now()
      };
      cachedShards.set(newKey, {
        users: destShardVirtual.users,
        lastUpdated: Date.now(),
        timestamp: Date.now()
      });

      master.userIdMap[user.userId] = newKey;
    }
  } else {
    // 3. Fallback flow: saving full monolithic UserIndex (partitioning/sharding all of it)
    console.log(`[Sharded Indexing] Saving full index fallback (partitioning into shards)`);
    const newGroups: Record<string, UserIndexEntry[]> = {};
    const newUserIdMap: Record<string, string> = {};

    for (const user of index.users) {
      const key = getShardKey(user.username);
      if (!newGroups[key]) newGroups[key] = [];
      newGroups[key].push(user);
      newUserIdMap[user.userId] = key;
    }

    const allPossibleShardKeys = new Set([
      ...Object.keys(master.shards),
      ...Object.keys(newGroups)
    ]);

    const shardPromises: Promise<void>[] = [];

    for (const key of allPossibleShardKeys) {
      const newUsers = newGroups[key] || [];
      const cachedUsers = cachedShards.get(key)?.users || [];

      // Compare to determine if the shard actually changed
      const changed =
        newUsers.length !== cachedUsers.length ||
        JSON.stringify(newUsers) !== JSON.stringify(cachedUsers);

      if (changed) {
        const filename = `${key}.json`;
        const content = JSON.stringify({ users: newUsers, lastUpdated: Date.now() }, null, 2);

        shardPromises.push((async () => {
          const shardInfo = master.shards[key];
          let finalMessageId = shardInfo?.messageId || null;
          let finalFileId = shardInfo?.fileId || null;

          if (finalMessageId) {
            try {
              const updated = await updateTelegramFile(token, targetAuthChatId, finalMessageId, filename, content);
              finalMessageId = updated.messageId;
              finalFileId = updated.fileId;
            } catch (err) {
              finalMessageId = null;
            }
          }
          if (!finalMessageId) {
            const uploaded = await uploadTelegramFile(token, targetAuthChatId, filename, content);
            finalMessageId = uploaded.messageId;
            finalFileId = uploaded.fileId;
          }

          master.shards[key] = {
            messageId: finalMessageId,
            fileId: finalFileId!,
            lastUpdated: Date.now()
          };
          cachedShards.set(key, {
            users: newUsers,
            lastUpdated: Date.now(),
            timestamp: Date.now()
          });
        })());
      }
    }

    if (shardPromises.length > 0) {
      await Promise.all(shardPromises);
    }

    master.userIdMap = newUserIdMap;
  }

  // 4. Save and pin Master Index file
  master.lastUpdated = Date.now();
  const masterContent = JSON.stringify(master, null, 2);
  const masterFilename = "user_index.json";

  let finalMasterMessageId = pinnedMessageId;
  let success = false;
  if (pinnedMessageId) {
    let retries = 3;
    let lastError: any = null;
    while (retries > 0 && !success) {
      try {
        const { messageId } = await updateTelegramFile(token, targetAuthChatId, pinnedMessageId, masterFilename, masterContent);
        finalMasterMessageId = messageId;
        success = true;
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || "";
        if (errMsg.includes("message to edit not found") || errMsg.includes("chat not found")) {
          break;
        }
        retries--;
        console.warn(`Failed to edit pinned master index message ${pinnedMessageId} (retries left: ${retries}):`, err);
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
    if (!success) {
      console.warn(`Failed to edit pinned master index message ${pinnedMessageId}, falling back to creating new one. Error:`, lastError);
      finalMasterMessageId = null;
    }
  }

  if (!finalMasterMessageId) {
    const { messageId } = await uploadTelegramFile(token, targetAuthChatId, masterFilename, masterContent);
    finalMasterMessageId = messageId;

    // Pin the new master index
    await telegramRequest(token, `pinChatMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetAuthChatId,
        message_id: finalMasterMessageId,
        disable_notification: true,
      }),
    });

    // Try to delete old pinned master index to avoid group chat clutter
    if (pinnedMessageId && pinnedMessageId !== finalMasterMessageId) {
      try {
        await telegramRequest(token, `deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: targetAuthChatId,
            message_id: pinnedMessageId,
          }),
        });
      } catch (e) {
        console.warn("Failed to delete old pinned master index message:", e);
      }
    }
  }

  // Update master index cache
  cachedMaster = {
    master,
    pinnedMessageId: finalMasterMessageId,
    timestamp: Date.now()
  };

  // Keep compatibility with cachedIndex fallback if needed
  cachedIndex = {
    index: {
      users: index.users,
      lastUpdated: master.lastUpdated,
      shardKey: index.shardKey
    },
    pinnedMessageId: finalMasterMessageId,
    timestamp: Date.now()
  };

  return finalMasterMessageId!;
}

// Fetch master index metadata (utilizes caching for high performance)
export async function getMasterIndexMetadata(token: string, chatId: string): Promise<any> {
  if (cachedMaster) {
    return cachedMaster.master.metadata;
  }
  await fetchUserIndex(token, chatId);
  if (cachedMaster) {
    return cachedMaster.master.metadata;
  }
  return undefined;
}

// Update master index metadata and persist to Telegram
export async function updateMasterIndexMetadata(token: string, chatId: string, metadata: any): Promise<void> {
  const config = getTelegramConfig();
  const targetAuthChatId = config.authChannelId;

  let master: MasterIndex;
  let pinnedMessageId: number | null = null;

  if (cachedMaster) {
    master = cachedMaster.master;
    pinnedMessageId = cachedMaster.pinnedMessageId;
  } else {
    await fetchUserIndex(token, chatId);
    if (cachedMaster) {
      master = cachedMaster.master;
      pinnedMessageId = cachedMaster.pinnedMessageId;
    } else {
      master = {
        isMaster: true,
        shards: {},
        userIdMap: {},
        lastUpdated: Date.now()
      };
    }
  }

  master.metadata = {
    ...(master.metadata || {}),
    ...metadata
  };
  master.lastUpdated = Date.now();

  const filename = "user_index.json";
  const content = JSON.stringify(master, null, 2);

  let finalMasterMessageId = pinnedMessageId;
  if (pinnedMessageId) {
    try {
      const updated = await updateTelegramFile(token, targetAuthChatId, pinnedMessageId, filename, content);
      finalMasterMessageId = updated.messageId;
    } catch (err) {
      finalMasterMessageId = null;
    }
  }

  if (!finalMasterMessageId) {
    const uploaded = await uploadTelegramFile(token, targetAuthChatId, filename, content);
    finalMasterMessageId = uploaded.messageId;

    await telegramRequest(token, `pinChatMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetAuthChatId,
        message_id: finalMasterMessageId,
        disable_notification: true
      })
    });
  }

  cachedMaster = {
    master,
    pinnedMessageId: finalMasterMessageId,
    timestamp: Date.now()
  };
}

// Helper to sanitize filenames to only keep alphanumeric and underscores
export function sanitizeNameForFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_");
}

// Migrate user on the fly from monolithic JSON to split MsgPack documents (Refined to 2-file architecture)
export async function migrateUserToBinarySplit(
  token: string,
  chatId: string,
  userId: string,
  legacyUserJson: UserJson,
  userEntry: UserIndexEntry,
  index: UserIndex,
  pinnedMessageId: number | null
): Promise<void> {
  const safeName = sanitizeNameForFilename(legacyUserJson.fullName);
  
  const authDoc = {
    userId: legacyUserJson.userId,
    fullName: legacyUserJson.fullName,
    username: legacyUserJson.username,
    createdAt: legacyUserJson.createdAt,
    lastUpdated: legacyUserJson.lastUpdated,
    avatarFileId: legacyUserJson.avatarFileId,
    avatarMessageId: legacyUserJson.avatarMessageId,
    avatarUrl: legacyUserJson.avatarUrl,
    sessions: legacyUserJson.sessions || [],
  };

  const progressDoc = {
    userId: legacyUserJson.userId,
    watchData: legacyUserJson.watchData || {},
    unlockedAchievements: legacyUserJson.unlockedAchievements || [],
    preferences: legacyUserJson.preferences || {},
    updates: legacyUserJson.updates || [],
    updatesBuffer: legacyUserJson.updatesBuffer || [],
  };

  const authBuf = Buffer.from(encode(authDoc));
  const progressBuf = Buffer.from(encode(progressDoc));

  const status = userEntry.status || "Active";
  const caption = createUserMetadataCaption(legacyUserJson, status);

  // 1. Upload Auth (Anchor Message)
  const authFileName = `user_${safeName}_auth.msgpack`;
  const { messageId: authMessageId, fileId: authFileId } = await uploadTelegramBinaryFile(
    token,
    chatId,
    authFileName,
    authBuf,
    "application/x-msgpack",
    caption
  );

  // 2. Upload Progress (Reply to Auth - visual grouping link)
  const progressFileName = `user_${safeName}_progress.msgpack`;
  const { messageId: progressMessageId, fileId: progressFileId } = await uploadTelegramBinaryFile(
    token,
    chatId,
    progressFileName,
    progressBuf,
    "application/x-msgpack",
    `🔗 Linked MCU Progress & Updates for ${legacyUserJson.fullName}`,
    authMessageId
  );

  const legacyMessageId = userEntry.authMessageId;

  // Update userEntry pointers
  userEntry.progressMessageId = progressMessageId;
  userEntry.progressFileId = progressFileId;

  // Clean up any legacy 3-file sessions pointer if present
  userEntry.sessionsMessageId = undefined;
  userEntry.sessionsFileId = undefined;

  // Set the primary document pointers to the Auth document
  userEntry.authMessageId = authMessageId;
  userEntry.authFileId = authFileId;
  userEntry.authLastUpdated = Date.now();
  userEntry.progressLastUpdated = Date.now();
  userEntry.avatarFileId = legacyUserJson.avatarFileId;
  userEntry.avatarMessageId = legacyUserJson.avatarMessageId;
  if (legacyUserJson.avatarFileId) {
    userEntry.avatarLastUpdated = Date.now();
  }

  index.lastUpdated = Date.now();

  // Save updated index
  await saveUserIndex(token, chatId, index, pinnedMessageId);

  // Try to delete legacy JSON file message to reduce clutter
  if (legacyMessageId && legacyMessageId !== authMessageId) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: legacyMessageId }),
      });
    } catch (e) {
      console.warn("Failed to delete legacy monolithic user message:", e);
    }
  }
}

// Fetch user JSON file using User ID lookup flow (transparently fetching and merging split binary files)
// Fetch user JSON file using User ID lookup flow (transparently fetching and merging split binary files)
export async function fetchUserFile(
  token: string,
  chatId: string,
  userId: string,
  forceFresh = false
): Promise<UserJson> {
  if (!forceFresh) {
    const cached = userFileCache.get(userId);
    if (cached && (Date.now() - cached.timestamp < USER_CACHE_TTL)) {
      return JSON.parse(JSON.stringify(cached.userJson)) as UserJson; // Return deep clone to prevent mutations
    }
  }

  const { index, pinnedMessageId } = await fetchUserIndex(token, chatId, forceFresh);
  const userEntry = index.users.find(u => u.userId === userId);
  if (!userEntry) {
    throw new Error("User not found in index");
  }

  // 1. Check if user is using legacy storage format (defined by absence of progressFileId)
  if (!userEntry.progressFileId) {
    console.log(`[Migration] User ${userId} is on legacy monolithic JSON storage. Running migration...`);
    const filePath = await getTelegramFilePath(token, userEntry.authFileId);
    const content = await downloadTelegramFile(token, filePath);
    const legacyUserJson = JSON.parse(content) as UserJson;

    await migrateUserToBinarySplit(token, chatId, userId, legacyUserJson, userEntry, index, pinnedMessageId);

    // Cache copy of legacyUserJson
    userFileCache.set(userId, {
      userJson: JSON.parse(JSON.stringify(legacyUserJson)),
      timestamp: Date.now()
    });

    return legacyUserJson;
  }

  // 2. Fetch and decode split msgpack files in parallel (handles both old 3-file and new 2-file architecture seamlessly)
  const fetchTasks = [
    (async () => {
      // authFileId is the anchor message pointing to the Auth document
      const path = await getTelegramFilePath(token, userEntry.authFileId);
      const buf = await downloadTelegramFileBinary(token, path);
      return decode(buf) as any;
    })(),
    (async () => {
      // Compatibility fallback: if they migrated in the 3-file system phase and have sessionsFileId
      if (!userEntry.sessionsFileId) return null;
      try {
        const path = await getTelegramFilePath(token, userEntry.sessionsFileId);
        const buf = await downloadTelegramFileBinary(token, path);
        return decode(buf) as any;
      } catch (err) {
        console.warn(`Failed to retrieve legacy 3-file sessions document for ${userId}, skipping:`, err);
        return null;
      }
    })(),
    (async () => {
      if (!userEntry.progressFileId) return { watchData: {}, unlockedAchievements: [], preferences: {}, updates: [] };
      const path = await getTelegramFilePath(token, userEntry.progressFileId);
      const buf = await downloadTelegramFileBinary(token, path);
      return decode(buf) as any;
    })()
  ];

  const [authDoc, sessionsDoc, progressDoc] = await Promise.all(fetchTasks);

  // Re-assemble back to a virtual UserJson for transparent compatibility
  const userJson: UserJson = {
    userId: authDoc.userId || userId,
    fullName: authDoc.fullName || userEntry.fullName,
    username: authDoc.username || userEntry.username,
    createdAt: authDoc.createdAt || userEntry.createdAt,
    lastUpdated: authDoc.lastUpdated || userEntry.authLastUpdated,
    avatarFileId: authDoc.avatarFileId,
    avatarMessageId: authDoc.avatarMessageId,
    avatarUrl: authDoc.avatarUrl,
    
    // In 2-file architecture sessions reside in authDoc. In 3-file it was sessionsDoc.sessions
    sessions: authDoc.sessions || (sessionsDoc ? sessionsDoc.sessions : []) || [],
    
    // In 2-file architecture timeline updates reside in progressDoc. In 3-file it was sessionsDoc.updates
    updates: progressDoc.updates || (sessionsDoc ? sessionsDoc.updates : []) || [],
    updatesBuffer: progressDoc.updatesBuffer || [],
    
    watchData: progressDoc.watchData || {},
    unlockedAchievements: progressDoc.unlockedAchievements || [],
    preferences: progressDoc.preferences || {},
    archiveFileId: userEntry.archiveFileId,
  };

  // Compute or synchronize totalLogCount
  const currentLogsCount = (userJson.updates?.length || 0) + (userJson.updatesBuffer?.length || 0);
  if (typeof progressDoc.totalLogCount === "number") {
    userJson.totalLogCount = progressDoc.totalLogCount;
  } else if (typeof userEntry.totalLogCount === "number") {
    userJson.totalLogCount = userEntry.totalLogCount;
  } else if (userEntry.archiveFileId) {
    userJson.totalLogCount = Math.max(currentLogsCount, 500);
  } else {
    userJson.totalLogCount = currentLogsCount;
  }

  // Auto-expire sessions older than 7 days
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  if (userJson.sessions) {
    userJson.sessions = userJson.sessions.map((s: any) => {
      if (s.status === "Active" && s.startedAt + sevenDaysMs < nowMs) {
        return {
          ...s,
          status: "Expired",
          endedAt: s.startedAt + sevenDaysMs,
          durationSeconds: Math.round(sevenDaysMs / 1000)
        };
      }
      return s;
    });
  }

  // Cache a deep copy of the loaded user JSON
  userFileCache.set(userId, {
    userJson: JSON.parse(JSON.stringify(userJson)),
    timestamp: Date.now()
  });

  return userJson;
}

// Format timestamps to Indian Standard Time (IST) for consistent metadata logging
export function formatToIndianDateTime(timestamp: number | string | Date): string {
  if (!timestamp) return "N/A";
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

  return `${partMap.day} ${partMap.month.toUpperCase()} ${partMap.year} ${partMap.hour}:${partMap.minute}:${partMap.second}`;
}

// Generate synchronized human-readable metadata caption for Telegram messages
export function createUserMetadataCaption(user: UserJson, status: string = "Active"): string {
  const lastUpdatedIst = formatToIndianDateTime(user.lastUpdated || Date.now());
  const createdAtIst = formatToIndianDateTime(user.createdAt || user.lastUpdated || Date.now());

  return `👤 MCU Tracker User Metadata:\n` +
    `- Full Name: ${user.fullName || "N/A"}\n` +
    `- Username: ${user.username || "N/A"}\n` +
    `- User ID: ${user.userId || "N/A"}\n` +
    `- Created At: ${createdAtIst}\n` +
    `- Last Updated At: ${lastUpdatedIst}\n` +
    `- Account Status: ${status}`;
}

// Register a brand new user with two split MessagePack binary documents (Auth + Progress)
export async function registerUser(
  token: string,
  chatId: string,
  userJson: UserJson,
  passwordHash: string,
  salt: string,
  index: UserIndex,
  pinnedMessageId: number | null
): Promise<UserIndexEntry> {
  const safeName = sanitizeNameForFilename(userJson.fullName);

  const authDoc = {
    userId: userJson.userId,
    fullName: userJson.fullName,
    username: userJson.username,
    createdAt: userJson.createdAt,
    lastUpdated: userJson.lastUpdated,
    sessions: userJson.sessions || [],
  };

  const progressDoc = {
    userId: userJson.userId,
    watchData: userJson.watchData || {},
    unlockedAchievements: userJson.unlockedAchievements || [],
    preferences: userJson.preferences || {},
    updates: userJson.updates || [],
    updatesBuffer: userJson.updatesBuffer || [],
    totalLogCount: userJson.totalLogCount || (userJson.updates?.length || 0) + (userJson.updatesBuffer?.length || 0),
  };

  const authBuf = Buffer.from(encode(authDoc));
  const progressBuf = Buffer.from(encode(progressDoc));

  const caption = createUserMetadataCaption(userJson, "Active");

  // 1. Upload Auth (anchor message)
  const authFileName = `user_${safeName}_auth.msgpack`;
  const { messageId: authMessageId, fileId: authFileId } = await uploadTelegramBinaryFile(
    token,
    chatId,
    authFileName,
    authBuf,
    "application/x-msgpack",
    caption
  );

  // 2. Upload Progress (replying to Auth - visual grouping)
  const progressFileName = `user_${safeName}_progress.msgpack`;
  const { messageId: progressMessageId, fileId: progressFileId } = await uploadTelegramBinaryFile(
    token,
    chatId,
    progressFileName,
    progressBuf,
    "application/x-msgpack",
    `🔗 Linked MCU Progress & Updates for ${userJson.fullName}`,
    authMessageId
  );

  const newUserEntry: UserIndexEntry = {
    userId: userJson.userId,
    fullName: userJson.fullName,
    username: userJson.username,
    authMessageId,
    authFileId,
    createdAt: userJson.createdAt,
    authLastUpdated: userJson.lastUpdated,
    progressLastUpdated: userJson.lastUpdated,
    status: "Active",
    passwordHash,
    salt,
    progressMessageId,
    progressFileId,
  };

  index.users.push(newUserEntry);
  index.lastUpdated = Date.now();

  // Cache the registered user to avoid unnecessary fetch immediately after registration
  userFileCache.set(userJson.userId, {
    userJson: JSON.parse(JSON.stringify(userJson)),
    timestamp: Date.now()
  });

  await saveUserIndex(token, chatId, index, pinnedMessageId);
  return newUserEntry;
}

// Update user file and index (utilizing parallel partial updates for modified documents)
export async function updateUserFileAndIndex(
  token: string,
  chatId: string,
  userId: string,
  updatedUserJson: UserJson
): Promise<void> {
  const { index, pinnedMessageId } = await fetchUserIndex(token, chatId, true);
  const userEntryIndex = index.users.findIndex(u => u.userId === userId);
  if (userEntryIndex === -1) {
    throw new Error("User not found in index for update");
  }

  const userEntry = index.users[userEntryIndex];

  // If user is on legacy monolithic JSON storage, run on-the-fly migration
  if (!userEntry.progressFileId) {
    console.log(`[Migration] User ${userId} is on legacy monolithic JSON storage. Performing transparent migration during update...`);
    await migrateUserToBinarySplit(token, chatId, userId, updatedUserJson, userEntry, index, pinnedMessageId);
    // Also update our cache
    userFileCache.set(userId, {
      userJson: JSON.parse(JSON.stringify(updatedUserJson)),
      timestamp: Date.now()
    });
    return;
  }

  // Fetch current database state to perform a surgical partial update comparison
  let oldUserJson: UserJson;
  try {
    oldUserJson = await fetchUserFile(token, chatId, userId, true);
  } catch (err) {
    console.warn("Failed to fetch old user file for change detection, updating all:", err);
    oldUserJson = {
      userId,
      fullName: "",
      username: "",
      createdAt: 0,
      lastUpdated: 0,
      sessions: [],
    };
  }

  const safeName = sanitizeNameForFilename(updatedUserJson.fullName);

  // 0. Updates Buffer Archival and Flushing Algorithm
  let archiveUpdated = false;
  if (updatedUserJson.updatesBuffer && updatedUserJson.updatesBuffer.length >= 500) {
    console.log(`[Archiving] User ${userId} has accumulated ${updatedUserJson.updatesBuffer.length} buffer entries. Archiving old logs...`);
    try {
      let archivedUpdates: UpdateLog[] = [];
      
      // 1. Get existing archive from cache or download it
      if (userEntry.archiveFileId) {
        const cached = backendArchiveCache.get(userId);
        if (cached && cached.archiveFileId === userEntry.archiveFileId) {
          console.log(`[Archiving] Cache hit for existing archive of user ${userId}. Appending buffer updates.`);
          archivedUpdates = cached.updates;
        } else {
          try {
            const archivePath = await getTelegramFilePath(token, userEntry.archiveFileId);
            const archiveBuf = await downloadTelegramFileBinary(token, archivePath);
            const archiveDoc = decode(archiveBuf) as { userId: string; updates: UpdateLog[] };
            if (archiveDoc && Array.isArray(archiveDoc.updates)) {
              archivedUpdates = archiveDoc.updates;
            }
          } catch (downloadErr) {
            console.warn(`[Archiving] Failed to download existing archive for ${userId}, starting fresh archive:`, downloadErr);
          }
        }
      }
      
      // 2. Prepend the new buffer updates (reverse-chronological newest first)
      archivedUpdates = [...updatedUserJson.updatesBuffer, ...archivedUpdates];
      
      // 3. Keep at most 10,000 entries (user limit)
      if (archivedUpdates.length > 10000) {
        archivedUpdates = archivedUpdates.slice(0, 10000);
      }
      
      // 4. Encode and upload/update archive document
      const archiveDocPayload = {
        userId,
        updates: archivedUpdates
      };
      const archiveBuf = Buffer.from(encode(archiveDocPayload));
      const archiveFileName = `user_${safeName}_archive.msgpack`;
      
      let archiveMessageId = userEntry.archiveMessageId;
      let archiveFileId = userEntry.archiveFileId;
      
      if (archiveMessageId) {
        try {
          const updated = await updateTelegramBinaryFile(
            token,
            chatId,
            archiveMessageId,
            archiveFileName,
            archiveBuf,
            "application/x-msgpack",
            `📦 Linked MCU Updates Archive for ${updatedUserJson.fullName}`
          );
          archiveMessageId = updated.messageId;
          archiveFileId = updated.fileId;
        } catch (updateErr) {
          console.warn(`[Archiving] Failed to update existing archive message ${archiveMessageId}, doing fresh upload:`, updateErr);
          archiveMessageId = undefined;
        }
      }
      
      if (!archiveMessageId) {
        const uploaded = await uploadTelegramBinaryFile(
          token,
          chatId,
          archiveFileName,
          archiveBuf,
          "application/x-msgpack",
          `📦 Linked MCU Updates Archive for ${updatedUserJson.fullName}`,
          userEntry.authMessageId // Linked to primary auth message!
        );
        archiveMessageId = uploaded.messageId;
        archiveFileId = uploaded.fileId;
      }
      
      // 5. Update index pointers
      userEntry.archiveMessageId = archiveMessageId;
      userEntry.archiveFileId = archiveFileId;
      userEntry.archiveLastUpdated = Date.now();

      // Update server cache with the newly synchronized archive!
      if (archiveFileId) {
        backendArchiveCache.set(userId, {
          archiveFileId,
          updates: archivedUpdates
        });
      }
      
      // 6. Clear buffer and record exact total log count
      updatedUserJson.updatesBuffer = [];
      updatedUserJson.totalLogCount = (updatedUserJson.updates?.length || 0) + archivedUpdates.length;
      userEntry.totalLogCount = updatedUserJson.totalLogCount;
      updatedUserJson.archiveFileId = archiveFileId;
      archiveUpdated = true;
      console.log(`[Archiving] Successfully archived updates for ${userId}. Archive entries count: ${archivedUpdates.length}.`);
    } catch (archiveErr) {
      console.error(`[Archiving] Critical error flushing updates buffer for user ${userId}:`, archiveErr);
    }
  }

  // Check which specific documents actually changed
  // Auth document contains user profile metadata AND sessions
  const authChanged = 
    oldUserJson.fullName !== updatedUserJson.fullName ||
    oldUserJson.username !== updatedUserJson.username ||
    oldUserJson.avatarFileId !== updatedUserJson.avatarFileId ||
    oldUserJson.avatarMessageId !== updatedUserJson.avatarMessageId ||
    oldUserJson.avatarUrl !== updatedUserJson.avatarUrl ||
    JSON.stringify(oldUserJson.sessions) !== JSON.stringify(updatedUserJson.sessions);

  // Progress document contains watch trackers, achievements, preferences, AND timeline updates ledger
  const progressChanged = 
    JSON.stringify(oldUserJson.watchData) !== JSON.stringify(updatedUserJson.watchData) ||
    JSON.stringify(oldUserJson.unlockedAchievements) !== JSON.stringify(updatedUserJson.unlockedAchievements) ||
    JSON.stringify(oldUserJson.preferences) !== JSON.stringify(updatedUserJson.preferences) ||
    JSON.stringify(oldUserJson.updates) !== JSON.stringify(updatedUserJson.updates) ||
    JSON.stringify(oldUserJson.updatesBuffer) !== JSON.stringify(updatedUserJson.updatesBuffer);

  const updatePromises: Promise<any>[] = [];

  // 1. Auth Document Update
  if (authChanged) {
    const authDoc = {
      userId: updatedUserJson.userId,
      fullName: updatedUserJson.fullName,
      username: updatedUserJson.username,
      createdAt: updatedUserJson.createdAt,
      lastUpdated: updatedUserJson.lastUpdated,
      avatarFileId: updatedUserJson.avatarFileId,
      avatarMessageId: updatedUserJson.avatarMessageId,
      avatarUrl: updatedUserJson.avatarUrl,
      sessions: updatedUserJson.sessions || [],
    };
    const authBuf = Buffer.from(encode(authDoc));
    const caption = createUserMetadataCaption(updatedUserJson, userEntry.status || "Active");
    const authFileName = `user_${safeName}_auth.msgpack`;

    updatePromises.push((async () => {
      const updated = await updateTelegramBinaryFile(
        token,
        chatId,
        userEntry.authMessageId,
        authFileName,
        authBuf,
        "application/x-msgpack",
        caption
      );
      userEntry.authFileId = updated.fileId;
      userEntry.authMessageId = updated.messageId;
    })());
  }

  // 2. Progress Document Update
  if (progressChanged) {
    const progressDoc = {
      userId: updatedUserJson.userId,
      watchData: updatedUserJson.watchData || {},
      unlockedAchievements: updatedUserJson.unlockedAchievements || [],
      preferences: updatedUserJson.preferences || {},
      updates: updatedUserJson.updates || [],
      updatesBuffer: updatedUserJson.updatesBuffer || [],
      totalLogCount: updatedUserJson.totalLogCount || (updatedUserJson.updates?.length || 0) + (updatedUserJson.updatesBuffer?.length || 0),
    };
    const progressBuf = Buffer.from(encode(progressDoc));
    const progressFileName = `user_${safeName}_progress.msgpack`;

    updatePromises.push((async () => {
      if (userEntry.progressMessageId) {
        const updated = await updateTelegramBinaryFile(
          token,
          chatId,
          userEntry.progressMessageId,
          progressFileName,
          progressBuf,
          "application/x-msgpack",
          `🔗 Linked MCU Progress & Updates for ${updatedUserJson.fullName}`
        );
        userEntry.progressFileId = updated.fileId;
        userEntry.progressMessageId = updated.messageId;
      } else {
        const uploaded = await uploadTelegramBinaryFile(
          token,
          chatId,
          progressFileName,
          progressBuf,
          "application/x-msgpack",
          `🔗 Linked MCU Progress & Updates for ${updatedUserJson.fullName}`,
          userEntry.authMessageId
        );
        userEntry.progressFileId = uploaded.fileId;
        userEntry.progressMessageId = uploaded.messageId;
      }
    })());
  }

  // 3. Clean up any leftover old 3-file sessions message to keep Telegram channel pristine
  if (userEntry.sessionsMessageId) {
    const oldSessionsMsgId = userEntry.sessionsMessageId;
    updatePromises.push((async () => {
      try {
        await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: oldSessionsMsgId }),
        });
      } catch (e) {
        console.warn("Failed to delete legacy separate sessions message:", e);
      }
      userEntry.sessionsMessageId = undefined;
      userEntry.sessionsFileId = undefined;
    })());
  }

  // Execute updates in parallel
  if (updatePromises.length > 0 || archiveUpdated) {
    await Promise.all(updatePromises);

    userEntry.fullName = updatedUserJson.fullName || userEntry.fullName;
    userEntry.username = updatedUserJson.username || userEntry.username;
    userEntry.avatarFileId = updatedUserJson.avatarFileId;
    userEntry.avatarMessageId = updatedUserJson.avatarMessageId;
    userEntry.totalLogCount = updatedUserJson.totalLogCount || (updatedUserJson.updates?.length || 0) + (updatedUserJson.updatesBuffer?.length || 0);
    if (updatedUserJson.avatarFileId) {
      userEntry.avatarLastUpdated = updatedUserJson.lastUpdated || Date.now();
    } else {
      userEntry.avatarLastUpdated = undefined;
    }
    if (authChanged) {
      userEntry.authLastUpdated = Date.now();
    }
    if (progressChanged || archiveUpdated) {
      userEntry.progressLastUpdated = Date.now();
    }
    index.lastUpdated = Date.now();

    await saveUserIndex(token, chatId, index, pinnedMessageId);
    console.log(`[Partial Update] Refined 2-File architecture successfully updated ${updatePromises.length} modified streams.`);
  } else {
    console.log(`[Partial Update] Skipped update for user ${userId} since no document payloads were modified.`);
  }

  // Ensure the local cache is also fully updated and kept completely fresh
  userFileCache.set(userId, {
    userJson: JSON.parse(JSON.stringify(updatedUserJson)),
    timestamp: Date.now()
  });
}

// Download binary file helper
export async function downloadTelegramFileBinary(token: string, filePath: string): Promise<Buffer> {
  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download binary file from Telegram: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Upload binary file helper (with reply_parameters grouping linkage support)
export async function uploadTelegramBinaryFile(
  token: string,
  chatId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
  caption?: string,
  replyToMessageId?: number
): Promise<{ messageId: number; fileId: string }> {
  const formData = new FormData();
  formData.append("chat_id", chatId);

  const blob = new Blob([buffer], { type: mimeType });
  formData.append("document", blob, filename);

  if (caption) {
    formData.append("caption", caption);
  }

  if (replyToMessageId) {
    formData.append("reply_parameters", JSON.stringify({ message_id: replyToMessageId }));
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to upload binary file to Telegram: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  if (!data.ok || !data.result?.document?.file_id) {
    throw new Error("Telegram binary upload succeeded but document file ID was missing from response");
  }

  return {
    messageId: data.result.message_id,
    fileId: data.result.document.file_id,
  };
}

// Edit/replace an existing message's document media with binary data on Telegram
export async function updateTelegramBinaryFile(
  token: string,
  chatId: string,
  messageId: number,
  filename: string,
  buffer: Buffer,
  mimeType: string,
  caption?: string
): Promise<{ messageId: number; fileId: string }> {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("message_id", String(messageId));

  const mediaObject: any = {
    type: "document",
    media: "attach://docfile"
  };
  if (caption) {
    mediaObject.caption = caption;
  }
  formData.append("media", JSON.stringify(mediaObject));

  const blob = new Blob([buffer], { type: mimeType });
  formData.append("docfile", blob, filename);

  const response = await fetch(`https://api.telegram.org/bot${token}/editMessageMedia`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to update binary file on Telegram: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  if (!data.ok || !data.result?.document?.file_id) {
    throw new Error("Telegram editMessageMedia succeeded but document file ID was missing from response");
  }

  return {
    messageId: data.result.message_id,
    fileId: data.result.document.file_id,
  };
}

interface CachedArchive {
  archiveFileId: string;
  updates: UpdateLog[];
}
const backendArchiveCache = new Map<string, CachedArchive>();

// Fetch user's archived updates from private Telegram Storage
export async function fetchUserArchive(
  token: string,
  chatId: string,
  userId: string
): Promise<UpdateLog[]> {
  const { index } = await fetchUserIndex(token, chatId, false, { userId });
  const userEntry = index.users.find(u => u.userId === userId);
  if (!userEntry || !userEntry.archiveFileId) {
    return [];
  }

  // Try server cache first
  const cached = backendArchiveCache.get(userId);
  if (cached && cached.archiveFileId === userEntry.archiveFileId) {
    console.log(`[Archive Cache] Cache hit for user ${userId}, archiveFileId: ${userEntry.archiveFileId}`);
    return cached.updates;
  }

  try {
    const path = await getTelegramFilePath(token, userEntry.archiveFileId);
    const buf = await downloadTelegramFileBinary(token, path);
    const archiveDoc = decode(buf) as { userId: string; updates: UpdateLog[] };
    const updates = archiveDoc?.updates || [];

    // Save to server cache
    backendArchiveCache.set(userId, {
      archiveFileId: userEntry.archiveFileId,
      updates
    });

    return updates;
  } catch (err) {
    console.error(`Failed to fetch archive for ${userId}:`, err);
    return [];
  }
}


