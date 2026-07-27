import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const SHORTCUTS_DIR = path.join(PUBLIC_DIR, 'shortcuts');

if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });
if (!fs.existsSync(SHORTCUTS_DIR)) fs.mkdirSync(SHORTCUTS_DIR, { recursive: true });

// SVG Templates for App Icons (512x512)
const APP_ICONS = {
  'icon-arc-reactor': `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1f0305"/>
          <stop offset="100%" stop-color="#080102"/>
        </radialGradient>
        <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff2e34"/>
          <stop offset="100%" stop-color="#b30006"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#bg)"/>
      <circle cx="256" cy="256" r="216" fill="none" stroke="url(#ring)" stroke-width="20"/>
      <!-- Marvel Arc Reactor Symbol -->
      <circle cx="256" cy="256" r="140" fill="none" stroke="#e62429" stroke-width="12" filter="url(#glow)"/>
      <circle cx="256" cy="256" r="90" fill="none" stroke="#38bdf8" stroke-width="18" filter="url(#glow)"/>
      <circle cx="256" cy="256" r="45" fill="#f0f9ff" filter="url(#glow)"/>
      <!-- Triangles/Nodes -->
      <path d="M 256 120 L 270 150 L 242 150 Z" fill="#38bdf8"/>
      <path d="M 256 392 L 270 362 L 242 362 Z" fill="#38bdf8"/>
      <path d="M 120 256 L 150 270 L 150 242 Z" fill="#38bdf8"/>
      <path d="M 392 256 L 362 270 L 362 242 Z" fill="#38bdf8"/>
    </svg>
  `,

  'icon-quantum-blue': `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg-q" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#0c2340"/>
          <stop offset="100%" stop-color="#030814"/>
        </radialGradient>
        <filter id="glow-q">
          <feGaussianBlur stdDeviation="10" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#bg-q)"/>
      <circle cx="256" cy="256" r="216" fill="none" stroke="#0ea5e9" stroke-width="16"/>
      <!-- Quantum Swirls -->
      <ellipse cx="256" cy="256" rx="160" ry="70" fill="none" stroke="#38bdf8" stroke-width="14" transform="rotate(30 256 256)" filter="url(#glow-q)"/>
      <ellipse cx="256" cy="256" rx="160" ry="70" fill="none" stroke="#818cf8" stroke-width="14" transform="rotate(-30 256 256)" filter="url(#glow-q)"/>
      <circle cx="256" cy="256" r="50" fill="#e0f2fe" filter="url(#glow-q)"/>
    </svg>
  `,

  'icon-vibranium-silver': `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-v" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#27272a"/>
          <stop offset="100%" stop-color="#09090b"/>
        </linearGradient>
        <linearGradient id="silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f4f4f5"/>
          <stop offset="50%" stop-color="#a1a1aa"/>
          <stop offset="100%" stop-color="#71717a"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#bg-v)"/>
      <circle cx="256" cy="256" r="216" fill="none" stroke="url(#silver)" stroke-width="20"/>
      <!-- Captain America / Vibranium Shield Concentric Rings -->
      <circle cx="256" cy="256" r="170" fill="none" stroke="#dc2626" stroke-width="28"/>
      <circle cx="256" cy="256" r="120" fill="none" stroke="url(#silver)" stroke-width="28"/>
      <circle cx="256" cy="256" r="70" fill="#2563eb"/>
      <path d="M 256 200 L 272 242 L 316 242 L 280 268 L 294 310 L 256 284 L 218 310 L 232 268 L 196 242 L 240 242 Z" fill="url(#silver)"/>
    </svg>
  `,

  'icon-infinity-gold': `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#2a1a08"/>
          <stop offset="100%" stop-color="#0a0501"/>
        </radialGradient>
        <filter id="glow-g">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#bg-g)"/>
      <circle cx="256" cy="256" r="216" fill="none" stroke="#eab308" stroke-width="18"/>
      <!-- Infinity Gauntlet Cluster of 6 Stones -->
      <circle cx="256" cy="180" r="24" fill="#ef4444" filter="url(#glow-g)"/> <!-- Reality -->
      <circle cx="320" cy="210" r="24" fill="#3b82f6" filter="url(#glow-g)"/> <!-- Space -->
      <circle cx="330" cy="285" r="24" fill="#a855f7" filter="url(#glow-g)"/> <!-- Power -->
      <circle cx="280" cy="340" r="24" fill="#22c55e" filter="url(#glow-g)"/> <!-- Time -->
      <circle cx="200" cy="330" r="24" fill="#f97316" filter="url(#glow-g)"/> <!-- Soul -->
      <circle cx="256" cy="256" r="34" fill="#eab308" filter="url(#glow-g)"/> <!-- Mind -->
    </svg>
  `,

  'icon-dark-stealth': `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="112" fill="#09090b"/>
      <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#27272a" stroke-width="8"/>
      <!-- Stylized MCU M Emblem -->
      <path d="M 120 380 L 120 132 L 200 132 L 256 260 L 312 132 L 392 132 L 392 380 L 332 380 L 332 220 L 276 340 L 236 340 L 180 220 L 180 380 Z" fill="#e62429"/>
    </svg>
  `
};

