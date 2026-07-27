import React from 'react';

// @ts-ignore
import spaceStoneImg from '../assets/images/space_stone_1783697042568.jpg';
// @ts-ignore
import mindStoneImg from '../assets/images/mind_stone_1783697057208.jpg';
// @ts-ignore
import realityStoneImg from '../assets/images/reality_stone_1783697070239.jpg';
// @ts-ignore
import powerStoneImg from '../assets/images/power_stone_1783697087546.jpg';
// @ts-ignore
import timeStoneImg from '../assets/images/time_stone_1783697101576.jpg';
// @ts-ignore
import soulStoneImg from '../assets/images/soul_stone_1783697113012.jpg';

const STONE_IMAGES: Record<string, string> = {
  space: spaceStoneImg,
  mind: mindStoneImg,
  reality: realityStoneImg,
  power: powerStoneImg,
  time: timeStoneImg,
  soul: soulStoneImg,
};

interface CrystalStoneRendererProps {
  stoneId: string;
  isActive: boolean;
}

export const CrystalStoneRenderer: React.FC<CrystalStoneRendererProps> = ({ stoneId, isActive }) => {
  switch (stoneId) {
    case 'space':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(0,119,255,0.4)]">
          <defs>
            <radialGradient id="space-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8be3ff" stopOpacity={0.95} />
              <stop offset="60%" stopColor="#0077ff" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#001a66" stopOpacity={0.15} />
            </radialGradient>
            <linearGradient id="space-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#00aaff" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="space-left" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0077ff" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#001133" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="space-right" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3399ff" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#002266" stopOpacity={0.8} />
            </linearGradient>
            <clipPath id="space-clip">
              <polygon points="50,10 85,30 85,70 50,90 15,70 15,30" />
            </clipPath>
          </defs>

          <g clipPath="url(#space-clip)">
            <image
              href={STONE_IMAGES.space}
              x="-10"
              y="-10"
              width="120"
              height="120"
              style={{ filter: 'contrast(1.3) brightness(1.15) saturate(1.4)' }}
              opacity={0.85}
            />
            <rect width="100" height="100" fill="url(#space-core)" style={{ mixBlendMode: 'screen' }} />
          </g>

          <polygon
            points="50,10 85,30 50,50 15,30"
            fill="url(#space-top)"
            stroke="#cceeff"
            strokeWidth="0.75"
            strokeOpacity={0.6}
            style={{ mixBlendMode: 'overlay' }}
          />
          <polygon
            points="15,30 50,50 50,90 15,70"
            fill="url(#space-left)"
            stroke="#33aaff"
            strokeWidth="0.5"
            strokeOpacity={0.4}
            style={{ mixBlendMode: 'multiply' }}
          />
          <polygon
            points="50,50 85,30 85,70 50,90"
            fill="url(#space-right)"
            stroke="#80c5ff"
            strokeWidth="0.5"
            strokeOpacity="0.4"
            style={{ mixBlendMode: 'overlay' }}
          />

          <line x1="50" y1="10" x2="50" y2="50" stroke="#ffffff" strokeWidth="1" strokeOpacity={0.8} style={{ mixBlendMode: 'screen' }} />
          <line x1="15" y1="30" x2="50" y2="50" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.6" style={{ mixBlendMode: 'screen' }} />
          <line x1="85" y1="30" x2="50" y2="50" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.6" style={{ mixBlendMode: 'screen' }} />
          
          {isActive && (
            <circle cx="50" cy="50" r="16" fill="#ffffff" filter="blur(6px)" opacity={0.7} style={{ mixBlendMode: 'screen' }} />
          )}
        </svg>
      );

    case 'mind':
      return (
        <svg viewBox="0 0 100 150" className="w-full h-full drop-shadow-[0_0_10px_rgba(255,204,0,0.4)]">
          <defs>
            <radialGradient id="mind-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff5cc" stopOpacity={0.95} />
              <stop offset="50%" stopColor="#ffcc00" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#664400" stopOpacity={0.15} />
            </radialGradient>
            <linearGradient id="mind-table" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.75} />
              <stop offset="100%" stopColor="#ffdd33" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="mind-side" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffe57f" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ffb300" stopOpacity={0.1} />
            </linearGradient>
            <clipPath id="mind-clip">
              <polygon points="50,5 85,60 50,145 15,60" />
            </clipPath>
          </defs>

          <g clipPath="url(#mind-clip)">
            <image
              href={STONE_IMAGES.mind}
              x="-10"
              y="-10"
              width="120"
              height="170"
              style={{ filter: 'contrast(1.25) brightness(1.2) saturate(1.5)' }}
              opacity={0.85}
            />
            <rect width="100" height="150" fill="url(#mind-core)" style={{ mixBlendMode: 'screen' }} />
          </g>

          <polygon
            points="50,35 72,60 50,85 28,60"
            fill="url(#mind-table)"
            stroke="#fffae6"
            strokeWidth="0.75"
            strokeOpacity={0.6}
            style={{ mixBlendMode: 'overlay' }}
          />

          <polygon points="50,5 28,60 50,35" fill="url(#mind-side)" stroke="#ffe066" strokeWidth="0.5" strokeOpacity={0.4} style={{ mixBlendMode: 'overlay' }} />
          <polygon points="50,5 72,60 50,35" fill="url(#mind-side)" stroke="#ffe066" strokeWidth="0.5" strokeOpacity="0.4" style={{ mixBlendMode: 'overlay' }} />
          <polygon points="50,145 28,60 50,85" fill="url(#mind-side)" stroke="#ffa000" strokeWidth="0.5" strokeOpacity="0.3" style={{ mixBlendMode: 'multiply' }} />
          <polygon points="50,145 72,60 50,85" fill="url(#mind-side)" stroke="#ffa000" strokeWidth="0.5" strokeOpacity="0.3" style={{ mixBlendMode: 'multiply' }} />

          <polygon points="50,5 15,60 28,60" fill="rgba(255, 230, 100, 0.2)" stroke="#ffe066" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="50,5 85,60 72,60" fill="rgba(255, 230, 100, 0.2)" stroke="#ffe066" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="50,145 15,60 28,60" fill="rgba(200, 120, 0, 0.2)" stroke="#cc8800" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="50,145 85,60 72,60" fill="rgba(200, 120, 0, 0.2)" stroke="#cc8800" strokeWidth="0.5" strokeOpacity="0.3" />

          <line x1="50" y1="5" x2="50" y2="35" stroke="#ffffff" strokeWidth="0.75" strokeOpacity="0.8" style={{ mixBlendMode: 'screen' }} />
          <line x1="50" y1="85" x2="50" y2="145" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.7" style={{ mixBlendMode: 'screen' }} />
          
          {isActive && (
            <circle cx="50" cy="60" r="13" fill="#ffffff" filter="blur(5px)" opacity="0.8" style={{ mixBlendMode: 'screen' }} />
          )}
        </svg>
      );

    case 'reality':
      return (
        <svg viewBox="0 0 90 150" className="w-full h-full drop-shadow-[0_0_10px_rgba(230,0,0,0.4)]">
          <defs>
            <radialGradient id="reality-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffb3b3" stopOpacity={0.95} />
              <stop offset="60%" stopColor="#e60000" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#4d0000" stopOpacity={0.15} />
            </radialGradient>
            <linearGradient id="reality-left" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff8080" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#800000" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="reality-right" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4d4d" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#4d0000" stopOpacity={0.4} />
            </linearGradient>
            <clipPath id="reality-clip">
              <polygon points="45,5 75,45 80,95 45,145 10,95 15,45" />
            </clipPath>
          </defs>

          <g clipPath="url(#reality-clip)">
            <image
              href={STONE_IMAGES.reality}
              x="-10"
              y="-10"
              width="110"
              height="170"
              style={{ filter: 'contrast(1.3) brightness(1.15) saturate(1.5)' }}
              opacity={0.85}
            />
            <rect width="90" height="150" fill="url(#reality-core)" style={{ mixBlendMode: 'screen' }} />
          </g>

          <polygon points="45,5 45,65 15,45" fill="url(#reality-left)" stroke="#ff9999" strokeWidth="0.5" strokeOpacity="0.4" style={{ mixBlendMode: 'overlay' }} />
          <polygon points="45,5 45,65 75,45" fill="url(#reality-right)" stroke="#ff6666" strokeWidth="0.5" strokeOpacity="0.4" style={{ mixBlendMode: 'overlay' }} />
          <polygon points="15,45 45,65 10,95" fill="url(#reality-left)" stroke="#ff4d4d" strokeWidth="0.5" strokeOpacity="0.3" style={{ mixBlendMode: 'multiply' }} />
          <polygon points="75,45 45,65 80,95" fill="url(#reality-right)" stroke="#e60000" strokeWidth="0.5" strokeOpacity="0.3" style={{ mixBlendMode: 'overlay' }} />
          <polygon points="10,95 45,65 45,115" fill="url(#reality-left)" stroke="#cc0000" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="80,95 45,65 45,115" fill="url(#reality-right)" stroke="#ff4d4d" strokeWidth="0.5" strokeOpacity="0.4" style={{ mixBlendMode: 'overlay' }} />
          <polygon points="10,95 45,115 45,145" fill="rgba(128, 0, 0, 0.4)" stroke="#ff3333" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="80,95 45,115 45,145" fill="rgba(230, 0, 0, 0.3)" stroke="#ff8080" strokeWidth="0.5" strokeOpacity="0.4" style={{ mixBlendMode: 'overlay' }} />

          <line x1="45" y1="5" x2="45" y2="145" stroke="#ffffff" strokeWidth="1.25" strokeOpacity="0.85" style={{ mixBlendMode: 'screen' }} />
          <line x1="15" y1="45" x2="45" y2="65" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.6" style={{ mixBlendMode: 'screen' }} />
          <line x1="75" y1="45" x2="45" y2="65" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.6" style={{ mixBlendMode: 'screen' }} />

          {isActive && (
            <circle cx="45" cy="75" r="11" fill="#ffffff" filter="blur(6px)" opacity="0.8" style={{ mixBlendMode: 'screen' }} />
          )}
        </svg>
      );

    case 'power':
      return (
        <svg viewBox="0 0 110 150" className="w-full h-full drop-shadow-[0_0_10px_rgba(156,39,176,0.4)]">
          <defs>
            <radialGradient id="power-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f3e5f5" stopOpacity={0.95} />
              <stop offset="60%" stopColor="#9c27b0" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#311b92" stopOpacity={0.15} />
            </radialGradient>
            <linearGradient id="power-table" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d1c4e9" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="power-upper" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e040fb" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7b1fa2" stopOpacity={0.2} />
            </linearGradient>
            <clipPath id="power-clip">
              <polygon points="35,5 75,5 100,45 100,105 55,145 10,105 10,45" />
            </clipPath>
          </defs>

          <g clipPath="url(#power-clip)">
            <image
              href={STONE_IMAGES.power}
              x="-10"
              y="-10"
              width="130"
              height="170"
              style={{ filter: 'contrast(1.3) brightness(1.15) saturate(1.5)' }}
              opacity={0.85}
            />
            <rect width="110" height="150" fill="url(#power-core)" style={{ mixBlendMode: 'screen' }} />
          </g>

          <polygon
            points="35,35 75,35 90,65 75,95 35,95 20,65"
            fill="url(#power-table)"
            stroke="#e1bee7"
            strokeWidth="0.75"
            strokeOpacity={0.6}
            style={{ mixBlendMode: 'overlay' }}
          />

          <polygon points="35,5 75,5 75,35 35,35" fill="url(#power-upper)" stroke="#ea80fc" strokeWidth="0.5" strokeOpacity="0.4" style={{ mixBlendMode: 'overlay' }} />
          <polygon points="75,5 100,45 90,65 75,35" fill="rgba(156, 39, 176, 0.3)" stroke="#ea80fc" strokeWidth="0.5" strokeOpacity="0.4" />
          <polygon points="35,5 10,45 20,65 35,35" fill="rgba(156, 39, 176, 0.3)" stroke="#ea80fc" strokeWidth="0.5" strokeOpacity="0.4" />
          <polygon points="10,45 10,105 35,95 20,65" fill="rgba(106, 27, 154, 0.4)" stroke="#ba68c8" strokeWidth="0.5" strokeOpacity="0.3" style={{ mixBlendMode: 'multiply' }} />
          <polygon points="100,45 100,105 75,95 90,65" fill="rgba(106, 27, 154, 0.4)" stroke="#ba68c8" strokeWidth="0.5" strokeOpacity="0.3" style={{ mixBlendMode: 'multiply' }} />
          <polygon points="35,95 55,145 20,65 10,105" fill="rgba(74, 20, 140, 0.5)" stroke="#ab47bc" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="75,95 55,145 90,65 100,105" fill="rgba(74, 20, 140, 0.5)" stroke="#ab47bc" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="35,95 75,95 55,145" fill="url(#power-upper)" stroke="#f3e5f5" strokeWidth="0.5" strokeOpacity="0.5" style={{ mixBlendMode: 'overlay' }} />

          <line x1="35" y1="35" x2="35" y2="5" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.7" style={{ mixBlendMode: 'screen' }} />
          <line x1="75" y1="35" x2="75" y2="5" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.7" style={{ mixBlendMode: 'screen' }} />

          {isActive && (
            <circle cx="55" cy="65" r="15" fill="#ffffff" filter="blur(6px)" opacity="0.7" style={{ mixBlendMode: 'screen' }} />
          )}
        </svg>
      );

    case 'time':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(46,125,50,0.4)]">
          <defs>
            <radialGradient id="time-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e8f5e9" stopOpacity={0.95} />
              <stop offset="50%" stopColor="#2e7d32" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#1b5e20" stopOpacity={0.15} />
            </radialGradient>
            <linearGradient id="time-table" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#a5d6a7" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="time-radial" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8e6c9" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#004d40" stopOpacity="0.3" />
            </linearGradient>
            <clipPath id="time-clip">
              <polygon points="50,5 95,50 95,55 50,95 5,55 5,50" />
            </clipPath>
          </defs>

          <g clipPath="url(#time-clip)">
            <image
              href={STONE_IMAGES.time}
              x="-10"
              y="-10"
              width="120"
              height="120"
              style={{ filter: 'contrast(1.3) brightness(1.15) saturate(1.5)' }}
              opacity={0.85}
            />
            <rect width="100" height="100" fill="url(#time-core)" style={{ mixBlendMode: 'screen' }} />
          </g>

          <polygon
            points="25,50 50,30 75,50 50,70"
            fill="url(#time-table)"
            stroke="#e8f5e9"
            strokeWidth="0.75"
            strokeOpacity={0.6}
            style={{ mixBlendMode: 'overlay' }}
          />

          <polygon points="5,50 25,50 50,30 50,15" fill="url(#time-radial)" stroke="#81c784" strokeWidth="0.5" strokeOpacity="0.4" style={{ mixBlendMode: 'overlay' }} />
          <polygon points="5,55 25,50 50,70 50,85" fill="url(#time-radial)" stroke="#388e3c" strokeWidth="0.5" strokeOpacity="0.3" style={{ mixBlendMode: 'multiply' }} />
          <polygon points="50,5 50,15 25,50" fill="rgba(76, 175, 80, 0.2)" stroke="#a5d6a7" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="50,5 50,15 75,50" fill="rgba(76, 175, 80, 0.2)" stroke="#a5d6a7" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="95,50 75,50 50,30 50,15" fill="url(#time-radial)" stroke="#81c784" strokeWidth="0.5" strokeOpacity="0.4" style={{ mixBlendMode: 'overlay' }} />
          <polygon points="95,55 75,50 50,70 50,85" fill="url(#time-radial)" stroke="#388e3c" strokeWidth="0.5" strokeOpacity="0.3" style={{ mixBlendMode: 'multiply' }} />
          <polygon points="50,95 50,85 25,50" fill="rgba(27, 94, 32, 0.3)" stroke="#4caf50" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="50,95 50,85 75,50" fill="rgba(27, 94, 32, 0.3)" stroke="#4caf50" strokeWidth="0.5" strokeOpacity="0.3" />

          <line x1="50" y1="5" x2="50" y2="30" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" style={{ mixBlendMode: 'screen' }} />
          <line x1="50" y1="70" x2="50" y2="95" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.7" style={{ mixBlendMode: 'screen' }} />
          <line x1="5" y1="50" x2="25" y2="50" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.6" style={{ mixBlendMode: 'screen' }} />
          <line x1="95" y1="50" x2="75" y2="50" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.6" style={{ mixBlendMode: 'screen' }} />

          {isActive && (
            <circle cx="50" cy="50" r="14" fill="#ffffff" filter="blur(5px)" opacity="0.8" style={{ mixBlendMode: 'screen' }} />
          )}
        </svg>
      );

    case 'soul':
      return (
        <svg viewBox="0 0 100 110" className="w-full h-full drop-shadow-[0_0_10px_rgba(230,81,0,0.4)]">
          <defs>
            <radialGradient id="soul-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff3e0" stopOpacity={0.95} />
              <stop offset="50%" stopColor="#e65100" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#5d4037" stopOpacity={0.15} />
            </radialGradient>
            <linearGradient id="soul-table" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffb74d" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="soul-radial" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffe0b2" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ff6d00" stopOpacity={0.2} />
            </linearGradient>
            <clipPath id="soul-clip">
              <polygon points="50,5 85,60 75,95 50,105 25,95 15,60" />
            </clipPath>
          </defs>

          <g clipPath="url(#soul-clip)">
            <image
              href={STONE_IMAGES.soul}
              x="-10"
              y="-10"
              width="120"
              height="130"
              style={{ filter: 'contrast(1.2) brightness(1.2) saturate(1.5)' }}
              opacity={0.85}
            />
            <rect width="100" height="110" fill="url(#soul-core)" style={{ mixBlendMode: 'screen' }} />
          </g>

          <polygon
            points="50,35 68,65 60,88 50,94 40,88 32,65"
            fill="url(#soul-table)"
            stroke="#ffe0b2"
            strokeWidth="0.75"
            strokeOpacity={0.6}
            style={{ mixBlendMode: 'overlay' }}
          />

          <polygon points="50,5 50,35 32,65" fill="url(#soul-radial)" stroke="#ffd54f" strokeWidth="0.5" strokeOpacity="0.4" style={{ mixBlendMode: 'overlay' }} />
          <polygon points="50,5 50,35 68,65" fill="url(#soul-radial)" stroke="#ffd54f" strokeWidth="0.5" strokeOpacity="0.4" style={{ mixBlendMode: 'overlay' }} />
          <polygon points="15,60 32,65 40,88 25,95" fill="rgba(230, 81, 0, 0.4)" stroke="#ffb74d" strokeWidth="0.5" strokeOpacity="0.3" style={{ mixBlendMode: 'multiply' }} />
          <polygon points="15,60 32,65 50,5" fill="rgba(255, 183, 77, 0.2)" stroke="#ffb74d" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="85,60 68,65 60,88 75,95" fill="rgba(230, 81, 0, 0.4)" stroke="#ffb74d" strokeWidth="0.5" strokeOpacity="0.3" style={{ mixBlendMode: 'multiply' }} />
          <polygon points="85,60 68,65 50,5" fill="rgba(255, 183, 77, 0.2)" stroke="#ffb74d" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="25,95 40,88 50,94 50,105" fill="rgba(191, 54, 12, 0.4)" stroke="#ff8f00" strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points="75,95 60,88 50,94 50,105" fill="rgba(191, 54, 12, 0.4)" stroke="#ff8f00" strokeWidth="0.5" strokeOpacity="0.3" />

          <line x1="50" y1="5" x2="50" y2="35" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" style={{ mixBlendMode: 'screen' }} />
          <line x1="50" y1="94" x2="50" y2="105" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.6" style={{ mixBlendMode: 'screen' }} />

          {isActive && (
            <circle cx="50" cy="65" r="12" fill="#ffffff" filter="blur(5px)" opacity="0.8" style={{ mixBlendMode: 'screen' }} />
          )}
        </svg>
      );

    default:
      return null;
  }
};
