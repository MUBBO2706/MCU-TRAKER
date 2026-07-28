import React from 'react';
import { MCU_TITLES, THEATRICAL_ORDER_IDS, CHRONOLOGICAL_ORDER_IDS } from '../../data/mcuData';
import { UserWatchData, McuTitle, ThemeType } from '../../types';
import { ProgressRing } from '../ProgressRing';
import { LazyImage } from '../LazyImage';
import { Shield, Clock, AlertCircle, Zap, CheckCircle2, Eye, TrendingUp, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface DashboardTabProps {
  watchData: Record<string, UserWatchData>;
  countdownString: string;
  completionPercentage: number;
  quoteOfTheDay: { text: string; character: string; title: string };
  nextRecommendation: McuTitle | null;
  handleSelectMovieId: (id: string) => void;
  orderingMode: 'theatrical' | 'chronological';
  activeTheme?: ThemeType;
  chartPreference?: 'bar' | 'line';
  updatePreference?: (key: string, value: any) => void;
}

export function DashboardTab({
  watchData,
  countdownString,
  completionPercentage,
  quoteOfTheDay,
  nextRecommendation,
  handleSelectMovieId,
  orderingMode,
  activeTheme,
  chartPreference = 'bar',
  updatePreference,
}: DashboardTabProps) {
  const [secondsTick, setSecondsTick] = React.useState<number>(0);
  const [chartType, setChartType] = React.useState<'bar' | 'line'>(chartPreference);
  const [activeBarIndex, setActiveBarIndex] = React.useState<number | null>(null);
  const [activeLineIndex, setActiveLineIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (chartPreference && chartPreference !== chartType) {
      setChartType(chartPreference);
    }
  }, [chartPreference]);

  const toggleChartType = (type: 'bar' | 'line') => {
    setChartType(type);
    if (updatePreference) {
      updatePreference('chartPreference', type);
    }
  };

  const isLightMode = activeTheme?.startsWith('light-') || false;

  const completedTitles = MCU_TITLES.filter((m) => watchData[m.id]?.status === 'completed');
  const completedCount = completedTitles.length;
  const totalCount = MCU_TITLES.length;
  const hoursTracked = Math.round(
    completedTitles.reduce((acc, m) => acc + m.runtimeMinutes, 0) / 60
  );
  const remainingCount = totalCount - completedCount;

  const infinityCompleted = completedTitles.filter((m) => m.saga === 'Infinity Saga').length;
  const multiverseCompleted = completedTitles.filter((m) => m.saga === 'Multiverse Saga').length;
  const totalMinutes = MCU_TITLES.reduce((acc, m) => acc + m.runtimeMinutes, 0);
  const watchedMinutes = completedTitles.reduce((acc, m) => acc + m.runtimeMinutes, 0);
  const hoursRemaining = Math.round((totalMinutes - watchedMinutes) / 60);

  // Phase completion statistics for the bar chart
  const phases = [1, 2, 3, 4, 5, 6];
  const phaseStats = phases.map((phase) => {
    const titlesInPhase = MCU_TITLES.filter((m) => m.phase === phase);
    const completedInPhase = titlesInPhase.filter((m) => watchData[m.id]?.status === 'completed').length;
    const percentage = titlesInPhase.length > 0 ? Math.round((completedInPhase / titlesInPhase.length) * 100) : 0;
    return {
      phase: `Phase ${phase}`,
      completed: completedInPhase,
      total: titlesInPhase.length,
      percentage,
    };
  });

  // Seconds ticking effect for high-fidelity live update
  React.useEffect(() => {
    const interval = setInterval(() => {
      setSecondsTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const orderList = nextRecommendation ? (orderingMode === 'theatrical' ? THEATRICAL_ORDER_IDS : CHRONOLOGICAL_ORDER_IDS) : [];
  const orderIndex = nextRecommendation ? orderList.indexOf(nextRecommendation.id) + 1 : 0;

  // Dynamic Phase 6 Multiverse Saga target event dates
  const doomsdayDate = new Date('2026-12-18T00:00:00');
  const secretWarsDate = new Date('2027-05-07T00:00:00');
  const now = new Date();

  const targetEvent = {
    title: 'Avengers: Doomsday',
    date: doomsdayDate,
    displayDate: 'December 18, 2026',
    nextEvent: 'Avengers: Secret Wars (May 7, 2027)'
  };

  const diff = targetEvent.date.getTime() - now.getTime();
  
  let days = 0, hours = 0, minutes = 0, seconds = 0;
  if (diff > 0) {
    days = Math.floor(diff / (1000 * 60 * 60 * 24));
    hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    minutes = Math.floor((diff / (1000 * 60)) % 60);
    seconds = Math.floor((diff / 1000) % 60);
  }

  // Calibration loop (counts down within 15 minutes chunks)
  const currentMinutes = now.getMinutes();
  const currentSeconds = now.getSeconds();
  const minutesToNextSync = 14 - (currentMinutes % 15);
  const secondsToNextSync = 59 - currentSeconds;
  const tvaSyncString = `${String(minutesToNextSync).padStart(2, '0')}m ${String(secondsToNextSync).padStart(2, '0')}s`;

  // Rotate supporting alert messages every 6 seconds
  const alerts = [
    { text: "TVA Secure Link Active. Monitoring 4.8M+ reality lines...", type: "info" },
    { text: "Quantum energy spikes registered near Sector-616 coordinates.", type: "energy" },
    { text: "Multiversal convergence vectors converging. Focus timeline: Earth-616.", type: "danger" }
  ];
  const alertIndex = Math.floor(secondsTick / 6) % alerts.length;
  const activeAlert = alerts[alertIndex];

  return (
    <>
      {/* S.H.I.E.L.D. Multiverse Command & Countdown Hub */}
      <div className="relative rounded-xl p-4 sm:p-5 overflow-hidden flex flex-col gap-3.5 md:gap-4 border border-red-950/40 bg-gradient-to-br from-neutral-950 via-red-950/20 to-neutral-950 md:min-h-[13rem]" id="dashboard-hero-countdown">
        {/* Cover backdrop elements */}
        <div className="absolute inset-0 opacity-15 bg-gradient-to-r from-red-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-red-500/10 to-transparent blur-3xl rounded-full pointer-events-none" />

        {/* Header Title */}
        <div className="flex flex-col text-left z-10 pb-2.5 border-b border-red-950/20">
          <h3 className="font-display font-bold text-xs text-neutral-200 tracking-wide uppercase">
            MULTIVERSE INCURSION ALERT
          </h3>
          <span className="text-[10px] font-sans text-neutral-400 mt-0.5">
            Multiverse Saga Event Tracker — Earth-616 Focus
          </span>
        </div>

        {/* Dynamic Card Content Area: Containerless & Naturally Flowing Grid */}
        <div className="z-10 flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 items-center">
          {/* Left Side: Countdown Timer & Timeline Progress */}
          <div className="md:col-span-7 flex flex-col gap-3.5 text-left">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">
              Countdown to {targetEvent.title}
            </span>
            {/* Countdown string & labels presented purely through premium typography without nested boxes */}
            <div className="flex items-baseline gap-1.5 text-left">
              <span className="font-mono text-3xl font-extrabold text-white tracking-tight">
                {String(days).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-mono uppercase text-red-400 font-bold mr-2">d</span>

              <span className="font-mono text-3xl font-extrabold text-white tracking-tight">
                {String(hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-mono uppercase text-red-400 font-bold mr-2">h</span>

              <span className="font-mono text-3xl font-extrabold text-white tracking-tight">
                {String(minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-mono uppercase text-red-400 font-bold mr-2">m</span>

              <span className="font-mono text-3xl font-extrabold text-white tracking-tight">
                {String(seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-mono uppercase text-red-400 font-bold">s</span>
            </div>

            {/* Simple Progress bar */}
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 w-full bg-red-950/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full" style={{ width: '74.2%' }} />
              </div>
              <div className="flex justify-between items-center text-[9px] font-mono font-medium text-neutral-400">
                <span>Timeline Convergence Vector</span>
                <span className="text-red-400 font-bold">74.2% Converged</span>
              </div>
            </div>
          </div>

          {/* Right Side: Key TVA Metrics & Next Milestones (Desktop only) */}
          <div className="hidden md:flex md:col-span-5 flex-col gap-2.5 text-left md:border-l border-red-950/20 md:pl-6 pt-1 md:pt-0">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Active Realities Tracked</span>
              <span className="font-mono text-sm font-extrabold text-neutral-200">
                {(4812042 + Math.floor(secondsTick * 1.3)).toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Next Major Convergence</span>
              <span className="font-display font-semibold text-xs text-red-400">
                {targetEvent.title} ({targetEvent.displayDate})
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Following Milestone</span>
              <span className="font-sans font-medium text-[11px] text-neutral-300">
                {targetEvent.nextEvent}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards & Data Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch" id="dashboard-stats-section">
        {/* Left half: 2 x 2 Stat Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Card 1: Completed - Red Accent Border */}
          <div className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl border flex flex-col justify-between transition-all h-[100px] sm:h-[106px] ${
            isLightMode
              ? 'bg-white border-red-200 text-slate-900'
              : 'bg-neutral-950 border-red-950/60 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[9px] sm:text-[10px] uppercase font-mono font-bold tracking-wider whitespace-nowrap overflow-hidden text-ellipsis ${
                isLightMode ? 'text-slate-500' : 'text-neutral-400'
              }`}>
                Completed
              </span>
              <div className={`p-1 rounded-lg flex-shrink-0 ${
                isLightMode ? 'bg-red-50 text-marvel' : 'bg-red-950/50 text-marvel'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex flex-col gap-0">
              <div className="font-display font-extrabold text-sm min-[360px]:text-base sm:text-xl md:text-2xl tracking-tight leading-none">
                {completedCount} <span className="text-xs font-mono font-normal opacity-70">/ {totalCount}</span>
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
              <span className="truncate">Sagas: {infinityCompleted} Inf / {multiverseCompleted} Multi</span>
              <span className="hidden md:inline truncate ml-2 opacity-80">Remaining: {remainingCount}</span>
            </div>
          </div>

          {/* Card 2: Hours Tracked - Emerald Accent Border */}
          <div className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl border flex flex-col justify-between transition-all h-[100px] sm:h-[106px] ${
            isLightMode
              ? 'bg-white border-emerald-200 text-slate-900'
              : 'bg-neutral-950 border-emerald-950/60 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[9px] sm:text-[10px] uppercase font-mono font-bold tracking-wider whitespace-nowrap overflow-hidden text-ellipsis ${
                isLightMode ? 'text-slate-500' : 'text-neutral-400'
              }`}>
                Hours Tracked
              </span>
              <div className={`p-1 rounded-lg flex-shrink-0 ${
                isLightMode ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-950/50 text-emerald-400'
              }`}>
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex flex-col gap-0">
              <div className="font-display font-extrabold text-sm min-[360px]:text-base sm:text-xl md:text-2xl tracking-tight leading-none text-emerald-500">
                {hoursTracked} <span className="text-xs font-mono font-normal opacity-70">Hours</span>
              </div>
              <span className={`text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono block whitespace-nowrap overflow-hidden text-ellipsis ${
                isLightMode ? 'text-slate-500' : 'text-neutral-500'
              }`}>
                Screen Time Logged
              </span>
            </div>
            <div className={`pt-0.5 sm:pt-1 border-t flex justify-between items-center text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono tracking-tight leading-none truncate whitespace-nowrap ${
              isLightMode ? 'border-slate-100 text-slate-500' : 'border-neutral-900/60 text-neutral-500'
            }`}>
              <span className="truncate">Est. {hoursRemaining} hours remaining</span>
              <span className="hidden md:inline truncate ml-2 opacity-80">Logged: {Math.round((watchedMinutes / Math.max(1, totalMinutes)) * 100)}%</span>
            </div>
          </div>

          {/* Card 3: Watched - Blue Accent Border */}
          <div className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl border flex flex-col justify-between transition-all h-[100px] sm:h-[106px] ${
            isLightMode
              ? 'bg-white border-blue-200 text-slate-900'
              : 'bg-neutral-950 border-blue-950/60 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[9px] sm:text-[10px] uppercase font-mono font-bold tracking-wider whitespace-nowrap overflow-hidden text-ellipsis ${
                isLightMode ? 'text-slate-500' : 'text-neutral-400'
              }`}>
                Watched
              </span>
              <div className={`p-1 rounded-lg flex-shrink-0 ${
                isLightMode ? 'bg-blue-50 text-blue-600' : 'bg-blue-950/50 text-blue-400'
              }`}>
                <Eye className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex flex-col gap-0">
              <div className="font-display font-extrabold text-sm min-[360px]:text-base sm:text-xl md:text-2xl tracking-tight leading-none text-blue-400">
                {completedCount} <span className="text-xs font-mono font-normal opacity-70">Watched</span>
              </div>
              <span className={`text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono block whitespace-nowrap overflow-hidden text-ellipsis ${
                isLightMode ? 'text-slate-500' : 'text-neutral-500'
              }`}>
                {completionPercentage.toFixed(1)}% Progress
              </span>
            </div>
            <div className={`pt-0.5 sm:pt-1 border-t flex justify-between items-center text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono tracking-tight leading-none truncate whitespace-nowrap ${
              isLightMode ? 'border-slate-100 text-slate-500' : 'border-neutral-900/60 text-neutral-500'
            }`}>
              <span className="truncate">Remaining: {remainingCount} watch targets</span>
              <span className="hidden md:inline truncate ml-2 opacity-80">Progress: {completionPercentage.toFixed(0)}%</span>
            </div>
          </div>

          {/* Card 4: Completion Rate - Amber Accent Border */}
          <div className={`px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl border flex flex-col justify-between transition-all h-[100px] sm:h-[106px] ${
            isLightMode
              ? 'bg-white border-amber-200 text-slate-900'
              : 'bg-neutral-950 border-amber-950/60 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[9px] sm:text-[10px] uppercase font-mono font-bold tracking-wider whitespace-nowrap overflow-hidden text-ellipsis ${
                isLightMode ? 'text-slate-500' : 'text-neutral-400'
              }`}>
                Completion Rate
              </span>
              <div className={`p-1 rounded-lg flex-shrink-0 ${
                isLightMode ? 'bg-amber-50 text-amber-600' : 'bg-amber-950/50 text-amber-400'
              }`}>
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex flex-col gap-0">
              <div className="font-display font-extrabold text-sm min-[360px]:text-base sm:text-xl md:text-2xl tracking-tight leading-none text-amber-400">
                {completionPercentage.toFixed(1)}%
              </div>
              <span className={`text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono block whitespace-nowrap overflow-hidden text-ellipsis ${
                isLightMode ? 'text-slate-500' : 'text-neutral-500'
              }`}>
                {remainingCount} Titles Remaining
              </span>
            </div>
            <div className={`pt-0.5 sm:pt-1 border-t flex justify-between items-center text-[8px] min-[360px]:text-[9px] sm:text-[10px] font-mono tracking-tight leading-none truncate whitespace-nowrap ${
              isLightMode ? 'border-slate-100 text-slate-500' : 'border-neutral-900/60 text-neutral-500'
            }`}>
              <span className="truncate">Total watched: {completedCount} / {totalCount}</span>
              <span className="hidden md:inline truncate ml-2 opacity-80">Phase 1-6 Target</span>
            </div>
          </div>
        </div>

        {/* Right half: Phase Completion Bar/Line Chart (container-less, seamlessly integrated into dashboard) */}
        <div className="flex flex-col justify-between py-1 px-0.5 min-w-0">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-neutral-800/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider font-display">
                Phase Progress Breakdown
              </span>
            </div>
            
            {/* Toggle Bar / Line chart button */}
            <div className={`flex items-center p-0.5 rounded-lg border text-[10px] font-mono ${
              isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-neutral-900 border-neutral-800'
            }`}>
              <button
                onClick={() => toggleChartType('bar')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? (isLightMode ? 'bg-white text-slate-900 shadow-xs font-bold' : 'bg-neutral-800 text-white font-bold')
                    : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
                }`}
                title="Bar Chart View"
              >
                <BarChart3 className="w-3 h-3" />
                <span className="hidden sm:inline">Bar</span>
              </button>
              <button
                onClick={() => toggleChartType('line')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                  chartType === 'line'
                    ? (isLightMode ? 'bg-white text-slate-900 shadow-xs font-bold' : 'bg-neutral-800 text-white font-bold')
                    : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
                }`}
                title="Line Graph View"
              >
                <LineChartIcon className="w-3 h-3" />
                <span className="hidden sm:inline">Line</span>
              </button>
            </div>
          </div>

          {/* Recharts Bar or Line Chart Container */}
          <div className="w-full h-52 sm:h-56 pt-2 outline-none focus:outline-none focus-within:outline-none select-none [&_*]:outline-none [&_*]:focus:outline-none [&_*]:[-webkit-tap-highlight-color:transparent]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  data={phaseStats}
                  margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
                  accessibilityLayer={false}
                  onMouseEnter={(state) => {
                    if (state && typeof state.activeTooltipIndex === 'number') {
                      setActiveBarIndex(state.activeTooltipIndex);
                    }
                  }}
                  onMouseLeave={() => setActiveBarIndex(null)}
                  onClick={(state) => {
                    if (state && typeof state.activeTooltipIndex === 'number') {
                      setActiveBarIndex(state.activeTooltipIndex);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? '#f1f5f9' : '#262626'} />
                  <XAxis
                    dataKey="phase"
                    stroke={isLightMode ? '#64748b' : '#a3a3a3'}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    stroke={isLightMode ? '#64748b' : '#a3a3a3'}
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={false}
                    offset={12}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="filter drop-shadow-md">
                            <div className={`p-2.5 rounded-xl border text-xs font-mono backdrop-blur-md ${
                              isLightMode
                                ? 'bg-white/95 border-slate-200 text-slate-900'
                                : 'bg-neutral-900/95 border-neutral-800 text-white'
                            }`}>
                              <div className="font-bold text-marvel uppercase mb-1">{data.phase}</div>
                              <div>Completed: {data.completed} / {data.total} titles</div>
                              <div className="text-emerald-500 font-bold mt-0.5">{data.percentage}% Completed</div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                    {phaseStats.map((entry, index) => {
                      const isSelected = activeBarIndex === index;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            isSelected
                              ? '#f43f5e'
                              : entry.percentage === 100
                              ? '#10b981'
                              : entry.percentage > 0
                              ? '#e23636'
                              : (isLightMode ? '#cbd5e1' : '#404040')
                          }
                          opacity={activeBarIndex !== null && !isSelected ? 0.5 : 1}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart
                  data={phaseStats}
                  margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
                  accessibilityLayer={false}
                  onMouseEnter={(state) => {
                    if (state && typeof state.activeTooltipIndex === 'number') {
                      setActiveLineIndex(state.activeTooltipIndex);
                    }
                  }}
                  onMouseLeave={() => setActiveLineIndex(null)}
                  onClick={(state) => {
                    if (state && typeof state.activeTooltipIndex === 'number') {
                      setActiveLineIndex(state.activeTooltipIndex);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? '#f1f5f9' : '#262626'} />
                  <XAxis
                    dataKey="phase"
                    stroke={isLightMode ? '#64748b' : '#a3a3a3'}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    stroke={isLightMode ? '#64748b' : '#a3a3a3'}
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={false}
                    offset={12}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="filter drop-shadow-md">
                            <div className={`p-2.5 rounded-xl border text-xs font-mono backdrop-blur-md ${
                              isLightMode
                                ? 'bg-white/95 border-slate-200 text-slate-900'
                                : 'bg-neutral-900/95 border-neutral-800 text-white'
                            }`}>
                              <div className="font-bold text-marvel uppercase mb-1">{data.phase}</div>
                              <div>Completed: {data.completed} / {data.total} titles</div>
                              <div className="text-emerald-500 font-bold mt-0.5">{data.percentage}% Completed</div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#e23636"
                    strokeWidth={3}
                    dot={(props: any) => {
                      const { cx, cy, index } = props;
                      const isSelected = activeLineIndex === index;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 7 : 5}
                          fill={isSelected ? '#f43f5e' : '#e23636'}
                          stroke={isLightMode ? '#ffffff' : '#0a0a0a'}
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 9, fill: '#f43f5e', stroke: isLightMode ? '#ffffff' : '#0a0a0a', strokeWidth: 3 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bento Grid layout for secondary features on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start" id="dashboard-bento-grid">
        <div className="space-y-5">
          {/* Continue Watching / Recommended Next Box */}
          {nextRecommendation && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider font-display whitespace-nowrap">
                    {orderingMode === 'theatrical' ? 'Theatrical Release Order' : 'Chronological Timeline Order'}
                  </span>
                </div>
                <span className="text-[8px] sm:text-[9px] font-mono text-neutral-500 whitespace-nowrap tracking-tight">
                  Saga: {nextRecommendation.saga.split(' ')[0]}
                </span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0 flex-grow">
                  <LazyImage
                    src={nextRecommendation.posterUrl}
                    alt={nextRecommendation.title}
                    className="w-16 aspect-[2/3] rounded-lg border border-neutral-800 flex-shrink-0"
                  />
                  <div className="flex-grow flex flex-col justify-center min-h-[6.5rem] py-0.5 min-w-0">
                    <div className="space-y-1.5 min-w-0">
                      <h4 className="font-display font-bold text-xs sm:text-sm text-white leading-tight truncate whitespace-nowrap">
                        {nextRecommendation.title}
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        {nextRecommendation.type === 'movie' ? 'Movie' : 'TV Series'} • {nextRecommendation.releaseYear} • {nextRecommendation.runtimeMinutes} min
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5 font-mono text-[8px] tracking-tight">
                        <span className="bg-neutral-900/80 border border-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded whitespace-nowrap">
                          Phase {nextRecommendation.phase}
                        </span>
                        <span className="bg-neutral-900/80 border border-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {orderingMode === 'theatrical' ? 'Theatrical' : 'Timeline'} #{orderIndex}
                        </span>
                        <span className="bg-neutral-900/80 border border-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded whitespace-nowrap uppercase">
                          IMDb {nextRecommendation.ratings.imdb}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => handleSelectMovieId(nextRecommendation.id)}
                    className="w-full md:w-max md:px-5 bg-marvel text-white font-semibold text-xs py-2 h-10 rounded-xl hover:bg-red-600 transition-colors text-center font-sans cursor-pointer whitespace-nowrap flex items-center justify-center"
                  >
                    Inspect Detailed Intel
                  </button>
                </div>
              </div>

              {nextRecommendation.importantNotes && (
                <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800 text-[11px] text-neutral-300 italic leading-relaxed">
                  💡 <span className="font-semibold not-italic text-marvel">Important:</span> {nextRecommendation.importantNotes}
                </div>
              )}
            </div>
          )}

          {/* Dynamic Quote of the Day */}
          {quoteOfTheDay.text && (
            <div className="flex flex-col gap-2.5 relative pt-1 pb-2">
              <span className="text-[8px] uppercase font-bold text-neutral-500 tracking-widest font-mono">
                S.H.I.E.L.D. Quote of the Day
              </span>
              <blockquote className="font-display font-medium text-sm text-neutral-200 italic leading-relaxed pr-2">
                "{quoteOfTheDay.text}"
              </blockquote>
              <cite className="not-italic text-[10px] text-marvel font-semibold text-right">
                — {quoteOfTheDay.character}, <span className="text-neutral-500">{quoteOfTheDay.title}</span>
              </cite>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* S.H.I.E.L.D. Operations Briefing Card */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-800/60 pb-2">
              <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider font-display">
                S.H.I.E.L.D. Operations Briefing
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-xs text-neutral-300 leading-relaxed">
                S.H.I.E.L.D. databases are fully synchronized. Below is a live operational breakdown of your timeline progression:
              </div>

              {/* Movies Progress */}
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                  <span>Movies Completed</span>
                  <span>
                    {MCU_TITLES.filter(m => m.type === 'movie' && watchData[m.id]?.status === 'completed').length} / {MCU_TITLES.filter(m => m.type === 'movie').length}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-marvel transition-all duration-1000"
                    style={{
                      width: `${
                        (MCU_TITLES.filter(m => m.type === 'movie' && watchData[m.id]?.status === 'completed').length /
                          Math.max(1, MCU_TITLES.filter(m => m.type === 'movie').length)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* TV Shows Progress */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                  <span>TV Series Completed</span>
                  <span>
                    {MCU_TITLES.filter(m => m.type === 'series' && watchData[m.id]?.status === 'completed').length} / {MCU_TITLES.filter(m => m.type === 'series').length}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-1000"
                    style={{
                      width: `${
                        (MCU_TITLES.filter(m => m.type === 'series' && watchData[m.id]?.status === 'completed').length /
                          Math.max(1, MCU_TITLES.filter(m => m.type === 'series').length)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>
    </>
  );
}
