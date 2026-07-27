import React, { useState } from 'react';
import { INFINITY_STONES, MCU_TITLES } from '../data/mcuData';
import { InfinityStone } from '../types';
import { Sparkles, MapPin, Eye, Compass, Info } from 'lucide-react';
import { CrystalStoneRenderer } from './CrystalStoneRenderer';



const getStoneProportions = (id: string): { width: string; height: string } => {
  switch (id) {
    case 'space':
      return { width: '3.25rem', height: '3.25rem' }; // 52px by 52px (Cube)
    case 'mind':
      return { width: '2.5rem', height: '3.75rem' }; // 40px by 60px (Elongated Kite)
    case 'reality':
      return { width: '2.25rem', height: '3.75rem' }; // 36px by 60px (Slender Shard)
    case 'power':
      return { width: '2.75rem', height: '3.75rem' }; // 44px by 60px (Oblong Octagon)
    case 'time':
      return { width: '3.5rem', height: '3.5rem' }; // 56px by 56px (Eye)
    case 'soul':
      return { width: '3rem', height: '3.25rem' }; // 48px by 52px (Pear)
    default:
      return { width: '3rem', height: '3rem' };
  }
};

interface InfinityStonesProps {
  onSelectMovie: (movieId: string) => void;
}

export const InfinityStones: React.FC<InfinityStonesProps> = ({ onSelectMovie }) => {
  const [activeStone, setActiveStone] = useState<InfinityStone | null>(null);

  const handleStoneClick = (stone: InfinityStone) => {
    setActiveStone(activeStone?.id === stone.id ? null : stone);
  };

  return (
    <div className="flex flex-col gap-6" id="infinity-stones-section">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-2xl tracking-tight text-white flex items-center gap-2">
          <Sparkles className="text-marvel w-6 h-6 animate-pulse" />
          Infinity Stones Codex
        </h2>
        <p className="font-sans text-xs text-neutral-400">
          Interactive cosmic singularities. Click any stone to reveal its location, timeline, and current MCU status.
        </p>
      </div>

      {/* Grid of Stones */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {INFINITY_STONES.map((stone) => {
          const isActive = activeStone?.id === stone.id;
          return (
            <button
              key={stone.id}
              onClick={() => handleStoneClick(stone)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 relative focus:outline-none h-32 hover:scale-105 ${
                isActive
                  ? 'scale-105 opacity-100'
                  : 'opacity-65 hover:opacity-100'
              }`}
            >
              {/* Glowing Gem with custom high-quality image */}
              <div className="h-20 flex items-center justify-center mb-1 w-full">
                <div
                  className="transition-all duration-500 flex items-center justify-center relative"
                  style={{
                    ...getStoneProportions(stone.id),
                    filter: isActive 
                      ? `drop-shadow(0 0 20px ${stone.glowColor}) drop-shadow(0 0 8px ${stone.glowColor})`
                      : `drop-shadow(0 0 8px ${stone.glowColor})`,
                    transform: isActive ? 'scale(1.15)' : 'scale(1.0)',
                  }}
                >
                  <CrystalStoneRenderer stoneId={stone.id} isActive={isActive} />
                </div>
              </div>
              <span className="font-display font-semibold text-xs text-center text-white truncate max-w-full whitespace-nowrap mt-2">
                {stone.name.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Details Box */}
      {activeStone && (
        <div className="pt-6 border-t border-neutral-900/60 mt-2 transition-all duration-300 relative overflow-hidden animate-fadeIn">
          {/* Cosmic Colored Glow Background Accent */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-25 pointer-events-none transition-all duration-500"
            style={{
              background: `radial-gradient(circle, ${activeStone.glowColor} 0%, transparent 70%)`,
            }}
          />

          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/60 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                  <div
                    className="transition-all duration-500 flex items-center justify-center relative"
                    style={{
                      ...getStoneProportions(activeStone.id),
                      filter: `drop-shadow(0 0 16px ${activeStone.glowColor}) drop-shadow(0 0 6px ${activeStone.glowColor})`,
                      transform: 'scale(1.1)',
                    }}
                  >
                    <CrystalStoneRenderer stoneId={activeStone.id} isActive={true} />
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-display font-bold text-base sm:text-lg text-white leading-tight">
                    {activeStone.name}
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Cosmic Singularity Gem
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="font-mono text-[9px] uppercase tracking-widest text-marvel bg-marvel/10 px-3 py-1.5 rounded-full border border-marvel/20 font-bold whitespace-nowrap">
                  ★ Cosmic Singularity
                </span>
              </div>
            </div>

            <p className="font-sans text-xs leading-relaxed text-neutral-300">
              {activeStone.summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 mt-2 pt-3 border-t border-neutral-800/40">
              <div className="flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Origin</span>
                  <span className="text-xs text-neutral-300 leading-relaxed mt-0.5">{activeStone.origin}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Last Known Location</span>
                  <span className="text-xs text-neutral-300 leading-relaxed mt-0.5">{activeStone.location}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-3 sm:pt-0 border-t border-neutral-800/30 sm:border-t-0">
                <Eye className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">First Appearance</span>
                  <button
                    onClick={() => onSelectMovie(activeStone.firstAppearanceId)}
                    className="text-xs text-marvel font-semibold text-left hover:underline focus:outline-none transition-all mt-0.5"
                  >
                    {MCU_TITLES.find(m => m.id === activeStone.firstAppearanceId)?.title || 'Iron Man'}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-3 sm:pt-0 border-t border-neutral-800/30 sm:border-t-0">
                <Info className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Current Status</span>
                  <span className="text-xs text-amber-500 font-medium leading-relaxed mt-0.5">{activeStone.currentStatus}</span>
                </div>
              </div>
            </div>

            {/* Related Movies List */}
            <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-neutral-800/40">
              <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider whitespace-nowrap">Featured Appearances</span>
              <div className="flex flex-wrap gap-1.5">
                {activeStone.featuredTitleIds.map((id) => {
                  const m = MCU_TITLES.find(t => t.id === id);
                  if (!m) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => onSelectMovie(id)}
                      className="text-[10px] font-sans bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors focus:outline-none"
                    >
                      {m.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