// SVG Templates for Shortcut Icons (192x192)
const SHORTCUT_ICONS = {
  'shortcut-dashboard': `
    <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" rx="48" fill="#e62429"/>
      <path d="M 48 108 A 48 48 0 0 1 144 108 L 132 108 A 36 36 0 0 0 60 108 Z" fill="#ffffff" opacity="0.4"/>
      <circle cx="96" cy="108" r="40" fill="none" stroke="#ffffff" stroke-width="12"/>
      <path d="M 96 108 L 124 72" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/>
      <circle cx="96" cy="108" r="10" fill="#ffffff"/>
    </svg>
  `,

  'shortcut-movies': `
    <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" rx="48" fill="#b91c1c"/>
      <!-- Clapperboard / Film Reel -->
      <rect x="40" y="52" width="112" height="88" rx="16" fill="#ffffff"/>
      <path d="M 40 52 L 152 52 L 152 80 L 40 80 Z" fill="#18181b"/>
      <path d="M 52 52 L 72 80 M 88 52 L 108 80 M 124 52 L 144 80" stroke="#ffffff" stroke-width="8"/>
      <polygon points="84,96 120,112 84,128" fill="#b91c1c"/>
    </svg>
  `,

  'shortcut-series': `
    <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" rx="48" fill="#1d4ed8"/>
      <rect x="40" y="60" width="112" height="80" rx="16" fill="#ffffff"/>
      <polygon points="70,40 86,60 54,60" fill="#ffffff"/>
      <polygon points="122,40 138,60 106,60" fill="#ffffff"/>
      <polygon points="84,84 120,100 84,116" fill="#1d4ed8"/>
    </svg>
  `,

  'shortcut-timeline': `
    <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" rx="48" fill="#6d28d9"/>
      <circle cx="96" cy="96" r="54" fill="none" stroke="#ffffff" stroke-width="14"/>
      <polyline points="96,62 96,96 122,110" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,

  'shortcut-analytics': `
    <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" rx="48" fill="#047857"/>
      <rect x="44" y="112" width="22" height="36" rx="6" fill="#ffffff"/>
      <rect x="74" y="88" width="22" height="60" rx="6" fill="#ffffff"/>
      <rect x="104" y="64" width="22" height="84" rx="6" fill="#ffffff"/>
      <rect x="134" y="44" width="22" height="104" rx="6" fill="#ffffff"/>
    </svg>
  `,

  'shortcut-settings': `
    <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" rx="48" fill="#3f3f46"/>
      <circle cx="96" cy="96" r="28" fill="none" stroke="#ffffff" stroke-width="12"/>
      <path d="M 96 40 L 96 56 M 96 136 L 96 152 M 40 96 L 56 96 M 136 96 L 152 96 M 56 56 L 68 68 M 124 124 L 136 136 M 136 56 L 124 68 M 68 124 L 56 136" stroke="#ffffff" stroke-width="12" stroke-linecap="round"/>
    </svg>
  `
};

async function build() {
  console.log('Generating App Icons...');
  for (const [name, svg] of Object.entries(APP_ICONS)) {
    const pngBuffer = await sharp(Buffer.from(svg)).resize(512, 512).png().toBuffer();
    fs.writeFileSync(path.join(ICONS_DIR, `${name}.png`), pngBuffer);
    console.log(`Saved ${name}.png`);
  }

  // Copy default icon to public/favicon.png
  const defaultPng = fs.readFileSync(path.join(ICONS_DIR, 'icon-arc-reactor.png'));
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.png'), defaultPng);
  console.log('Updated public/favicon.png');

  console.log('Generating Shortcut Icons...');
  for (const [name, svg] of Object.entries(SHORTCUT_ICONS)) {
    const pngBuffer = await sharp(Buffer.from(svg)).resize(192, 192).png().toBuffer();
    fs.writeFileSync(path.join(SHORTCUTS_DIR, `${name}.png`), pngBuffer);
    console.log(`Saved ${name}.png`);
  }

  console.log('All icons generated successfully!');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
