/**
 * Client-side Device Model Detection Utility
 * Designed to bypass User-Agent freezing/reduction on modern browsers
 * and accurately retrieve the physical hardware model.
 */

function getGPUInfo(): { vendor: string; renderer: string } | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return null;
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return null;
    
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    return {
      vendor: vendor.toString().trim(),
      renderer: renderer.toString().trim()
    };
  } catch (e) {
    return null;
  }
}

function cleanGPURenderer(renderer: string): string {
  if (!renderer) return 'Unknown GPU';
  
  let clean = renderer;
  const angleMatch = renderer.match(/ANGLE \(([^,)]+), ([^,)]+)/i);
  if (angleMatch) {
    clean = angleMatch[2];
  } else {
    clean = renderer.replace(/Direct3D.*/i, '').replace(/OpenGL.*/i, '').trim();
  }
  
  clean = clean.replace(/\(TM\)|\(R\)/gi, '').trim();
  return clean;
}

function extractAndroidModelFromUA(ua: string): string | null {
  const match = ua.match(/\(([^)]+)\)/);
  if (!match) return null;

  const parts = match[1].split(';').map(p => p.trim());
  for (let part of parts) {
    part = part.split(/\s+Build\//i)[0].trim();
    part = part.split('/')[0].trim();
    
    const lower = part.toLowerCase();
    if (!lower) continue;
    if (lower === 'linux' || lower === 'u' || lower === 'wv' || lower === 'k') continue;
    if (lower.startsWith('android')) continue;
    
    if (/^[a-z]{2}-[a-z]{2,4}$/i.test(part) || /^[a-z]{2}$/i.test(part) || /^[a-z]{2}_[a-z]{2,4}$/i.test(part)) {
      continue;
    }
    
    if (lower.includes('applewebkit') || lower.includes('chrome') || lower.includes('safari') || lower.includes('mobile')) {
      continue;
    }
    
    return part;
  }
  return null;
}

export async function getDeviceModel(): Promise<string> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'Unknown Node';
  }

  // 1. Prioritize standard High Entropy User-Agent Client Hints (UA-CH)
  // This is the most reliable way on modern Chromium (Chrome/Edge on Android/etc.)
  const navAny = navigator as any;
  if (navAny.userAgentData && typeof navAny.userAgentData.getHighEntropyValues === 'function') {
    try {
      const uaData = await navAny.userAgentData.getHighEntropyValues(['model']);
      if (uaData && uaData.model) {
        const modelStr = uaData.model.trim();
        if (modelStr && modelStr !== 'K') {
          return modelStr;
        }
      }
    } catch (e) {
      console.warn('Failed to retrieve model via UA Client Hints:', e);
    }
  }

  // Get physical resolution details for descriptive fallbacks
  const width = window.screen.width || 0;
  const height = window.screen.height || 0;
  const dpr = window.devicePixelRatio || 1;
  const portraitWidth = Math.min(width, height);
  const portraitHeight = Math.max(width, height);
  const screenSpec = `${portraitWidth}x${portraitHeight}@${dpr}`;

  const gpu = getGPUInfo();
  const cleanGpuName = gpu ? cleanGPURenderer(gpu.renderer) : '';

  // 2. iOS-specific physical hardware resolution using screen/pixels
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    const key = `${portraitWidth}x${portraitHeight}@${dpr}`;
    switch (key) {
      case '430x932@3':
        return 'iPhone 14 Pro Max / 15 Pro Max';
      case '393x852@3':
        return 'iPhone 14 Pro / 15 Pro';
      case '428x926@3':
        return 'iPhone 12 Pro Max / 13 Pro Max / 14 Plus';
      case '390x844@3':
        return 'iPhone 12 / 12 Pro / 13 / 13 Pro / 14';
      case '375x812@3':
        return 'iPhone X / XS / 11 Pro';
      case '414x896@3':
        return 'iPhone XS Max / 11 Pro Max';
      case '414x896@2':
        return 'iPhone XR / 11';
      case '414x736@3':
        return 'iPhone 8 Plus / 7 Plus / 6S Plus';
      case '375x667@2':
        return 'iPhone SE / 8 / 7 / 6S';
      case '320x568@2':
        return 'iPhone SE (1st Gen) / 5S';
      case '1024x1366@2':
        return 'iPad Pro 12.9';
      case '834x1194@2':
        return 'iPad Pro 11 / iPad Air';
      case '820x1180@2':
        return 'iPad (10th Gen)';
      case '810x1080@2':
        return 'iPad (7th/8th/9th Gen)';
      case '768x1024@2':
        return 'iPad mini / iPad';
      default:
        if (cleanGpuName) {
          return `iPhone [GPU: ${cleanGpuName}, ${screenSpec}]`;
        }
        return `iPhone [${screenSpec}]`;
    }
  }

  // 3. Robust regex User Agent extraction (fallback for non-reduced user agents, e.g. Firefox Android, legacy Chrome)
  if (ua.includes('android')) {
    const extractedModel = extractAndroidModelFromUA(navigator.userAgent);
    if (extractedModel) {
      return extractedModel;
    }
    if (cleanGpuName) {
      return `Android [GPU: ${cleanGpuName}, ${screenSpec}]`;
    }
    return `Android [${screenSpec}]`;
  }

  // 4. Desktop and generic OS resolution
  if (ua.includes('macintosh') || ua.includes('mac os')) {
    if (cleanGpuName) {
      return `Mac [GPU: ${cleanGpuName}, ${screenSpec}]`;
    }
    return `Mac [${screenSpec}]`;
  }
  if (ua.includes('windows')) {
    if (cleanGpuName) {
      return `PC [GPU: ${cleanGpuName}, ${screenSpec}]`;
    }
    return `PC [${screenSpec}]`;
  }
  if (ua.includes('linux')) {
    if (cleanGpuName) {
      return `Linux PC [GPU: ${cleanGpuName}, ${screenSpec}]`;
    }
    return `Linux PC [${screenSpec}]`;
  }

  if (cleanGpuName) {
    return `Device [GPU: ${cleanGpuName}, ${screenSpec}]`;
  }
  return `Device [${screenSpec}]`;
}
