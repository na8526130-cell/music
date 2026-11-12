import React, { useState, useEffect } from 'react';
import { Music2 } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  fallbackText?: string;
  useBase64?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = '',
  className = '',
  fallbackText,
  useBase64 = false,
  ...props
}) => {
  // Determine initial source URL
  const getInitialSrc = (rawSrc?: string): string | undefined => {
    if (!rawSrc) return undefined;
    if (rawSrc.startsWith('data:') || rawSrc.startsWith('/') || rawSrc.startsWith('./')) {
      return rawSrc;
    }
    // For external HTTP/HTTPS images, if useBase64/proxy is enabled, use server proxy directly
    if (useBase64 && rawSrc.startsWith('http')) {
      return `/api/proxy/image?url=${encodeURIComponent(rawSrc)}`;
    }
    return rawSrc;
  };

  const [currentSrc, setCurrentSrc] = useState<string | undefined>(() => getInitialSrc(src));
  const [hasError, setHasError] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);

  useEffect(() => {
    setHasError(false);
    setTriedProxy(false);
    setCurrentSrc(getInitialSrc(src));
  }, [src, useBase64]);

  const handleError = () => {
    // If direct image URL failed and we haven't tried the backend proxy yet, try proxy once
    if (src && src.startsWith('http') && !useBase64 && !triedProxy) {
      setTriedProxy(true);
      setCurrentSrc(`/api/proxy/image?url=${encodeURIComponent(src)}`);
    } else {
      setHasError(true);
    }
  };

  if (!currentSrc || hasError) {
    return (
      <div
        className={`bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-center text-neutral-600 overflow-hidden select-none ${className}`}
        title={alt || fallbackText}
      >
        <Music2 className="w-1/2 h-1/2 opacity-30 text-red-500/50 shrink-0" />
        {fallbackText && (
          <span className="text-[10px] mt-1 text-center font-medium text-neutral-400 line-clamp-1 px-1">
            {fallbackText}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
      loading="lazy"
      {...props}
    />
  );
};
