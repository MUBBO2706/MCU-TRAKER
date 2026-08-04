import { getTelegramConfig, uploadTelegramFile, getTelegramFilePath, downloadTelegramFile, updateTelegramFile, getMasterIndexMetadata, updateMasterIndexMetadata } from './Database.js';

const CENTRAL_MAPPER_URL = 'https://ceaznet.vercel.app/api/device-mapper';
const DEVICE_MAPPINGS_FILENAME = 'device_mappings.json';
const GITHUB_DEVICES_URL = 'https://raw.githubusercontent.com/androidtrackers/certified-android-devices/master/by_model.json';

let localMappingsCache: Record<string, string> | null = null;
let telegramMessageId: number | null = null;
let telegramFileId: string | null = null;
let githubDataCache: Record<string, any> | null = null;

export async function resolveDeviceName(model: string): Promise<string | null> {
  if (!model || typeof model !== 'string') return null;

  const cleanModel = model.trim();
  if (
    cleanModel === 'Unknown Device' ||
    cleanModel === 'Unknown' ||
    cleanModel === 'K' ||
    cleanModel === 'Android Device' ||
    cleanModel === 'Android' ||
    cleanModel === 'Mobile Device'
  ) {
    return null;
  }

  // 1. Try Centralized Device Resolver API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second safety timeout

    const response = await fetch(CENTRAL_MAPPER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-origin': process.env.APP_DOMAIN || 'mcu-tracker.vercel.app',
      },
      body: JSON.stringify({
        model: cleanModel,
        domain: process.env.APP_DOMAIN || 'mcu-tracker.vercel.app',
        skipCache: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.name === 'string' && data.name.trim().length > 0) {
        const resolved = data.name.trim();
        if (
          resolved !== 'Unknown Device' &&
          resolved !== 'Unknown' &&
          resolved !== 'Android Device'
        ) {
          return resolved;
        }
      }
    }
  } catch (err: any) {
    console.warn(`Central Device Mapper API lookup failed for model "${cleanModel}", utilizing local fallback:`, err?.message || err);
  }

  // 2. Fallback to Local Resolver (Telegram Cache + Certified Android Devices Database)
  return resolveDeviceNameLocal(cleanModel);
}

async function resolveDeviceNameLocal(cleanModel: string): Promise<string | null> {
  // 1. Initialize from Telegram if not done yet
  if (!localMappingsCache) {
    try {
      const { token, chatId } = getTelegramConfig();
      const metadata = await getMasterIndexMetadata(token, chatId);
      const mappingFile = metadata?.deviceMappingsFile;
      
      if (mappingFile && mappingFile.fileId) {
        telegramMessageId = mappingFile.messageId;
        telegramFileId = mappingFile.fileId;
        const filePath = await getTelegramFilePath(token, mappingFile.fileId);
        const contentStr = await downloadTelegramFile(token, filePath);
        localMappingsCache = JSON.parse(contentStr);
      } else {
        localMappingsCache = {};
      }
    } catch (e) {
      console.error('Failed to load device mappings from Telegram:', e);
      localMappingsCache = {};
    }
  }

  // 2. Check local memory cache (with key case-insensitivity)
  if (localMappingsCache) {
    if (localMappingsCache[cleanModel]) {
      return localMappingsCache[cleanModel];
    }
    const upperModel = cleanModel.toUpperCase();
    if (localMappingsCache[upperModel]) {
      return localMappingsCache[upperModel];
    }
  }

  // 3. Resolve from Github database
  try {
    if (!githubDataCache) {
      console.log('Fetching Github device database...');
      const res = await fetch(GITHUB_DEVICES_URL);
      if (res.ok) {
        githubDataCache = await res.json();
      }
    }

    if (githubDataCache) {
      let entries = githubDataCache[cleanModel];
      if (!entries) {
        entries = githubDataCache[cleanModel.toUpperCase()];
      }
      if (!entries) {
        // Try resilient partial matching for suffixes like /DS or model variations
        const cleanUpper = cleanModel.toUpperCase();
        const keys = Object.keys(githubDataCache);
        const matchKey = keys.find(k => {
          const kUpper = k.toUpperCase();
          return kUpper === cleanUpper ||
            cleanUpper.startsWith(kUpper + "/") ||
            kUpper.startsWith(cleanUpper + "/");
        });
        if (matchKey) {
          entries = githubDataCache[matchKey];
        }
      }

      if (entries && Array.isArray(entries)) {
        // Find the entry that has a brand and name, prefer the most descriptive one
        let resolvedName = '';
        for (const entry of entries) {
          if (entry.name && entry.brand) {
            resolvedName = `${entry.brand} ${entry.name}`;
            break;
          } else if (entry.name) {
            resolvedName = entry.name;
          }
        }

        if (resolvedName) {
          // We found a match, update cache
          localMappingsCache[cleanModel] = resolvedName;
          await saveMappingsToTelegram();
          return resolvedName;
        }
      }
    }
  } catch (e) {
    console.error('Failed to resolve device from Github:', e);
  }

  return null;
}

async function saveMappingsToTelegram() {
  if (!localMappingsCache) return;
  try {
    const { token, chatId } = getTelegramConfig();
    const contentStr = JSON.stringify(localMappingsCache, null, 2);
    
    let uploadedFile;
    if (telegramMessageId) {
      // update
      uploadedFile = await updateTelegramFile(
        token,
        chatId,
        telegramMessageId,
        DEVICE_MAPPINGS_FILENAME,
        contentStr,
        "Device Mappings Cache"
      );
    } else {
      // create
      uploadedFile = await uploadTelegramFile(
        token,
        chatId,
        DEVICE_MAPPINGS_FILENAME,
        contentStr,
        "Device Mappings Cache"
      );
    }

    telegramMessageId = uploadedFile.messageId;
    telegramFileId = uploadedFile.fileId;
    
    // Update the index to point to the new mapping file
    await updateMasterIndexMetadata(token, chatId, {
      deviceMappingsFile: {
        messageId: telegramMessageId,
        fileId: telegramFileId,
        updatedAt: Date.now()
      }
    });
    
    console.log(`Saved device mappings to Telegram (count: ${Object.keys(localMappingsCache).length})`);
  } catch (e) {
    console.error('Failed to save device mappings to Telegram:', e);
  }
}
