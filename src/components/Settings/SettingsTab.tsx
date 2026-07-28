import React, { useState, useEffect } from 'react';
import { Download, Upload, Database, RotateCcw, Settings, Zap, Smartphone, Sparkles, Cpu } from 'lucide-react';
import { CacheProgress } from '../Profile/ProfileTab';
import { ConfirmationModal } from '../Common/ConfirmationModal';
import { ThemeType, ThemeMode } from '../../types';

interface SettingsTabProps {
  activeTheme: ThemeType;
  themeMode?: ThemeMode;
  updatePreference: (key: string, value: any) => void;
  orderingMode: 'theatrical' | 'chronological';
  handleExportData: () => void;
  isRestoring: boolean;
  restoreProgress: string;
  handleImportData: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  cacheProgress: CacheProgress;
  startPreCaching: (force?: boolean) => Promise<void>;
  clearCache: () => Promise<void>;
  developerMode: boolean;
  showFeedback: (message: string, type?: 'success' | 'error' | 'info') => void;
  authToken: string | null;
  handleResetProgress: () => void;
  setShowDeleteAccountModal: (val: boolean) => void;
  watchData?: Record<string, any>;
  user?: any;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  activeTheme,
  themeMode = 'dark',
  updatePreference,
  orderingMode,
  handleExportData,
  isRestoring,
  restoreProgress,
  handleImportData,
  cacheProgress,
  startPreCaching,
  clearCache,
  developerMode,
  showFeedback,
  authToken,
  handleResetProgress,
  setShowDeleteAccountModal,
  watchData = {} as any,
  user = {} as any,
}) => {
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(() => user?.preferences?.lastBackupAt || localStorage.getItem('mcu_last_backup_time'));
  const [lastRestore, setLastRestore] = useState<string | null>(() => user?.preferences?.lastRestoreAt || localStorage.getItem('mcu_last_restore_time'));

  // PWA Mode Detection
  const [isPwa, setIsPwa] = useState(false);
  const [displayMode, setDisplayMode] = useState<string>('browser');
  
  // States for Battery Status API
  const [batterySupported, setBatterySupported] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean | null>(null);
  
  // States for Haptics (Vibration API)
  const [hapticsSupported, setHapticsSupported] = useState(false);

  // Load initial settings
  const [performanceGovernor, setPerformanceGovernor] = useState<'high' | 'saver' | 'auto'>(() => {
    try {
      const saved = localStorage.getItem('mcu_pwa_governor');
      return (saved as any) || 'auto';
    } catch {
      return 'auto';
    }
  });

  const [hapticFeedback, setHapticFeedback] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mcu_pwa_haptics');
      return saved === 'false' ? false : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    // 1. PWA Standalone Mode Detection
    const detectPwa = () => {
      let mode = 'browser';
      if (typeof window !== 'undefined') {
        if (window.matchMedia('(display-mode: standalone)').matches) {
          mode = 'standalone';
        } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
          mode = 'minimal-ui';
        } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
          mode = 'fullscreen';
        } else if ((window.navigator as any).standalone === true) {
          mode = 'standalone';
        }
        setDisplayMode(mode);
        setIsPwa(mode !== 'browser');
      }
    };
    detectPwa();

    // 2. Battery Status API Detection & Status Query
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      setBatterySupported(true);
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        // Listen for updates
        const handleLevelChange = () => setBatteryLevel(Math.round(battery.level * 100));
        const handleChargingChange = () => setIsCharging(battery.charging);

        battery.addEventListener('levelchange', handleLevelChange);
        battery.addEventListener('chargingchange', handleChargingChange);

        return () => {
          battery.removeEventListener('levelchange', handleLevelChange);
          battery.removeEventListener('chargingchange', handleChargingChange);
        };
      }).catch((e: any) => {
        console.warn('Battery status API query rejected:', e);
      });
    }

    // 4. Haptic Feedback Motor Detection
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      setHapticsSupported(true);
    }
  }, []);

  React.useEffect(() => {
    if (user?.preferences?.lastBackupAt) {
      setLastBackup(user.preferences.lastBackupAt);
      localStorage.setItem('mcu_last_backup_time', user.preferences.lastBackupAt);
    }
    if (user?.preferences?.lastRestoreAt) {
      setLastRestore(user.preferences.lastRestoreAt);
      localStorage.setItem('mcu_last_restore_time', user.preferences.lastRestoreAt);
    }
  }, [user?.preferences?.lastBackupAt, user?.preferences?.lastRestoreAt]);

  const hasLocalData = Object.keys(watchData || {}).length > 0;

  const onExportClick = () => {
    const now = new Date().toISOString();
    localStorage.setItem('mcu_last_backup_time', now);
    setLastBackup(now);
    updatePreference('lastBackupAt', now);
    handleExportData();
  };

  const onImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const now = new Date().toISOString();
    localStorage.setItem('mcu_last_restore_time', now);
    setLastRestore(now);
    updatePreference('lastRestoreAt', now);
    await handleImportData(e);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return 'Never';
    }
  };

  const backupSizeInBytes = new Blob([JSON.stringify(watchData || {})]).size;
  const formattedSize = backupSizeInBytes > 1024 
    ? `${(backupSizeInBytes / 1024).toFixed(1)} KB` 
    : `${backupSizeInBytes} B`;

  const localStorageSize = Object.keys(localStorage).reduce((sum, key) => sum + (localStorage.getItem(key) || '').length, 0);
  const formattedLocalSize = localStorageSize > 1024 
    ? `${(localStorageSize / 1024).toFixed(1)} KB` 
    : `${localStorageSize} B`;

  return (
    <div className="flex flex-col animate-fadeIn text-left gap-4 font-sans w-full py-1 px-1" id="settings-station-view">
      <div className={`flex flex-col gap-1.5 border-b pb-4 ${activeTheme.startsWith('light-') ? 'border-slate-200' : 'border-neutral-900'}`}>
        <h2 className={`font-display font-bold text-2xl tracking-tight flex items-center gap-2 ${activeTheme.startsWith('light-') ? 'text-slate-900' : 'text-white'}`}>
          <Settings className="text-marvel w-6 h-6 animate-spin-slow" />
          Settings
        </h2>
        <p className={`font-sans text-xs ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
          Configure agent visual preferences, synchronize offline databases, and manage local media caches.
        </p>
      </div>

      {/* Viewing Order Preference */}
      <div className="flex flex-col gap-4">
        <span className={`text-xs uppercase font-bold tracking-wider font-display ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-400'}`}>
          Viewing Order Preference
        </span>
        <p className={`text-[10px] leading-relaxed -mt-2 text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
          Select your default timeline perspective. Theatrical Release Order provides the classic cinema release flow, while Chronological Order arranges titles sequentially as events happened in the MCU story.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-4 sm:w-max" id="settings-order-grid">
          {[
            { id: 'theatrical', name: 'Theatrical Order', desc: 'Default (Classic Release)' },
            { id: 'chronological', name: 'Chronological Timeline', desc: 'Story Order' },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                updatePreference('orderingMode', o.id);
              }}
              className={`p-3 rounded-xl border text-left flex flex-col justify-center gap-0.5 transition-all focus:outline-none min-w-0 w-full sm:w-56 cursor-pointer h-[58px] ${
                orderingMode === o.id
                  ? 'border-marvel bg-marvel/5 shadow-md shadow-marvel/5 font-bold'
                  : activeTheme.startsWith('light-')
                  ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                  : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
              }`}
            >
              <span className={`text-[11px] font-semibold leading-tight ${orderingMode === o.id ? 'text-marvel' : activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-white'}`}>
                {o.name}
              </span>
              <span className={`text-[9px] font-medium ${activeTheme.startsWith('light-') ? 'text-slate-400' : 'text-neutral-500'}`}>
                {o.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* PWA Customization Section */}
      {(isPwa || developerMode) && (
        <div className="flex flex-col gap-4 pt-5 border-t border-neutral-900/40" id="settings-pwa-customization">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className={`text-xs uppercase font-bold tracking-wider font-display ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-400'}`}>
              PWA Customization {developerMode && !isPwa && <span className="text-[9px] lowercase font-normal italic px-2 py-0.5 bg-marvel/10 text-marvel rounded-full ml-2">Simulated</span>}
            </span>
            {/* Display Mode Indicator Badge */}
            <div className={`font-mono text-[9px] font-bold border rounded-full px-2.5 py-1 uppercase tracking-wider ${
              isPwa 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
            }`}>
              Mode: {displayMode.replace('-', ' ')}
            </div>
          </div>
          <p className={`text-[10px] leading-relaxed -mt-2 text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
            Optimize physical device resources, activate motion haptics, and coordinate tactile hardware integration.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-2">
            {/* 1. Battery-Aware Performance Governor */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b pb-1.5 border-neutral-900/10">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-400'}`}>
                  Performance Governor
                </span>
                {batterySupported ? (
                  <span className={`font-mono text-[9px] font-bold ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
                    {batteryLevel !== null ? `${batteryLevel}%` : '---'} {isCharging ? '🔌' : '🔋'}
                  </span>
                ) : (
                  <span className={`font-mono text-[9px] ${activeTheme.startsWith('light-') ? 'text-slate-400' : 'text-neutral-600'}`}>
                    Unsupported
                  </span>
                )}
              </div>
              <p className={`text-[10px] leading-relaxed text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
                Throttles heavy particle effects, limits rendering cycles, and defers automatic background pre-caching when device battery is under 20% and discharging.
              </p>
              
              <div className="grid grid-cols-2 gap-3 w-full mt-1">
                {[
                  { id: 'high', name: 'High Performance', desc: 'Max visuals & asset pre-caching' },
                  { id: 'auto', name: 'Auto', desc: 'Battery-Aware (Auto)' }
                ].map((gov) => (
                  <button
                    key={gov.id}
                    type="button"
                    onClick={() => {
                      setPerformanceGovernor(gov.id as any);
                      localStorage.setItem('mcu_pwa_governor', gov.id);
                      updatePreference('performanceGovernor', gov.id);
                      showFeedback(`Governor set to ${gov.name}`, 'success');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-center gap-0.5 transition-all focus:outline-none min-w-0 w-full cursor-pointer h-[58px] ${
                      performanceGovernor === gov.id
                        ? 'border-marvel bg-marvel/5 shadow-md shadow-marvel/5 font-bold'
                        : activeTheme.startsWith('light-')
                        ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                        : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                    }`}
                  >
                    <span className={`text-[11px] font-semibold leading-tight ${performanceGovernor === gov.id ? 'text-marvel' : activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-white'}`}>
                      {gov.name}
                    </span>
                    <span className={`text-[9px] font-medium ${activeTheme.startsWith('light-') ? 'text-slate-400' : 'text-neutral-500'}`}>
                      {gov.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Tactile Haptic Feedback */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b pb-1.5 border-neutral-900/10">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-400'}`}>
                  Tactile Haptics
                </span>
                {hapticsSupported ? (
                  <span className={`font-mono text-[9px] text-emerald-500 font-bold`}>
                    ACTIVE
                  </span>
                ) : (
                  <span className={`font-mono text-[9px] ${activeTheme.startsWith('light-') ? 'text-slate-400' : 'text-neutral-600'}`}>
                    Unsupported
                  </span>
                )}
              </div>
              <p className={`text-[10px] leading-relaxed text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
                Triggers mechanical touch feedback during interactive event cycles: tab switching, watch lists modifications, and developer easter eggs.
              </p>
              
              <div className="grid grid-cols-2 gap-3 w-full mt-1">
                {[
                  { id: 'on', name: 'Haptic Feedback On', desc: 'Vibrate on user interaction' },
                  { id: 'off', name: 'Disable Tactile', desc: 'Purely visual feedback' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      const enabled = opt.id === 'on';
                      setHapticFeedback(enabled);
                      localStorage.setItem('mcu_pwa_haptics', enabled ? 'true' : 'false');
                      updatePreference('hapticFeedback', enabled);
                      if (enabled && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                        navigator.vibrate([15]);
                      }
                      showFeedback(`Tactile haptics ${enabled ? 'enabled' : 'disabled'}`, 'success');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-center gap-0.5 transition-all focus:outline-none min-w-0 w-full cursor-pointer h-[58px] ${
                      ((hapticFeedback && opt.id === 'on') || (!hapticFeedback && opt.id === 'off'))
                        ? 'border-marvel bg-marvel/5 shadow-md shadow-marvel/5 font-bold'
                        : activeTheme.startsWith('light-')
                        ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                        : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                    }`}
                  >
                    <span className={`text-[11px] font-semibold leading-tight ${((hapticFeedback && opt.id === 'on') || (!hapticFeedback && opt.id === 'off')) ? 'text-marvel' : activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-white'}`}>
                      {opt.name}
                    </span>
                    <span className={`text-[9px] font-medium ${activeTheme.startsWith('light-') ? 'text-slate-400' : 'text-neutral-500'}`}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid for lower settings sections on Desktop using balanced column layout */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-5 border-t items-stretch ${activeTheme.startsWith('light-') ? 'border-slate-200' : 'border-neutral-900/60'}`} id="settings-grid-sections">
        {/* Item 1: Offline Cache Manager */}
        <div className="flex flex-col justify-between gap-4 h-full">
          <div className="flex flex-col gap-3">
            <div className={`flex items-center justify-between gap-2 border-b pb-2 ${activeTheme.startsWith('light-') ? 'border-slate-200' : 'border-neutral-900/60'}`}>
              <span className={`text-xs uppercase font-bold tracking-wider font-display whitespace-nowrap ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-400'}`}>
                Offline Cache Manager
              </span>
              <span className={`font-mono text-[9px] font-bold border rounded-full px-2.5 py-0.5 uppercase tracking-wider whitespace-nowrap ${
                cacheProgress.isSyncing
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                  : cacheProgress.isComplete
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : activeTheme.startsWith('light-')
                  ? 'bg-slate-100 border-slate-200 text-slate-500'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}>
                {cacheProgress.isSyncing ? 'Syncing...' : cacheProgress.isComplete ? 'Offline Active' : 'Idle'}
              </span>
            </div>

            <p className={`text-[10px] leading-relaxed text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
              Caches all Marvel posters, backdrops, and character portraits locally on the client using high-performance Cache Storage &amp; IndexedDB to reduce network hops.
            </p>

            {/* Horizontal Separator */}
            <div className={`border-t ${
              activeTheme.startsWith('light-') ? 'border-slate-200/80' : 'border-neutral-900/40'
            }`} />

            {/* Progress bar */}
            <div className="flex flex-col gap-1.5">
              <div className={`flex justify-between items-center text-[10px] font-mono ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
                <span>Cache Sync Progress</span>
                <span>
                  {cacheProgress.completed}/{cacheProgress.total} Files
                </span>
              </div>
              <div className={`h-2 w-full rounded-full overflow-hidden border ${
                activeTheme.startsWith('light-') ? 'bg-slate-100 border-slate-200/60' : 'bg-neutral-950 border-neutral-900'
              }`}>
                <div
                  className={`h-full transition-all duration-500 ${
                    cacheProgress.isSyncing ? 'bg-amber-500' : 'bg-marvel'
                  }`}
                  style={{
                    width: `${cacheProgress.total > 0 ? (cacheProgress.completed / cacheProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              {cacheProgress.failed > 0 && (
                <span className="text-[9px] font-mono text-rose-500 text-left block">
                  ⚠️ {cacheProgress.failed} failed.
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-auto">
            <button
              type="button"
              onClick={async () => {
                showFeedback('Rebuilding cache...', 'info');
                await startPreCaching(true);
                showFeedback('Cache rebuild complete!', 'success');
              }}
              disabled={cacheProgress.isSyncing}
              className={`flex items-center justify-center gap-1.5 font-semibold text-[10px] xs:text-[11px] py-3 rounded-xl transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full ${
                activeTheme.startsWith('light-')
                  ? 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800'
                  : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
              Force Rebuild
            </button>
            <button
              type="button"
              onClick={() => setShowPurgeConfirm(true)}
              disabled={cacheProgress.isSyncing || isPurging}
              className={`flex items-center justify-center gap-1.5 font-semibold text-[10px] xs:text-[11px] py-3 rounded-xl transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full ${
                activeTheme.startsWith('light-')
                  ? 'bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600'
                  : 'bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
              Purge Cache
            </button>
          </div>
        </div>

        {/* Item 2: Backups & Sync System */}
        <div className="flex flex-col justify-between gap-4 h-full">
          <div className="flex flex-col gap-3">
            <div className={`flex items-center justify-between gap-2 border-b pb-2 ${activeTheme.startsWith('light-') ? 'border-slate-200' : 'border-neutral-900/60'}`}>
              <span className={`text-xs uppercase font-bold tracking-wider font-display whitespace-nowrap ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-400'}`}>
                Backups &amp; Sync System
              </span>
              <span className={`font-mono text-[9px] font-bold border rounded-full px-2.5 py-0.5 uppercase tracking-wider whitespace-nowrap ${
                hasLocalData
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : activeTheme.startsWith('light-')
                  ? 'bg-slate-100 border-slate-200 text-slate-500'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}>
                {hasLocalData ? 'Archive Ready' : 'Database Empty'}
              </span>
            </div>

            <p className={`text-[10px] leading-relaxed text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
              Export or restore your offline S.H.I-E.L.D. database JSON files locally to synchronize progress across active stations.
            </p>

            {/* Metrics Panel */}
            <div className="flex flex-col gap-2">
              <div className={`grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-mono border-t pt-2.5 ${
                activeTheme.startsWith('light-') ? 'border-slate-200/80' : 'border-neutral-900/40'
              }`}>
                <div className="flex flex-col gap-0.5">
                  <span className={activeTheme.startsWith('light-') ? 'text-slate-400 font-medium' : 'text-neutral-500'}>Last Backup</span>
                  <span className={`font-semibold ${activeTheme.startsWith('light-') ? 'text-slate-700' : 'text-neutral-300'}`}>
                    {formatTime(lastBackup)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className={activeTheme.startsWith('light-') ? 'text-slate-400 font-medium' : 'text-neutral-500'}>Last Restore</span>
                  <span className={`font-semibold ${activeTheme.startsWith('light-') ? 'text-slate-700' : 'text-neutral-300'}`}>
                    {formatTime(lastRestore)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <button
              type="button"
              onClick={onExportClick}
              disabled={isRestoring}
              className={`flex items-center justify-center gap-1.5 font-semibold text-[10px] xs:text-[11px] py-3 rounded-xl transition-colors focus:outline-none whitespace-nowrap overflow-hidden cursor-pointer w-full ${
                activeTheme.startsWith('light-')
                  ? 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800'
                  : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white'
              } ${isRestoring ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Download className="w-3.5 h-3.5 flex-shrink-0" />
              Export JSON Backup
            </button>
            {isRestoring ? (
              <div className={`flex items-center justify-center gap-1.5 text-[10px] xs:text-[11px] py-3 rounded-xl whitespace-nowrap overflow-hidden select-none cursor-not-allowed w-full ${
                activeTheme.startsWith('light-')
                  ? 'bg-slate-100/55 text-slate-400 border border-slate-200/60'
                  : 'bg-neutral-900/40 text-neutral-500 border border-neutral-800/65'
              }`}>
                <div className={`w-3.5 h-3.5 border-2 rounded-full animate-spin flex-shrink-0 ${
                  activeTheme.startsWith('light-') ? 'border-slate-300 border-t-marvel' : 'border-neutral-600 border-t-marvel'
                }`} />
                <span className="truncate">{restoreProgress || 'Restoring...'}</span>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-1.5 font-semibold text-[10px] xs:text-[11px] py-3 rounded-xl cursor-pointer transition-colors whitespace-nowrap overflow-hidden w-full text-center ${
                activeTheme.startsWith('light-')
                  ? 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800'
                  : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white'
              }`}>
                <Upload className="w-3.5 h-3.5 flex-shrink-0" />
                Restore JSON Backup
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Item 3: Application & Account Management */}
        <div className="flex flex-col justify-between gap-4 h-full">
          <div className="flex flex-col gap-3">
            <div className={`flex items-center justify-between gap-2 border-b pb-2 ${activeTheme.startsWith('light-') ? 'border-slate-200' : 'border-neutral-900/60'}`}>
              <span className={`text-xs uppercase font-bold tracking-wider font-display whitespace-nowrap ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-400'}`}>
                Account &amp; Ledger Registry
              </span>
              <span className={`font-mono text-[9px] font-bold border rounded-full px-2.5 py-0.5 uppercase tracking-wider whitespace-nowrap ${
                authToken
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : activeTheme.startsWith('light-')
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
              }`}>
                {authToken ? 'Cloud Secure' : 'Sandbox Active'}
              </span>
            </div>

            <p className={`text-[10px] leading-relaxed text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
              Reset your application status, clear offline state, or permanently delete your cloud account from S.H.I-E.L.D. registry.
            </p>

            {/* Metrics Panel */}
            <div className="flex flex-col gap-2">
              <div className={`grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-mono border-t pt-2.5 ${
                activeTheme.startsWith('light-') ? 'border-slate-200/80' : 'border-neutral-900/40'
              }`}>
                <div className="flex flex-col gap-0.5">
                  <span className={activeTheme.startsWith('light-') ? 'text-slate-400 font-medium' : 'text-neutral-500'}>Agent Status</span>
                  <span className={`font-semibold ${activeTheme.startsWith('light-') ? 'text-slate-700' : 'text-neutral-300'}`}>
                    {authToken ? 'Authorized' : 'Offline Sandbox'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className={activeTheme.startsWith('light-') ? 'text-slate-400 font-medium' : 'text-neutral-500'}>Terminals</span>
                  <span className={`font-semibold ${activeTheme.startsWith('light-') ? 'text-slate-700' : 'text-neutral-300'}`}>
                    {user?.sessions ? user.sessions.filter((s: any) => s.status === 'Active').length : 1} Active
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className={`grid gap-3 w-full mt-auto ${authToken ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button
              type="button"
              onClick={handleResetProgress}
              className={`w-full font-semibold text-[10px] xs:text-[11px] py-3 rounded-xl transition-colors focus:outline-none cursor-pointer border ${
                activeTheme.startsWith('light-')
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100'
                  : 'bg-red-600/10 hover:bg-red-600/20 text-red-500 border-red-500/20'
              }`}
            >
              Reset Application
            </button>

            {authToken && (
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(true)}
                className={`w-full font-semibold text-[10px] xs:text-[11px] py-3 rounded-xl transition-colors focus:outline-none cursor-pointer border ${
                  activeTheme.startsWith('light-')
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100'
                    : 'bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border-rose-500/20'
                }`}
              >
                Delete Account
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showPurgeConfirm}
        title="Purge Cached Media Assets"
        message="Are you sure you want to purge all cached media assets? This will clear all downloaded posters and offline assets from local storage."
        confirmLabel="Purge Cache"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setIsPurging(true);
          try {
            await clearCache();
            showFeedback('Cache purged completely!', 'info');
          } catch (err) {
            showFeedback('Failed to purge cache.', 'error');
          } finally {
            setIsPurging(false);
            setShowPurgeConfirm(false);
          }
        }}
        onCancel={() => setShowPurgeConfirm(false)}
        isLoading={isPurging}
        activeTheme={activeTheme}
        critical={true}
      />
    </div>
  );
};
