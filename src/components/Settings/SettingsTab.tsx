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

// Helper component for Icon image loading with SVG fallback
const IconImage: React.FC<{ src: string; alt: string; themeColor: string }> = ({ src, alt, themeColor }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className="w-full h-full rounded-xl flex items-center justify-center p-2 text-white font-bold"
        style={{ backgroundColor: themeColor }}
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(false)} // try again or fallback
      className="w-full h-full object-cover rounded-xl"
    />
  );
};

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
    <div className="flex flex-col animate-fadeIn text-left gap-8 font-sans w-full py-1 px-1" id="settings-station-view">
      {/* Settings Header */}
      <div className={`flex flex-col gap-1.5 border-b pb-4 ${activeTheme.startsWith('light-') ? 'border-slate-200/80' : 'border-neutral-900'}`}>
        <h2 className={`font-display font-bold text-2xl tracking-tight flex items-center gap-2 ${activeTheme.startsWith('light-') ? 'text-slate-900' : 'text-white'}`}>
          <Settings className="text-marvel w-6 h-6 animate-spin-slow" />
          Settings
        </h2>
        <p className={`font-sans text-xs ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
          Configure agent preferences, native PWA capabilities, app icons, and offline storage.
        </p>
      </div>

      {/* SMART PWA DETECTION & INSTALLATION SECTION - CONTAINERLESS */}
      {!isStandalone ? (
        <div className={`pl-4 border-l-4 border-marvel py-1 transition-all ${
          activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-marvel/10 text-marvel shrink-0 mt-0.5 sm:mt-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-display font-bold text-sm sm:text-base ${activeTheme.startsWith('light-') ? 'text-slate-900' : 'text-white'}`}>
                    Install MCU Companion App
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-marvel/20 text-marvel font-bold uppercase tracking-wider">
                    PWA Ready
                  </span>
                </div>
                <p className={`text-xs ${activeTheme.startsWith('light-') ? 'text-slate-600' : 'text-neutral-400'}`}>
                  Install on your device for full-screen standalone view, instant offline load, haptics, and custom app icons.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-marvel hover:bg-marvel-dark text-white font-semibold text-xs transition-all shadow-md shadow-marvel/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Zap className="w-4 h-4 fill-white" />
                {canInstall ? 'Install Application' : 'Installation Guide'}
              </button>
            </div>
          </div>

          {/* Expanded Installation Guide if prompt is unavailable */}
          {showInstallGuide && !canInstall && (
            <div className={`mt-4 pt-3 border-t text-xs flex flex-col gap-3 ${
              activeTheme.startsWith('light-') ? 'border-slate-200 text-slate-700' : 'border-neutral-800 text-neutral-300'
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-marvel text-xs">Android Chrome</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] opacity-80">
                    <li>Tap the 3 dots menu (⋮) top right</li>
                    <li>Select <strong>Add to Home screen</strong> or <strong>Install app</strong></li>
                    <li>Tap <strong>Install</strong> to confirm</li>
                  </ol>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-marvel text-xs">iOS Safari</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] opacity-80">
                    <li>Tap the Share button (⎘) at bottom</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                    <li>Tap <strong>Add</strong> in top right</li>
                  </ol>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-marvel text-xs">Desktop Chrome / Edge</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] opacity-80">
                    <li>Click the Install icon in address bar</li>
                    <li>Or click menu ⋮ → <strong>Save and Share</strong> → <strong>Install</strong></li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STANDALONE PWA NATIVE CUSTOMIZATION PANEL - CONTAINERLESS */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-neutral-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className={`font-display font-bold text-sm ${activeTheme.startsWith('light-') ? 'text-slate-900' : 'text-white'}`}>
                Native PWA Controls
              </h3>
            </div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Standalone Mode
            </span>
          </div>

          {/* Native Toggles List - Containerless */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Haptic Vibration Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Vibrate className="w-4 h-4 text-marvel shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-bold truncate ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-white'}`}>
                    Haptic Touch
                  </span>
                  <span className={`text-[10px] truncate ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
                    {hasVibrationSupport ? 'Touch feedback vibrations' : 'Not supported'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleHaptics(!hapticsEnabled)}
                disabled={!hasVibrationSupport}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 ${
                  hapticsEnabled ? 'bg-marvel' : activeTheme.startsWith('light-') ? 'bg-slate-300' : 'bg-neutral-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* App Icon Badge Toggle */}
            <div className="flex items-center justify-between gap-3">
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
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  badgeEnabled ? 'bg-marvel' : activeTheme.startsWith('light-') ? 'bg-slate-300' : 'bg-neutral-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  badgeEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Screen Wake Lock Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <SunMedium className="w-4 h-4 text-sky-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-bold truncate ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-white'}`}>
                    Screen Wake Lock
                  </span>
                  <span className={`text-[10px] truncate ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
                    {hasWakeLockSupport ? 'Keep display awake' : 'Unsupported'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleWakeLock(!wakeLockEnabled)}
                disabled={!hasWakeLockSupport}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 ${
                  wakeLockEnabled ? 'bg-marvel' : activeTheme.startsWith('light-') ? 'bg-slate-300' : 'bg-neutral-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  wakeLockEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOME SCREEN APP ICON SELECTION SECTION - CONTAINERLESS */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-200/60 dark:border-neutral-900">
        <div className="flex flex-col gap-1">
          <span className={`text-xs uppercase font-bold tracking-wider font-display flex items-center gap-1.5 ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-300'}`}>
            <Sparkles className="w-4 h-4 text-marvel" /> Home Screen App Icon
          </span>
          <p className={`text-[11px] ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
            Select an MCU aesthetic icon theme. Applies immediately to web app manifests, browser tabs, and launcher shortcuts.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
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
                className={`p-2.5 rounded-xl flex flex-col items-center text-center gap-2 transition-all relative cursor-pointer group ${
                  isSelected
                    ? 'ring-2 ring-marvel bg-marvel/5 scale-[1.02]'
                    : activeTheme.startsWith('light-')
                    ? 'hover:bg-slate-100/70'
                    : 'hover:bg-neutral-900/60'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-marvel text-white">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm p-0.5 bg-black/30 border border-white/10 group-hover:scale-105 transition-transform flex items-center justify-center">
                  <IconImage
                    src={icon.previewUrl}
                    alt={icon.name}
                    themeColor={icon.themeColor}
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

      {/* Viewing Order Preference - CONTAINERLESS */}
      <div className="flex flex-col gap-3 pt-3 border-t border-slate-200/60 dark:border-neutral-900">
        <span className={`text-xs uppercase font-bold tracking-wider font-display ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-300'}`}>
          Viewing Order Preference
        </span>
        <p className={`text-[11px] leading-relaxed -mt-1 text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
          Choose your default MCU timeline perspective: Theatrical Release Order or Chronological Story Order.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-4 sm:w-max pt-1" id="settings-order-grid">
          {[
            { id: 'theatrical', name: 'Theatrical Order', desc: 'Default Cinema Release' },
            { id: 'chronological', name: 'Chronological Timeline', desc: 'In-Universe Story Order' },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                updatePreference('orderingMode', o.id);
              }}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-center gap-0.5 transition-all focus:outline-none min-w-0 w-full sm:w-56 cursor-pointer ${
                orderingMode === o.id
                  ? 'border-marvel bg-marvel/5 font-bold'
                  : activeTheme.startsWith('light-')
                  ? 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-100'
                  : 'border-neutral-800/80 bg-neutral-900/30 hover:bg-neutral-900/80'
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

      {/* Grid for lower settings sections - CONTAINERLESS & FLATTENED */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t ${activeTheme.startsWith('light-') ? 'border-slate-200/60' : 'border-neutral-900'}`} id="settings-grid-sections">
        {/* Item 1: Offline Cache Manager */}
        <div className="flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/40 dark:border-neutral-900">
              <span className={`text-xs uppercase font-bold tracking-wider font-display whitespace-nowrap ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-300'}`}>
                Offline Cache Manager
              </span>
              <span className={`font-mono text-[9px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wider whitespace-nowrap ${
                cacheProgress.isSyncing
                  ? 'bg-amber-500/10 text-amber-500 animate-pulse'
                  : cacheProgress.isComplete
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : activeTheme.startsWith('light-')
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-neutral-900 text-neutral-400'
              }`}>
                {cacheProgress.isSyncing ? 'Syncing...' : cacheProgress.isComplete ? 'Offline Active' : 'Idle'}
              </span>
            </div>

            <p className={`text-[10px] leading-relaxed text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
              Caches Marvel posters, backdrops, and character portraits locally using Cache Storage &amp; IndexedDB.
            </p>

            {/* Progress bar */}
            <div className="flex flex-col gap-1 pt-1">
              <div className={`flex justify-between items-center text-[10px] font-mono ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
                <span>Cache Sync</span>
                <span>{cacheProgress.completed}/{cacheProgress.total} Files</span>
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                activeTheme.startsWith('light-') ? 'bg-slate-200/70' : 'bg-neutral-800'
              }`}>
                <div
                  className={`h-full transition-all duration-500 ${cacheProgress.isSyncing ? 'bg-amber-500' : 'bg-marvel'}`}
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

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={async () => {
                showFeedback('Rebuilding cache...', 'info');
                await startPreCaching(true);
                showFeedback('Cache rebuild complete!', 'success');
              }}
              disabled={cacheProgress.isSyncing}
              className={`flex items-center justify-center gap-1.5 font-semibold text-[10px] py-2 rounded-lg transition-colors cursor-pointer w-full ${
                activeTheme.startsWith('light-')
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              Force Rebuild
            </button>
            <button
              type="button"
              onClick={() => setShowPurgeConfirm(true)}
              disabled={cacheProgress.isSyncing || isPurging}
              className={`flex items-center justify-center gap-1.5 font-semibold text-[10px] py-2 rounded-lg transition-colors cursor-pointer w-full ${
                activeTheme.startsWith('light-')
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                  : 'bg-red-600/10 hover:bg-red-600/20 text-red-400'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              Purge Cache
            </button>
          </div>
        </div>

        {/* Item 2: Backups & Sync System */}
        <div className="flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/40 dark:border-neutral-900">
              <span className={`text-xs uppercase font-bold tracking-wider font-display whitespace-nowrap ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-300'}`}>
                Backups &amp; Sync
              </span>
              <span className={`font-mono text-[9px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wider whitespace-nowrap ${
                hasLocalData
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : activeTheme.startsWith('light-')
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-neutral-900 text-neutral-400'
              }`}>
                {hasLocalData ? 'Archive Ready' : 'Database Empty'}
              </span>
            </div>

            <p className={`text-[10px] leading-relaxed text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
              Export or restore your offline JSON database backup to sync watch history across terminals.
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
              <div className="flex flex-col gap-0.5">
                <span className={activeTheme.startsWith('light-') ? 'text-slate-400' : 'text-neutral-500'}>Last Backup</span>
                <span className={`font-semibold ${activeTheme.startsWith('light-') ? 'text-slate-700' : 'text-neutral-300'}`}>
                  {formatTime(lastBackup)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={activeTheme.startsWith('light-') ? 'text-slate-400' : 'text-neutral-500'}>Last Restore</span>
                <span className={`font-semibold ${activeTheme.startsWith('light-') ? 'text-slate-700' : 'text-neutral-300'}`}>
                  {formatTime(lastRestore)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onExportClick}
              disabled={isRestoring}
              className={`flex items-center justify-center gap-1.5 font-semibold text-[10px] py-2 rounded-lg transition-colors cursor-pointer w-full ${
                activeTheme.startsWith('light-')
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
              }`}
            >
              <Download className="w-3 h-3" />
              Export Backup
            </button>
            {isRestoring ? (
              <div className="flex items-center justify-center gap-1.5 text-[10px] py-2 rounded-lg opacity-50 cursor-not-allowed">
                <span className="truncate">{restoreProgress || 'Restoring...'}</span>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-1.5 font-semibold text-[10px] py-2 rounded-lg cursor-pointer transition-colors w-full text-center ${
                activeTheme.startsWith('light-')
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
              }`}>
                <Upload className="w-3 h-3" />
                Restore Backup
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

        {/* Item 3: Account & Ledger Registry */}
        <div className="flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/40 dark:border-neutral-900">
              <span className={`text-xs uppercase font-bold tracking-wider font-display whitespace-nowrap ${activeTheme.startsWith('light-') ? 'text-slate-800' : 'text-neutral-300'}`}>
                Account Registry
              </span>
              <span className={`font-mono text-[9px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wider whitespace-nowrap ${
                authToken
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-amber-500/10 text-amber-500'
              }`}>
                {authToken ? 'Cloud Secure' : 'Sandbox Active'}
              </span>
            </div>

            <p className={`text-[10px] leading-relaxed text-left ${activeTheme.startsWith('light-') ? 'text-slate-500' : 'text-neutral-400'}`}>
              Manage local application state, clear offline data, or permanently remove registered cloud profile.
            </p>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
              <div className="flex flex-col gap-0.5">
                <span className={activeTheme.startsWith('light-') ? 'text-slate-400' : 'text-neutral-500'}>Agent Status</span>
                <span className={`font-semibold ${activeTheme.startsWith('light-') ? 'text-slate-700' : 'text-neutral-300'}`}>
                  {authToken ? 'Authorized' : 'Offline Sandbox'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={activeTheme.startsWith('light-') ? 'text-slate-400' : 'text-neutral-500'}>Terminals</span>
                <span className={`font-semibold ${activeTheme.startsWith('light-') ? 'text-slate-700' : 'text-neutral-300'}`}>
                  {user?.sessions ? user.sessions.filter((s: any) => s.status === 'Active').length : 1} Active
                </span>
              </div>
            </div>
          </div>

          <div className={`grid gap-2 w-full pt-2 ${authToken ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button
              type="button"
              onClick={handleResetProgress}
              className={`w-full font-semibold text-[10px] py-2 rounded-lg transition-colors cursor-pointer ${
                activeTheme.startsWith('light-')
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                  : 'bg-red-600/10 hover:bg-red-600/20 text-red-500'
              }`}
            >
              Reset Application
            </button>

            {authToken && (
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(true)}
                className={`w-full font-semibold text-[10px] py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTheme.startsWith('light-')
                    ? 'bg-red-50 hover:bg-red-100 text-red-600'
                    : 'bg-rose-600/10 hover:bg-rose-600/20 text-rose-500'
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
