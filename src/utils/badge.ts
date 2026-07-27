// Utility for App Icon Badge API (navigator.setAppBadge / navigator.clearAppBadge)

/**
 * Updates the app icon badge count on supported home screens and taskbars.
 * @param count Number of remaining unwatched titles or active alerts (0 clears the badge)
 */
export async function updateAppBadge(count: number): Promise<void> {
  if (typeof window === 'undefined') return;

  const isEnabled = localStorage.getItem('mcu_badge_enabled') !== 'false';
  if (!isEnabled) {
    return clearAppBadge();
  }

  try {
    const nav = navigator as any;
    if (count > 0) {
      if (typeof nav.setAppBadge === 'function') {
        await nav.setAppBadge(count);
      } else if (typeof nav.experimentalSetAppBadge === 'function') {
        await nav.experimentalSetAppBadge(count);
      }
    } else {
      await clearAppBadge();
    }
  } catch {
    // Gracefully handle permission rejections or lack of OS badge support
  }
}

/**
 * Clears the app icon badge.
 */
export async function clearAppBadge(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const nav = navigator as any;
    if (typeof nav.clearAppBadge === 'function') {
      await nav.clearAppBadge();
    } else if (typeof nav.experimentalClearAppBadge === 'function') {
      await nav.experimentalClearAppBadge();
    }
  } catch {
    // Gracefully handle
  }
}
