import React from 'react';

interface MCULoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  sublabel?: string;
  isLightMode?: boolean;
  className?: string;
}

export function MCULoader({
  size = 'md',
  label,
  sublabel,
  isLightMode = false,
  className = '',
}: MCULoaderProps) {
  // Size mappings
  const containerSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const coreSizes = {
    sm: 'w-2 h-2',
    md: 'w-3.5 h-3.5',
    lg: 'w-5 h-5',
    xl: 'w-8 h-8',
  };

  const textSizes = {
    sm: 'text-[9px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 select-none ${className}`}>
      <div className={`relative flex items-center justify-center ${containerSizes[size]}`}>
        {/* Outer HUD Ring (Clockwise) */}
        <div
          className={`absolute inset-0 rounded-full border-2 border-dashed animate-[spin_6s_linear_infinite] ${
            isLightMode
              ? 'border-slate-400/70'
              : 'border-red-500/40'
          }`}
        />

        {/* Middle Energy Arc Ring (Counter-Clockwise) */}
        <div
          className={`absolute inset-1 rounded-full border-2 border-t-marvel border-r-transparent border-b-cyan-500 border-l-transparent animate-[spin_2.5s_linear_infinite_reverse] ${
            isLightMode ? 'opacity-90' : 'opacity-100 shadow-[0_0_12px_rgba(226,54,54,0.4)]'
          }`}
        />

        {/* Inner Pulsing Core (Arc Reactor Core) */}
        <div
          className={`rounded-full animate-pulse flex items-center justify-center ${coreSizes[size]} ${
            isLightMode
              ? 'bg-red-600 shadow-md'
              : 'bg-marvel shadow-[0_0_15px_rgba(226,54,54,0.8)]'
          }`}
        >
          <div className="w-1/2 h-1/2 rounded-full bg-white/80" />
        </div>
      </div>

      {(label || sublabel) && (
        <div className="flex flex-col items-center text-center">
          {label && (
            <span
              className={`font-mono font-bold uppercase tracking-widest ${textSizes[size]} ${
                isLightMode ? 'text-slate-800' : 'text-neutral-200'
              }`}
            >
              {label}
            </span>
          )}
          {sublabel && (
            <span
              className={`font-sans text-[10px] mt-0.5 ${
                isLightMode ? 'text-slate-500' : 'text-neutral-500'
              }`}
            >
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
