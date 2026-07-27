import { useState, useEffect, useCallback } from 'react';
import { triggerHaptic } from '../utils/haptics';
import { updateAppBadge, clearAppBadge } from '../utils/badge';

export interface AppIconOption {
  id: string;
  name: string;
  subtitle: string;
  previewUrl: string;
  themeColor: string;
}

export const APP_ICON_OPTIONS: AppIconOption[] = [
  {
    id: 'icon-arc-reactor',
    name: 'Arc Reactor Red',
    subtitle: 'Classic Crimson Avenger Core',
    previewUrl: '/icons/icon-arc-reactor.png',
    themeColor: '#e62429',
  },
  {
    id: 'icon-quantum-blue',
    name: 'Quantum Realm',
    subtitle: 'Deep Cyan Subatomic Energy',
    previewUrl: '/icons/icon-quantum-blue.png',
    themeColor: '#0ea5e9',
  },
  {
    id: 'icon-vibranium-silver',
    name: 'Vibranium Shield',
    subtitle: 'Wakandan Metallic Weave',
    previewUrl: '/icons/icon-vibranium-silver.png',
    themeColor: '#71717a',
  },
  {
    id: 'icon-infinity-gold',
    name: 'Infinity Gold',
    subtitle: 'Six Cosmic Stones Energy',
    previewUrl: '/icons/icon-infinity-gold.png',
    themeColor: '#eab308',
  },
  {
    id: 'icon-dark-stealth',
    name: 'Dark Obsidian',
    subtitle: 'Matte Stealth Emblem',
    previewUrl: '/icons/icon-dark-stealth.png',
    themeColor: '#09090b',
  },
];

export function usePwa() {
  // PWA Standalone Detection
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandaloneMQ = window.matchMedia('(display-mode: standalone)').matches;
    const isNavStandalone = (navigator as any).standalone === true;
    const isAndroidApp = document.referrer.includes('android-app://');
    return isStandaloneMQ || isNavStandalone || isAndroidApp;
  });

  // Native Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalledEvent, setIsInstalledEvent] = useState<boolean>(false);

  // Native PWA Customization Preferences
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('mcu_haptics_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [badgeEnabled, setBadgeEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('mcu_badge_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [wakeLockEnabled, setWakeLockEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('mcu_wakelock_enabled');
    return saved === 'true';
  });

  const [wakeLockSentinel, setWakeLockSentinel] = useState<any>(null);

  const [selectedIcon, setSelectedIcon] = useState<string>(() => {
    if (typeof window === 'undefined') return 'icon-arc-reactor';
    return localStorage.getItem('mcu_selected_app_icon') || 'icon-arc-reactor';
  });

  // Apply icon dynamically to HTML head (<link rel="icon">, <link rel="manifest">, <link rel="apple-touch-icon">)
  const applyAppIcon = useCallback((iconKey: string) => {
    if (typeof document === 'undefined') return;

    const iconPath = `/icons/${iconKey}.png`;
    const manifestPath = `/api/manifest.json?icon=${iconKey}`;

    // Update Favicon
    let iconEl = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (!iconEl) {
      iconEl = document.createElement('link');
      iconEl.rel = 'icon';
      document.head.appendChild(iconEl);
    }
    iconEl.type = 'image/png';
    iconEl.href = iconPath;

    // Update Apple Touch Icon
    let appleIconEl = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleIconEl) {
      appleIconEl = document.createElement('link');
      appleIconEl.rel = 'apple-touch-icon';
      document.head.appendChild(appleIconEl);
    }
    appleIconEl.href = iconPath;

    // Update Manifest Link
    let manifestEl = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (!manifestEl) {
      manifestEl = document.createElement('link');
      manifestEl.rel = 'manifest';
      document.head.appendChild(manifestEl);
    }
    manifestEl.href = manifestPath;
  }, []);

  // Sync selected icon on mount and changes
  useEffect(() => {
    applyAppIcon(selectedIcon);
  }, [selectedIcon, applyAppIcon]);

  // Listener for display-mode media query & install events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(display-mode: standalone)');
    const handleMQChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches || (navigator as any).standalone === true);
    };

    if (mq.addEventListener) {
      mq.addEventListener('change', handleMQChange);
    } else {
      mq.addListener(handleMQChange);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalledEvent(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handleMQChange);
      } else {
        mq.removeListener(handleMQChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Screen Wake Lock Management
  useEffect(() => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;

    let activeSentinel: any = null;

    const requestLock = async () => {
      try {
        if (wakeLockEnabled && document.visibilityState === 'visible') {
          activeSentinel = await (navigator as any).wakeLock.request('screen');
          setWakeLockSentinel(activeSentinel);
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };

    if (wakeLockEnabled) {
      requestLock();
    } else if (wakeLockSentinel) {
      wakeLockSentinel.release().catch(() => {});
      setWakeLockSentinel(null);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wakeLockEnabled) {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (activeSentinel) {
        activeSentinel.release().catch(() => {});
      }
    };
  }, [wakeLockEnabled]);

  // Handler functions
  const installPwa = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.error('PWA Install error:', err);
    }
    return false;
  };

  const toggleHaptics = (enabled: boolean) => {
    setHapticsEnabledState(enabled);
    localStorage.setItem('mcu_haptics_enabled', String(enabled));
    if (enabled) triggerHaptic('selection');
  };

  const toggleBadge = (enabled: boolean) => {
    setBadgeEnabledState(enabled);
    localStorage.setItem('mcu_badge_enabled', String(enabled));
    if (!enabled) {
      clearAppBadge();
    }
  };

  const toggleWakeLock = (enabled: boolean) => {
    setWakeLockEnabledState(enabled);
    localStorage.setItem('mcu_wakelock_enabled', String(enabled));
    if (hapticsEnabled) triggerHaptic('selection');
  };

  const selectAppIcon = (iconId: string) => {
    setSelectedIcon(iconId);
    localStorage.setItem('mcu_selected_app_icon', iconId);
    applyAppIcon(iconId);
    if (hapticsEnabled) triggerHaptic('success');
  };

  return {
    isStandalone: isStandalone || isInstalledEvent,
    canInstall: !!deferredPrompt,
    installPwa,
    hapticsEnabled,
    toggleHaptics,
    badgeEnabled,
    toggleBadge,
    wakeLockEnabled,
    toggleWakeLock,
    selectedIcon,
    selectAppIcon,
    hasWakeLockSupport: typeof window !== 'undefined' && 'wakeLock' in navigator,
    hasVibrationSupport: typeof window !== 'undefined' && 'vibrate' in navigator,
    hasBadgeSupport: typeof window !== 'undefined' && ('setAppBadge' in navigator || 'experimentalSetAppBadge' in navigator),
  };
}
