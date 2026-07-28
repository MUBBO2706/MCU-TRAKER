import React, { useState, useEffect, useRef } from 'react';

interface ParallaxContainerProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number; // scale multiplier for the movement (default: 1)
  id?: string;
}

export const ParallaxContainer: React.FC<ParallaxContainerProps> = ({
  children,
  className = '',
  intensity = 1,
  id
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>('rotateX(0deg) rotateY(0deg)');
  const [parallaxEnabled, setParallaxEnabled] = useState(true);

  useEffect(() => {
    // Check if parallax is explicitly disabled
    const savedParallax = localStorage.getItem('mcu_pwa_parallax');
    if (savedParallax === 'off') {
      setParallaxEnabled(false);
      setTransformStyle('rotateX(0deg) rotateY(0deg)');
      return;
    } else {
      setParallaxEnabled(true);
    }

    // 1. Gyroscope listener (Device Orientation)
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!parallaxEnabled) return;
      const { beta, gamma } = event; // beta is front-back [-180, 180], gamma is left-right [-90, 90]
      if (beta === null || gamma === null) return;

      // Natural resting state: beta approx 50 degrees for handheld phone
      const restingBeta = 50;
      const calcX = Math.max(-12, Math.min(12, (beta - restingBeta) * 0.35)) * intensity;
      const calcY = Math.max(-12, Math.min(12, gamma * 0.35)) * intensity;

      setTransformStyle(`rotateX(${-calcX}deg) rotateY(${calcY}deg) scale(1.025)`);
    };

    // 2. Mouse move listener (Desktop fallback)
    const handleMouseMove = (event: MouseEvent) => {
      if (!parallaxEnabled || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Calculate mouse coordinates relative to card center
      const mouseX = event.clientX - rect.left - width / 2;
      const mouseY = event.clientY - rect.top - height / 2;

      // Calculate rotation (max 8 degrees)
      const calcX = -(mouseY / (height / 2)) * 6 * intensity;
      const calcY = (mouseX / (width / 2)) * 6 * intensity;

      setTransformStyle(`rotateX(${calcX}deg) rotateY(${calcY}deg) scale(1.025)`);
    };

    const handleMouseLeave = () => {
      setTransformStyle('rotateX(0deg) rotateY(0deg) scale(1)');
    };

    // Listen to orientation events
    window.addEventListener('deviceorientation', handleOrientation, true);
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [parallaxEnabled, intensity]);

  return (
    <div
      ref={containerRef}
      id={id}
      className={`transition-transform duration-300 ease-out ${className}`}
      style={{
        transform: transformStyle,
        transformStyle: 'preserve-3d',
        perspective: '800px',
        willChange: 'transform'
      }}
    >
      {children}
    </div>
  );
};
