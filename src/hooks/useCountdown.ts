import { useState, useEffect } from 'react';

/**
 * Custom hook to calculate the countdown to a target date.
 * Defaults to Avengers: Secret Wars (May 7, 2027).
 */
export function useCountdown(targetDateString: string = '2027-05-07T00:00:00') {
  const [countdownString, setCountdownString] = useState('');

  useEffect(() => {
    const targetDate = new Date(targetDateString);
    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdownString('Battleworld is Here!');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setCountdownString(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [targetDateString]);

  return countdownString;
}
