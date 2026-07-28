import React from 'react';

// @ts-ignore
import spaceStoneImg from '../assets/images/space_stone.jpg';
// @ts-ignore
import mindStoneImg from '../assets/images/mind_stone.jpg';
// @ts-ignore
import realityStoneImg from '../assets/images/reality_stone.jpg';
// @ts-ignore
import powerStoneImg from '../assets/images/power_stone.jpg';
// @ts-ignore
import timeStoneImg from '../assets/images/time_stone.jpg';
// @ts-ignore
import soulStoneImg from '../assets/images/soul_stone.jpg';

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
  const imageUrl = STONE_IMAGES[stoneId];
  if (!imageUrl) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center p-1.5">
      <img
        src={imageUrl}
        alt={`${stoneId} stone`}
        referrerPolicy="no-referrer"
        className={`w-full h-full object-contain rounded-xl transition-all duration-300 ${
          isActive 
            ? 'brightness-110 saturate-110 scale-105 filter drop-shadow-[0_0_15px_var(--stone-glow)]' 
            : 'brightness-90 hover:brightness-100 filter drop-shadow-[0_0_5px_rgba(255,255,255,0.15)]'
        }`}
        style={{
          ['--stone-glow' as any]: 
            stoneId === 'space' ? 'rgba(0,119,255,0.8)' :
            stoneId === 'mind' ? 'rgba(255,204,0,0.8)' :
            stoneId === 'reality' ? 'rgba(230,0,0,0.8)' :
            stoneId === 'power' ? 'rgba(156,39,176,0.8)' :
            stoneId === 'time' ? 'rgba(46,125,50,0.8)' :
            stoneId === 'soul' ? 'rgba(230,81,0,0.8)' : 'rgba(255,255,255,0.5)'
        }}
      />
    </div>
  );
};
