interface JewelryaLogoProps {
  size?: 'header' | 'footer';
}

function SparkleStar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 1.5C13.1 8.4 15.6 10.9 22.5 12C15.6 13.1 13.1 15.6 12 22.5C10.9 15.6 8.4 13.1 1.5 12C8.4 10.9 10.9 8.4 12 1.5Z" />
    </svg>
  );
}

function DiamondMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 2H19L23 7.5L12 19L1 7.5Z" />
      <path d="M1 7.5H23" />
      <path d="M5 2L8.5 7.5L12 2L15.5 7.5L19 2" />
      <path d="M8.5 7.5L12 19L15.5 7.5" />
    </svg>
  );
}

export function JewelryaLogo({ size = 'header' }: JewelryaLogoProps) {
  const isFooter = size === 'footer';

  return (
    <span
      className="inline-flex flex-col items-center select-none text-[#1C1917]"
      aria-label="Jewelrya 쥬얼리아"
    >
      {/* Top Row: Left Sparkle + Jewelrya Calligraphic Serif + Right Sparkle */}
      <span className="inline-flex items-center gap-1 sm:gap-1.5 leading-none">
        <SparkleStar
          className={
            isFooter
              ? 'w-4 h-4 sm:w-[18px] sm:h-[18px] -mr-0.5 translate-y-[1px]'
              : 'w-3 h-3 sm:w-3.5 sm:h-3.5 -mr-0.5 translate-y-[1px]'
          }
        />
        <span
          className={`font-logo italic font-bold tracking-[-0.01em] leading-none ${
            isFooter
              ? 'text-[1.95rem] sm:text-[2.25rem]'
              : 'text-[1.45rem] sm:text-[1.68rem]'
          }`}
        >
          Jewelrya
        </span>
        <SparkleStar
          className={
            isFooter
              ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 self-end mb-[3px] -ml-0.5'
              : 'w-2 h-2 sm:w-2.5 sm:h-2.5 self-end mb-[2px] -ml-0.5'
          }
        />
      </span>

      {/* Bottom Row: Faceted Diamond Line Icon + Spaced Korean Wordmark */}
      <span
        className={`inline-flex items-center justify-center leading-none ${
          isFooter ? 'gap-2 mt-1' : 'gap-1.5 mt-0.5'
        }`}
      >
        <DiamondMark
          className={isFooter ? 'w-4 h-3.5 sm:w-[18px] sm:h-4' : 'w-3 h-2.5 sm:w-3.5 sm:h-3'}
        />
        <span
          className={`font-medium text-[#1C1917] leading-none ${
            isFooter
              ? 'text-[11px] sm:text-xs tracking-[0.34em]'
              : 'text-[9px] sm:text-[10px] tracking-[0.3em]'
          }`}
        >
          쥬얼리아
        </span>
      </span>
    </span>
  );
}
