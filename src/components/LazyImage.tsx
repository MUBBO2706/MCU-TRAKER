import React, { useState, useEffect } from 'react';
import { getAssetUrl } from '../lib/assetCache';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  characterId?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  characterId,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('');

  useEffect(() => {
    if (!src) {
      setError(true);
      setLoading(false);
      return;
    }

    // Is it a gradient, standard hex color background, or data URI?
    if (
      src.startsWith('linear-gradient') ||
      src.startsWith('rgb') ||
      src.startsWith('#')
    ) {
      setError(true);
      setLoading(false);
      return;
    }

    setError(false);
    setLoading(true);

    let isMounted = true;

    if (src.startsWith('/') || src.startsWith('data:')) {
      setProxyUrl(src);
      setLoading(false);
    } else {
      getAssetUrl(src, characterId)
        .then((cachedUrl) => {
          if (isMounted) {
            setProxyUrl(cachedUrl);
          }
        })
        .catch((err) => {
          console.warn('Cache resolution failed, falling back to direct proxy:', err);
          if (isMounted) {
            const charParam = characterId ? `&characterId=${characterId}` : '';
            setProxyUrl(`/api/image-proxy?url=${encodeURIComponent(src!)}${charParam}`);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [src, characterId]);

  return (
    <div className={`relative overflow-hidden bg-neutral-900 shrink-0 ${className}`}>
      {/* Skeletons/Loading States */}
      {loading && !error && (
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center animate-pulse z-10">
          <div className="w-5 h-5 border border-neutral-700 border-t-marvel rounded-full animate-spin" />
        </div>
      )}

      {/* Graceful broken/failed fallback */}
      {error ? (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 p-2 text-center select-none ${fallbackClassName}`}
        >
          <span className="font-display font-black text-xs text-marvel tracking-widest italic leading-none">
            MARVEL
          </span>
          <span className="text-[7px] text-neutral-500 font-mono tracking-wider uppercase mt-1">
            INTEL BLOCKED
          </span>
        </div>
      ) : proxyUrl ? (
        <img
          src={proxyUrl}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setLoading(false)}
          onError={() => {
            if (proxyUrl !== src) {
              // Fall back to direct image URL if proxy failed
              setProxyUrl(src || '');
            } else {
              setError(true);
              setLoading(false);
            }
          }}
          referrerPolicy="no-referrer"
          {...props}
        />
      ) : null}
    </div>
  );
};
