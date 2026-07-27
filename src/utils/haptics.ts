// Utility for Haptic Feedback using Web Vibration API
export type HapticPattern = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/**
 * Triggers subtle haptic vibration on touch/mobile devices if supported.
 */
export function triggerHaptic(type: HapticPattern = 'light'): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  const isEnabled = localStorage.getItem('mcu_haptics_enabled') !== 'false';
  if (!isEnabled) return;

  try {
    switch (type) {
      case 'selection':
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(22);
        break;
      case 'heavy':
        navigator.vibrate(35);
        break;
      case 'success':
        navigator.vibrate([15, 30, 25]);
        break;
      case 'warning':
        navigator.vibrate([30, 50, 30]);
        break;
      case 'error':
        navigator.vibrate([40, 60, 40, 60, 40]);
        break;
      default:
        navigator.vibrate(10);
        break;
    }
  } catch {
    // Ignore vibration failures (e.g. user gesture requirement or disabled in OS settings)
  }
}
