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
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  const [hasError, setHasError] = useState(false);
  const [isBase64Loaded, setIsBase64Loaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (!src) {
      setImgSrc(undefined);
      return;
    }

    // If base64 is explicitly requested or if it's already a data URI
    if (useBase64 && src.startsWith('http')) {
      fetch(`/api/proxy/image?url=${encodeURIComponent(src)}&format=base64`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.base64) {
            setImgSrc(data.base64);
            setIsBase64Loaded(true);
          } else {
            setImgSrc(src);
          }
        })
        .catch(() => {
          setImgSrc(src);
        });
    } else {
      setImgSrc(src);
    }
  }, [src, useBase64]);

  const handleError = () => {
    // If not already tried via base64 proxy, try fetching base64 representation via backend proxy
    if (src && src.startsWith('http') && !isBase64Loaded) {
      fetch(`/api/proxy/image?url=${encodeURIComponent(src)}&format=base64`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.base64) {
            setImgSrc(data.base64);
            setIsBase64Loaded(true);
            setHasError(false);
          } else {
            setHasError(true);
          }
        })
        .catch(() => {
          setHasError(true);
        });
    } else {
      setHasError(true);
    }
  };

  if (!imgSrc || hasError) {
    return (
      <div
        className={`bg-neutral-800 flex flex-col items-center justify-center text-neutral-500 overflow-hidden select-none ${className}`}
      >
        <Music2 className="w-1/2 h-1/2 opacity-40 shrink-0" />
        {fallbackText && (
          <span className="text-[10px] mt-1 text-center font-medium line-clamp-1 px-1">
            {fallbackText}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
      loading="lazy"
      {...props}
    />
  );
};
