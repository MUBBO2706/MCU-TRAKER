import React from 'react';
import { MCU_TITLES } from '../data/mcuData';
import { UserWatchData } from '../types';
import { TrendingUp, Film, Clock, Heart, Award, CheckCircle } from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';

interface AnalyticsDashProps {
  watchData: Record<string, UserWatchData>;
  favoritePhase: string;
  setFavoritePhase: (val: string) => void;
  favoriteCharacter: string;
  setFavoriteCharacter: (val: string) => void;
  activeTheme?: string;
  orderingMode: 'theatrical' | 'chronological';
  setOrderingMode: (val: 'theatrical' | 'chronological') => void;
  isLightMode?: boolean;
}

export const AnalyticsDash: React.FC<AnalyticsDashProps> = ({
  watchData,
  favoritePhase,
  setFavoritePhase,
  favoriteCharacter,
  setFavoriteCharacter,
  activeTheme = 'oled',
  orderingMode,
  setOrderingMode,
  isLightMode = false,
}) => {
  // Aggregate stats
  const totalTitles = MCU_TITLES.length;
  const completedTitles = MCU_TITLES.filter((m) => watchData[m.id]?.status === 'completed');
  const watchingTitles = MCU_TITLES.filter((m) => watchData[m.id]?.status === 'watching');
  const watchLaterTitles = MCU_TITLES.filter((m) => watchData[m.id]?.status === 'later');

  const totalMovies = MCU_TITLES.filter((m) => m.type === 'movie');
  const totalSeries = MCU_TITLES.filter((m) => m.type === 'series');

  const completedMovies = totalMovies.filter((m) => watchData[m.id]?.status === 'completed');
  const completedSeries = totalSeries.filter((m) => watchData[m.id]?.status === 'completed');

  // Runtime calculation (minutes)
  const totalMinutes = MCU_TITLES.reduce((acc, m) => acc + m.runtimeMinutes, 0);
  const watchedMinutes = MCU_TITLES.reduce((acc, m) => {
    const isCompleted = watchData[m.id]?.status === 'completed';
    const isWatching = watchData[m.id]?.status === 'watching';
    if (isCompleted) return acc + m.runtimeMinutes;
    if (isWatching) return acc + Math.round(m.runtimeMinutes / 2); // assume 50% watched
    return acc;
  }, 0);

  const remainingMinutes = Math.max(0, totalMinutes - watchedMinutes);
  const hoursWatched = Math.round((watchedMinutes / 60) * 10) / 10;
  const hoursRemaining = Math.round((remainingMinutes / 60) * 10) / 10;

  // Phase aggregation
  const phases = [1, 2, 3, 4, 5, 6];
  const phaseStats = phases.map((p) => {
    const phaseTitles = MCU_TITLES.filter((m) => m.phase === p);
    const completed = phaseTitles.filter((m) => watchData[m.id]?.status === 'completed');
    return {
      phase: p,
      total: phaseTitles.length,
      completed: completed.length,
      pct: phaseTitles.length > 0 ? (completed.length / phaseTitles.length) * 100 : 0,
    };
  });

  // Saga aggregation
  const sagas = ['Infinity Saga', 'Multiverse Saga', 'Future Saga'] as const;
  const sagaStats = sagas.map((s) => {
    const sagaTitles = MCU_TITLES.filter((m) => m.saga === s);
    const completed = sagaTitles.filter((m) => watchData[m.id]?.status === 'completed');
    return {
      saga: s,
      total: sagaTitles.length,
      completed: completed.length,
      pct: sagaTitles.length > 0 ? (completed.length / sagaTitles.length) * 100 : 0,
    };
  });

  // Calculate overall rating average
  const ratedTitles = MCU_TITLES.filter((m) => watchData[m.id]?.status === 'completed' && watchData[m.id]?.rating > 0);
  const averageRating =
    ratedTitles.length > 0
      ? Math.round(
          (ratedTitles.reduce((acc, m) => acc + watchData[m.id].rating, 0) / ratedTitles.length) * 10
        ) / 10
      : 0;

  return (
    <div className="flex flex-col gap-6" id="analytics-section">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display font-bold text-2xl tracking-tight text-white flex items-center gap-2">
          <TrendingUp className="text-marvel w-6 h-6" />
          Analytics
        </h2>
        <p className="font-sans text-xs text-neutral-400">
          A high-precision look into your Marvel watching stats, completion metrics, and custom preferences.
        </p>
      </div>

      {/* Grid Overview Cards & Details layout wrapper */}
      <div className="flex flex-col gap-8">
        {/* Row 1: Stats & Intel Preferences */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="analytics-grid-layout">
          {/* Left Column: Stats (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Card 1: Movies Tracked - Red Accent Border */}
            <div className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl border flex flex-col justify-between transition-all h-[100px] sm:h-[106px] ${
              isLightMode
                ? 'bg-white border-red-200 text-slate-900'
                : 'bg-neutral-950 border-red-950/60 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[9px] sm:text-[10px] uppercase font-mono font-bold tracking-wider whitespace-nowrap overflow-hidden text-ellipsis ${
                  isLightMode ? 'text-slate-500' : 'text-neutral-400'
                }`}>
                  Movies Tracked
                </span>
                <div className={`p-1 rounded-lg flex-shrink-0 ${
                  isLightMode ? 'bg-red-50 text-marvel' : 'bg-red-950/50 text-marvel'
                }`}>
                  <Film className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex flex-col gap-0">
                <div className="font-display font-extrabold text-sm min-[360px]:text-base sm:text-xl md:text-2xl tracking-tight leading-none">
                  {completedMovies.length} <span className="text-xs font-mono font-normal opacity-70">/ {totalMovies.length}</span>
                </div>
                <span className={`text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono block whitespace-nowrap overflow-hidden text-ellipsis ${
                  isLightMode ? 'text-slate-500' : 'text-neutral-500'
                }`}>
                  Titles Completed
                </span>
              </div>
              <div className={`pt-0.5 sm:pt-1 border-t flex justify-between items-center text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono tracking-tight leading-none truncate whitespace-nowrap ${
                isLightMode ? 'border-slate-100 text-slate-500' : 'border-neutral-900/60 text-neutral-500'
              }`}>
                <span className="truncate">Progress: {totalMovies.length > 0 ? Math.round((completedMovies.length / totalMovies.length) * 100) : 0}% movie runtime</span>
                <span className="hidden md:inline truncate ml-2 opacity-80">Total: {totalMovies.length}</span>
              </div>
            </div>

            {/* Card 2: Series Completed - Emerald Accent Border */}
            <div className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl border flex flex-col justify-between transition-all h-[100px] sm:h-[106px] ${
              isLightMode
                ? 'bg-white border-emerald-200 text-slate-900'
                : 'bg-neutral-950 border-emerald-950/60 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[9px] sm:text-[10px] uppercase font-mono font-bold tracking-wider whitespace-nowrap overflow-hidden text-ellipsis ${
                  isLightMode ? 'text-slate-500' : 'text-neutral-400'
                }`}>
                  Series Completed
                </span>
                <div className={`p-1 rounded-lg flex-shrink-0 ${
                  isLightMode ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-950/50 text-emerald-400'
                }`}>
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex flex-col gap-0">
                <div className="font-display font-extrabold text-sm min-[360px]:text-base sm:text-xl md:text-2xl tracking-tight leading-none text-emerald-500">
                  {completedSeries.length} <span className="text-xs font-mono font-normal opacity-70">/ {totalSeries.length}</span>
                </div>
                <span className={`text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono block whitespace-nowrap overflow-hidden text-ellipsis ${
                  isLightMode ? 'text-slate-500' : 'text-neutral-500'
                }`}>
                  Seasons Completed
                </span>
              </div>
              <div className={`pt-0.5 sm:pt-1 border-t flex justify-between items-center text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono tracking-tight leading-none truncate whitespace-nowrap ${
                isLightMode ? 'border-slate-100 text-slate-500' : 'border-neutral-900/60 text-neutral-500'
              }`}>
                <span className="truncate">Progress: {totalSeries.length > 0 ? Math.round((completedSeries.length / totalSeries.length) * 100) : 0}% show runtime</span>
                <span className="hidden md:inline truncate ml-2 opacity-80">Total: {totalSeries.length}</span>
              </div>
            </div>

            {/* Card 3: Hours Watched - Blue Accent Border */}
            <div className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl border flex flex-col justify-between transition-all h-[100px] sm:h-[106px] ${
              isLightMode
                ? 'bg-white border-blue-200 text-slate-900'
                : 'bg-neutral-950 border-blue-950/60 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[9px] sm:text-[10px] uppercase font-mono font-bold tracking-wider whitespace-nowrap overflow-hidden text-ellipsis ${
                  isLightMode ? 'text-slate-500' : 'text-neutral-400'
                }`}>
                  Hours Watched
                </span>
                <div className={`p-1 rounded-lg flex-shrink-0 ${
                  isLightMode ? 'bg-blue-50 text-blue-600' : 'bg-blue-950/50 text-blue-400'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex flex-col gap-0">
                <div className="font-display font-extrabold text-sm min-[360px]:text-base sm:text-xl md:text-2xl tracking-tight leading-none text-blue-500">
                  {hoursWatched} <span className="text-xs font-mono font-normal opacity-70">Hours</span>
                </div>
                <span className={`text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono block whitespace-nowrap overflow-hidden text-ellipsis ${
                  isLightMode ? 'text-slate-500' : 'text-neutral-500'
                }`}>
                  Screen Time Logged ({Math.round((watchedMinutes / totalMinutes) * 100)}%)
                </span>
              </div>
              <div className={`pt-0.5 sm:pt-1 border-t flex justify-between items-center text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono tracking-tight leading-none truncate whitespace-nowrap ${
                isLightMode ? 'border-slate-100 text-slate-500' : 'border-neutral-900/60 text-neutral-500'
              }`}>
                <span className="truncate">Est. {hoursRemaining} hours remaining</span>
                <span className="hidden md:inline truncate ml-2 opacity-80">Logged: {Math.round((watchedMinutes / Math.max(1, totalMinutes)) * 100)}%</span>
              </div>
            </div>

            {/* Card 4: Average Rating - Amber Accent Border */}
            <div className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl border flex flex-col justify-between transition-all h-[100px] sm:h-[106px] ${
              isLightMode
                ? 'bg-white border-amber-200 text-slate-900'
                : 'bg-neutral-950 border-amber-950/60 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[9px] sm:text-[10px] uppercase font-mono font-bold tracking-wider whitespace-nowrap overflow-hidden text-ellipsis ${
                  isLightMode ? 'text-slate-500' : 'text-neutral-400'
                }`}>
                  Average Rating
                </span>
                <div className={`p-1 rounded-lg flex-shrink-0 ${
                  isLightMode ? 'bg-amber-50 text-amber-600' : 'bg-amber-950/50 text-amber-400'
                }`}>
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex flex-col gap-0">
                <div className="font-display font-extrabold text-sm min-[360px]:text-base sm:text-xl md:text-2xl tracking-tight leading-none text-amber-400">
                  {averageRating > 0 ? `${averageRating} ★` : 'No rating'}
                </div>
                <span className={`text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono block whitespace-nowrap overflow-hidden text-ellipsis ${
                  isLightMode ? 'text-slate-500' : 'text-neutral-500'
                }`}>
                  Personal Rated Score
                </span>
              </div>
              <div className={`pt-0.5 sm:pt-1 border-t flex justify-between items-center text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono tracking-tight leading-none truncate whitespace-nowrap ${
                isLightMode ? 'border-slate-100 text-slate-500' : 'border-neutral-900/60 text-neutral-500'
              }`}>
                <span className="truncate">Total Rated: {ratedTitles.length} of {completedTitles.length} completed</span>
                <span className="hidden md:inline truncate ml-2 opacity-80">Rated: {Math.round((ratedTitles.length / Math.max(1, completedTitles.length)) * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Right Column: Intel Preferences (Personalize) */}
          <div className="flex flex-col gap-4 relative z-30 pt-6 lg:pt-0 border-t lg:border-t-0 border-neutral-900/60">
            <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider font-display flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-marvel" />
              Intel Preferences (Personalize)
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-400">Favorite MCU Phase</label>
                <CustomDropdown
                  value={favoritePhase}
                  onChange={setFavoritePhase}
                  options={[
                    { value: '', label: 'None Selected' },
                    { value: 'Phase 1', label: 'Phase 1: Assemble' },
                    { value: 'Phase 2', label: 'Phase 2: Age of Ultron' },
                    { value: 'Phase 3', label: 'Phase 3: Endgame Peak' },
                    { value: 'Phase 4', label: 'Phase 4: Multiverse Begins' },
                    { value: 'Phase 5', label: 'Phase 5: Quantum Power' },
                    { value: 'Phase 6', label: 'Phase 6: Secret Wars Future' },
                  ]}
                  activeTheme={activeTheme as any}
                  placeholder="Select Phase"
                  align="left"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-400">Favorite Character</label>
                <CustomDropdown
                  value={favoriteCharacter}
                  onChange={setFavoriteCharacter}
                  options={[
                    { value: '', label: 'None Selected' },
                    { value: 'Iron Man', label: 'Iron Man (Tony Stark)' },
                    { value: 'Captain America', label: 'Captain America (Steve Rogers)' },
                    { value: 'Thor', label: 'Thor Odinson' },
                    { value: 'Loki', label: 'Loki Laufeyson' },
                    { value: 'Scarlet Witch', label: 'Scarlet Witch (Wanda)' },
                    { value: 'Spider-Man', label: 'Spider-Man (Peter Parker)' },
                    { value: 'Doctor Strange', label: 'Doctor Strange' },
                    { value: 'Deadpool', label: 'Deadpool' },
                    { value: 'Wolverine', label: 'Wolverine' },
                  ]}
                  activeTheme={activeTheme as any}
                  placeholder="Select Character"
                  align="right"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Sagas & Phases Grid Container (side-by-side on tablet and desktop, stacked on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-neutral-900/60">
          {/* Sagas Progress Card */}
          <div className="flex flex-col gap-4">
            <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider font-display">Sagas Completion Progress</span>
            <div className="flex flex-col gap-4">
              {sagaStats.map((stat) => (
                <div key={stat.saga} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white font-medium">{stat.saga}</span>
                    <span className="text-neutral-400 font-mono">
                      {stat.completed}/{stat.total} ({Math.round(stat.pct)}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/60">
                    <div
                      className="h-full bg-gradient-to-r from-marvel to-red-500 transition-all duration-1000 rounded-full"
                      style={{ width: `${stat.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phases Visual Breakdown */}
          <div className="flex flex-col gap-4">
            <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider font-display">MCU Phases Track Sheet</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {phaseStats.map((stat) => (
                <div key={stat.phase} className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800/40 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-display font-semibold text-xs text-neutral-300">Phase {stat.phase}</span>
                    <span className="text-[10px] font-mono text-neutral-500">{stat.completed}/{stat.total}</span>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <span className="text-white font-display font-bold text-lg leading-none">
                      {Math.round(stat.pct)}%
                    </span>
                    <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-marvel transition-all duration-1000" style={{ width: `${stat.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
