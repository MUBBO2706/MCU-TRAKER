import express from "express";
import * as telegramCharacterImages from "../CharacterImages.js";
import { getOriginalWikipediaUrl } from "../utils/formatters.js";

const router = express.Router();

// Server-Side Image Proxy
router.get("/api/image-proxy", async (req, res) => {
  const url = req.query.url as string;
  const characterId = req.query.characterId as string;

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
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        return res.send(imageResult.bytes);
      }
    } catch (err: any) {
      console.warn(`[Telegram Character Repo] Failed to serve character portrait for ${charFilename} from Telegram:`, err.message);
    }
  }

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

  if (!urlsToTry.includes(url)) {
    urlsToTry.push(url);
  }

  const originalWiki = getOriginalWikipediaUrl(url);
  if (originalWiki && !urlsToTry.includes(originalWiki)) {
    urlsToTry.push(originalWiki);
  }

  for (const targetUrl of urlsToTry) {
    // Attempt 1: WordPress Photon Proxy
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
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        const arrayBuffer = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }
    } catch (err) {
      console.warn(`WordPress Photon proxy failed for ${targetUrl}:`, err);
    }

    // Attempt 2: Weserv proxy
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
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        const arrayBuffer = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }
    } catch (err) {
      console.warn(`Weserv proxy failed for ${targetUrl}:`, err);
    }

    // Attempt 3: Direct fetch fallback
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
        res.setHeader("Cache-Control", "public, max-age=86400");
        const arrayBuffer = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }
    } catch (err) {
      console.warn(`Direct fetch failed for ${targetUrl}:`, err);
    }
  }

  // Fallback SVG
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
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
        <path d="M-40,-50 L40,-50 L50,-10 L0,50 L-50,-10 Z" fill="#e62429" opacity="0.8"/>
        <text font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="2" y="-5">MARVEL</text>
        <text font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="10" fill="#a3a3a3" text-anchor="middle" dominant-baseline="middle" letter-spacing="1" y="25">INTEL CLASSIFIED</text>
      </g>
    </svg>
  `);
});

export default router;
