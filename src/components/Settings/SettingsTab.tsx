import React, { useState } from 'react';
import { Download, Upload, RotateCcw, Settings, Smartphone, Vibrate, Bell, SunMedium, CheckCircle2, ShieldCheck, Sparkles, HelpCircle, Check, Zap } from 'lucide-react';
import { CacheProgress } from '../Profile/ProfileTab';
import { ConfirmationModal } from '../Common/ConfirmationModal';
import { ThemeType, ThemeMode } from '../../types';
import { usePwa, APP_ICON_OPTIONS } from '../../hooks/usePwa';

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
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const {
    isStandalone,
    canInstall,
    installPwa,
    hapticsEnabled,
    toggleHaptics,
    badgeEnabled,
    toggleBadge,
    wakeLockEnabled,
    toggleWakeLock,
    selectedIcon,
    selectAppIcon,
    hasWakeLockSupport,
    hasVibrationSupport,
    hasBadgeSupport,
  } = usePwa();

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

  const handleInstallClick = async () => {
    if (canInstall) {
      const installed = await installPwa();
      if (installed) {
        showFeedback('Nexus MCU Companion installed successfully!', 'success');
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  return (
    <div className="flex flex-col animate-fadeIn text-left gap-6 font-sans w-full py-1 px-1" id="settings-station-view">
      {/* Settings Header */}
      <div className={`flex flex-col gap-1.5 border-b pb-4 ${activeTheme.startsWith('light-') ? 'border-slate-200' : 'border-neutral-900'}`}>
        <h2 className={`font-display font-bold text-2xl tracking-tight flex items-center gap-2 ${activeTheme.startsWith('light-') ? 'text-slate-900' : 'text-white'}`}>
          <Settings className="text-marvel w-6 h-6 animate-spin-slow" />
          Settings
        </h2>
        <p className={`font-sans text-xs ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
          Configure agent preferences, native PWA capabilities, app icons, and offline storage.
        </p>
      </div>

      {/* SMART PWA DETECTION & INSTALLATION SECTION */}
      {!isStandalone ? (
        <div className={`p-4 rounded-2xl border transition-all ${
          activeTheme.startsWith('light-')
            ? 'bg-gradient-to-r from-red-50 via-slate-50 to-red-50/50 border-red-200'
            : 'bg-gradient-to-r from-red-950/40 via-neutral-950 to-red-950/20 border-red-900/40'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-marvel/10 text-marvel border border-marvel/20 shrink-0 mt-0.5 sm:mt-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-display font-bold text-base ${activeTheme.startsWith('light-') ? 'text-slate-900' : 'text-white'}`}>
                    Install MCU Companion App
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-marvel text-white font-semibold uppercase tracking-wider">
                    Recommended
                  </span>
                </div>
                <p className={`text-xs ${activeTheme.startsWith('light-') ? 'text-slate-600' : 'text-neutral-300'}`}>
                  Install on your Home Screen for full-screen view, instant offline load, haptic feedback, and app icon shortcuts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-marvel hover:bg-marvel-dark text-white font-semibold text-xs transition-all shadow-md shadow-marvel/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Zap className="w-4 h-4 fill-white" />
                {canInstall ? 'Install Application' : 'Installation Guide'}
              </button>
            </div>
          </div>

          {/* Expanded Installation Guide if prompt is unavailable */}
          {showInstallGuide && !canInstall && (
            <div className={`mt-4 pt-4 border-t text-xs flex flex-col gap-3 ${
              activeTheme.startsWith('light-') ? 'border-red-200/60 text-slate-700' : 'border-neutral-800 text-neutral-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-marvel">
                  <HelpCircle className="w-4 h-4" /> How to Install manually on your browser:
                </span>
                <button
                  type="button"
                  onClick={() => setShowInstallGuide(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-white underline cursor-pointer"
                >
                  Close guide
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-3 rounded-xl border ${activeTheme.startsWith('light-') ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'}`}>
                  <span className="font-bold block text-marvel mb-1">Android Chrome</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] opacity-90">
                    <li>Tap the 3 dots menu (⋮) top right</li>
                    <li>Select <strong>Add to Home screen</strong> or <strong>Install app</strong></li>
                    <li>Tap <strong>Install</strong> to confirm</li>
                  </ol>
                </div>
                <div className={`p-3 rounded-xl border ${activeTheme.startsWith('light-') ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'}`}>
                  <span className="font-bold block text-marvel mb-1">iOS Safari</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] opacity-90">
                    <li>Tap the Share button (⎘) at bottom</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                    <li>Tap <strong>Add</strong> in top right</li>
                  </ol>
                </div>
                <div className={`p-3 rounded-xl border ${activeTheme.startsWith('light-') ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'}`}>
                  <span className="font-bold block text-marvel mb-1">Desktop Chrome / Edge</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] opacity-90">
                    <li>Click the Install icon in address bar</li>
                    <li>Or click menu ⋮ → <strong>Cast, save, and share</strong> → <strong>Install</strong></li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STANDALONE PWA NATIVE CUSTOMIZATION PANEL */
        <div className={`p-4 rounded-2xl border transition-all ${
          activeTheme.startsWith('light-')
            ? 'bg-gradient-to-r from-slate-50 via-emerald-50/20 to-slate-50 border-slate-200'
            : 'bg-gradient-to-r from-neutral-950 via-emerald-950/10 to-neutral-950 border-neutral-800'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-display font-bold text-sm flex items-center gap-2 ${activeTheme.startsWith('light-') ? 'text-slate-900' : 'text-white'}`}>
                  Native PWA Controls Active
                </h3>
                <p className={`text-[11px] ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
                  Running in Standalone OS App Mode with native hardware integrations enabled.
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Standalone Mode
            </span>
          </div>

          {/* Native Toggles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {/* Haptic Vibration Toggle */}
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
              activeTheme.startsWith('light-') ? 'bg-white border-slate-200' : 'bg-neutral-900/80 border-neutral-800'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <Vibrate className="w-4 h-4 text-marvel shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-bold truncate ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-white'}`}>
                    Haptic Touch
                  </span>
                  <span className={`text-[10px] truncate ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
                    {hasVibrationSupport ? 'Touch feedback vibrations' : 'Not supported on device'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleHaptics(!hapticsEnabled)}
                disabled={!hasVibrationSupport}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 ${
                  hapticsEnabled ? 'bg-marvel' : activeTheme.startsWith('light-') ? 'bg-slate-300' : 'bg-neutral-700'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* App Icon Badge Toggle */}
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
              activeTheme.startsWith('light-') ? 'bg-white border-slate-200' : 'bg-neutral-900/80 border-neutral-800'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-bold truncate ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-white'}`}>
                    App Icon Badge
                  </span>
                  <span className={`text-[10px] truncate ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
                    {hasBadgeSupport ? 'Show unwatched counter' : 'Launcher supported'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleBadge(!badgeEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  badgeEnabled ? 'bg-marvel' : activeTheme.startsWith('light-') ? 'bg-slate-300' : 'bg-neutral-700'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  badgeEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Screen Wake Lock Toggle */}
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
              activeTheme.startsWith('light-') ? 'bg-white border-slate-200' : 'bg-neutral-900/80 border-neutral-800'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <SunMedium className="w-4 h-4 text-sky-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-bold truncate ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-white'}`}>
                    Screen Wake Lock
                  </span>
                  <span className={`text-[10px] truncate ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
                    {hasWakeLockSupport ? 'Keep display awake' : 'Unsupported on device'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleWakeLock(!wakeLockEnabled)}
                disabled={!hasWakeLockSupport}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 ${
                  wakeLockEnabled ? 'bg-marvel' : activeTheme.startsWith('light-') ? 'bg-slate-300' : 'bg-neutral-700'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  wakeLockEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOME SCREEN APP ICON SELECTION SECTION */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className={`text-xs uppercase font-bold tracking-wider font-display flex items-center gap-1.5 ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-300'}`}>
              <Sparkles className="w-4 h-4 text-marvel" /> Home Screen App Icon Selection
            </span>
            <p className={`text-[11px] ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
              Choose your preferred MCU aesthetic theme icon. Your selected icon immediately applies to browser tabs, Apple touch icons, and new Home Screen shortcuts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {APP_ICON_OPTIONS.map((icon) => {
            const isSelected = selectedIcon === icon.id;
            return (
              <button
                key={icon.id}
                type="button"
                onClick={() => {
                  selectAppIcon(icon.id);
                  showFeedback(`App Icon changed to ${icon.name}`, 'success');
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all relative cursor-pointer group ${
                  isSelected
                    ? 'border-marvel bg-marvel/10 ring-2 ring-marvel/30 scale-[1.02]'
                    : activeTheme.startsWith('light-')
                    ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 p-1 rounded-full bg-marvel text-white">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg p-0.5 bg-black/40 border border-white/10 group-hover:scale-105 transition-transform">
                  <img
                    src={icon.previewUrl}
                    alt={icon.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className={`text-xs font-bold leading-snug ${isSelected ? 'text-marvel' : activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-white'}`}>
                    {icon.name}
                  </span>
                  <span className={`text-[9px] ${activeTheme.startsWith('light-') ? 'text-slate-400' : 'text-neutral-500'}`}>
                    {icon.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Viewing Order Preference */}
      <div className="flex flex-col gap-3 pt-3 border-t border-slate-200 dark:border-neutral-900">
        <span className={`text-xs uppercase font-bold tracking-wider font-display ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-400'}`}>
          Viewing Order Preference
        </span>
        <p className={`text-[10px] leading-relaxed -mt-1 text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
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
