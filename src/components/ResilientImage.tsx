import { useState } from 'react';
import { Gem } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({ src, alt, className = '', fallbackTitle }: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F2EFE9] via-[#EAE5DC] to-[#E2DBD0] text-[#78716C] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Gem className="w-7 h-7 text-[#9A7B4F] mb-2 stroke-[1.5]" />
        <span className="font-display text-base font-medium text-[#44403C]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
