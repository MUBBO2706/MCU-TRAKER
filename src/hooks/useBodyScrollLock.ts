import { useEffect, useRef } from 'react';

/**
 * Reusable hook to lock body scroll when a modal or dialog is open.
 * - Hides the page scrollbar.
 * - Prevents desktop mouse wheel, trackpad scrolling, and mobile touch drag scrolling.
 * - Preserves the exact background scroll position.
 * - Allows inner modal scrolling for elements with class 'scrollable-modal-content'.
 */
export function useBodyScrollLock(isOpen: boolean) {
  const scrollPosRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) return;

    // Save exact scroll position
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    scrollPosRef.current = scrollY;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Save current styling to restore exactly later
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;
    const originalBodyPaddingRight = document.body.style.paddingRight;

    // Lock background page scroll and hide scrollbar
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // position: fixed on body is the industry gold standard for locking scroll on iOS/Safari
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    // Apply padding adjustment to prevent visual layout shifts (flicker/jump) when scrollbar disappears
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Touchmove prevent default handler for elements other than scrollable modal content
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const isScrollableModal = target.closest('.scrollable-modal-content');
      if (!isScrollableModal) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    // Add touchmove listener to block mobile background scrolling
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      // Clean up touchmove event listener
      document.removeEventListener('touchmove', handleTouchMove);

      // Restore original inline styles
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      document.body.style.paddingRight = originalBodyPaddingRight;

      // Restore scroll position exactly
      window.scrollTo(0, scrollPosRef.current);
    };
  }, [isOpen]);
}
