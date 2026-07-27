import React from 'react';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 120,
  strokeWidth = 10,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div 
      className="relative flex items-center justify-center w-full h-full aspect-square" 
      style={{ maxWidth: size, maxHeight: size }}
    >
      <svg 
        viewBox={`0 0 ${size} ${size}`} 
        className="w-full h-full transform -rotate-90"
      >
        {/* Background Circle */}
        <circle
          className="text-neutral-800"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Foreground Glowing Progress Circle */}
        <circle
          className="transition-all duration-1000 ease-out"
          stroke="#e62429"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            filter: 'drop-shadow(0px 0px 4px rgba(230, 36, 41, 0.6))',
          }}
        />
      </svg>
      {/* Centered Text */}
      <div className="absolute flex flex-col items-center justify-center text-center px-1">
        <span className="font-display font-bold text-xs xs:text-sm sm:text-base md:text-lg text-white leading-none">
          {Math.round(percentage)}%
        </span>
        <span className="font-sans text-[7px] xs:text-[8px] sm:text-[9px] text-neutral-400 uppercase tracking-wider font-semibold mt-0.5 leading-none">
          Done
        </span>
      </div>
    </div>
  );
};
