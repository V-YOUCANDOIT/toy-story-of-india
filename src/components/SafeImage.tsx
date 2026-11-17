import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackTitle,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F0E8DD] text-[#30251F]/60 p-4 text-center ${className}`}
        aria-label={alt}
      >
        <Sparkles className="w-6 h-6 text-[#C58F91] mb-2 opacity-80" strokeWidth={1.5} />
        <span className="font-serif-editorial text-sm italic text-[#30251F]/70 max-w-[16ch] leading-snug">
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
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
