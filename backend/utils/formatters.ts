import crypto from "crypto";

// Helper to convert Wikipedia thumbnail URL to original image URL as a fallback
export function getOriginalWikipediaUrl(url: string): string | null {
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

export function formatStatusLabel(status: string | undefined): string {
  if (!status) return "Unwatched";
  const s = status.toLowerCase();
  if (s === "unwatched") return "Unwatched";
  if (s === "completed") return "Completed";
  if (s === "dropped") return "Dropped";
  if (s === "watching") return "Watching";
  if (s === "later") return "Later";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function formatRatingLabel(rating: number | undefined): string {
  if (!rating || rating <= 0) return "No Rating";
  const filled = "★".repeat(rating);
  const empty = "☆".repeat(5 - rating);
  return filled + empty;
}

export function formatToIndianDateTime(timestamp: number | string | Date | undefined): string {
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

export interface UpdateLogParam {
  action: string;
  previousValue: string;
  newValue: string;
  source: string;
  userPerformed: string;
  metadata?: any;
  timestamp?: number;
}

export function addUpdateLog(userJson: any, log: UpdateLogParam) {
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
