import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import {
  ArrowRight,
  Baby,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Gem,
  Gift,
  Heart,
  MapPin,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import type { JewelryMenuItem, MenuCategory, QuickMenuCategory } from '../shared/types';
import type { KstBusinessStatus } from '../utils/shopAssets';
import {
  filterMenuItemsByCategory,
  formatKrw,
  HERO_SLIDES,
  ITEM_IMAGE_MAP,
} from '../utils/shopAssets';
import { ResilientImage } from './ResilientImage';

interface TodayPicksSectionProps {
  menuItems: JewelryMenuItem[];
  selectedCategory: MenuCategory;
  onSelectCategory: (category: QuickMenuCategory) => void;
  addressLabel: string;
  businessStatus: KstBusinessStatus;
  onInquireItem: (item: JewelryMenuItem) => void;
  onOpenConcierge: () => void;
}

const QUICK_MENU_CONFIG: Array<{
  id: QuickMenuCategory;
  label: string;
  caption: string;
  icon: typeof Sparkles;
}> = [
  { id: '오늘의추천', label: '오늘의추천', caption: '아틀리에 픽', icon: Sparkles },
  { id: '순금', label: '순금', caption: '24K 시세', icon: Coins },
  { id: '반지', label: '반지', caption: '커플·솔리테어', icon: Gem },
  { id: '돌반지', label: '돌반지', caption: '백일·첫돌', icon: Baby },
  { id: '목걸이', label: '목걸이', caption: '진주·다이아', icon: Heart },
  { id: '선물추천', label: '선물추천', caption: '기프트 포장', icon: Gift },
];

const SHOWCASE_TITLES: Record<QuickMenuCategory, { eyebrow: string; title: string }> = {
  오늘의추천: { eyebrow: "TODAY'S CURATED PICKS", title: '오늘의 추천템' },
  순금: { eyebrow: '24K PURE GOLD', title: '24K 순금 컬렉션' },
  반지: { eyebrow: 'RINGS & COUPLE BANDS', title: '반지 · 커플링' },
  돌반지: { eyebrow: 'FIRST MILESTONE GOLD', title: '아기 돌반지 · 돌팔찌' },
  목걸이: { eyebrow: 'NECKLACES & PENDANTS', title: '목걸이 · 펜던트' },
  선물추천: { eyebrow: 'GIFT CURATION', title: '시그니처 선물 추천' },
};

export function TodayPicksSection({
  menuItems,
  selectedCategory,
  onSelectCategory,
  addressLabel,
  businessStatus,
  onInquireItem,
  onOpenConcierge,
}: TodayPicksSectionProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef<number>(0);

  const activeQuickMenu: QuickMenuCategory =
    selectedCategory === '전체' || selectedCategory === '수선 · 맞춤 케어'
      ? '오늘의추천'
      : selectedCategory;

  const displayedItems = useMemo(
    () => filterMenuItemsByCategory(menuItems, activeQuickMenu),
    [menuItems, activeQuickMenu]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<QuickMenuCategory, number> = {
      오늘의추천: 0,
      순금: 0,
      반지: 0,
      돌반지: 0,
      목걸이: 0,
      선물추천: 0,
    };
    for (const key of Object.keys(counts) as QuickMenuCategory[]) {
      counts[key] = filterMenuItemsByCategory(menuItems, key).length;
    }
    return counts;
  }, [menuItems]);

  useEffect(() => {
    if (isAutoPaused) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [isAutoPaused]);

  const handlePrevSlide = () => {
    setIsAutoPaused(true);
    setActiveSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleNextSlide = () => {
    setIsAutoPaused(true);
    setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    touchDeltaXRef.current = 0;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return;
    touchDeltaXRef.current = (e.touches[0]?.clientX ?? 0) - touchStartXRef.current;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null) return;
    if (touchDeltaXRef.current > 44) {
      handlePrevSlide();
    } else if (touchDeltaXRef.current < -44) {
      handleNextSlide();
    }
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
  };

  const handleSelectQuickMenu = (category: QuickMenuCategory) => {
    onSelectCategory(category);
  };

  const handleSlideCtaClick = (category: QuickMenuCategory) => {
    onSelectCategory(category);
    const target = document.getElementById('quick-showcase');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showcaseMeta = SHOWCASE_TITLES[activeQuickMenu];

  return (
    <section id="featured" className="pb-12 lg:pb-20">
      {/* Full-Bleed Mobile-First Multi-Slide Hero (4 Slides) */}
      <div
        className="relative w-full h-[74svh] min-h-[480px] max-h-[660px] lg:h-[600px] overflow-hidden bg-[#1C1917] select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsAutoPaused(true)}
        onMouseLeave={() => setIsAutoPaused(false)}
        aria-roledescription="carousel"
        aria-label="쥬얼리아 주요 컬렉션 쇼케이스"
      >
        {/* Slides Track */}
        <div
          className="flex w-full h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          {HERO_SLIDES.map((slide, idx) => (
            <div key={slide.id} className="relative w-full h-full shrink-0">
              <ResilientImage
                src={slide.imageUrl}
                alt={slide.imageAlt}
                fallbackTitle={slide.eyebrow}
                className="w-full h-full object-cover object-center"
              />
              {/* Measured Contrast Scrim */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/25 pointer-events-none"
                aria-hidden="true"
              />

              {/* Top Store Status Line */}
              <div className="absolute top-4 inset-x-0 px-4 sm:px-6 lg:px-10 pointer-events-none">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-[11px] sm:text-xs text-white/90">
                  <span className="font-medium tracking-wide">
                    대전 서구 월평동 · {businessStatus.statusLabel}
                  </span>
                  <span className="text-white/80 tabular-nums">
                    KST {businessStatus.currentTimeLabel}
                  </span>
                </div>
              </div>

              {/* Bottom Hero Editorial Copy & Actions */}
              <div className="absolute inset-x-0 bottom-14 sm:bottom-16 px-4 sm:px-6 lg:px-10">
                <div className="max-w-7xl mx-auto">
                  <p className="text-[11px] sm:text-xs tracking-[0.18em] text-[#E6D3B3] font-medium mb-2">
                    {slide.eyebrow}
                  </p>
                  {idx === 0 ? (
                    <h1 className="font-display text-[2rem] sm:text-5xl font-semibold leading-[1.16] tracking-tight text-white whitespace-pre-line mb-2.5 [text-wrap:balance]">
                      {slide.title}
                    </h1>
                  ) : (
                    <h2 className="font-display text-[2rem] sm:text-5xl font-semibold leading-[1.16] tracking-tight text-white whitespace-pre-line mb-2.5 [text-wrap:balance]">
                      {slide.title}
                    </h2>
                  )}
                  <p className="text-xs sm:text-sm text-white/85 leading-relaxed max-w-md mb-5">
                    {slide.subtitle}
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSlideCtaClick(slide.targetCategory)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 py-2.5 bg-[#FAF9F6] text-[#1C1917] text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#EFECE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{slide.ctaLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={onOpenConcierge}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 bg-black/45 backdrop-blur-sm border border-white/30 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-black/65 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#E6D3B3]" />
                      <span>실시간 예약</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Hero Controls Bar (Progress Indicators + Prev/Next Touch Targets) */}
        <div className="absolute inset-x-0 bottom-3 px-4 sm:px-6 lg:px-10 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Interactive Slide Progress Segments */}
            <div className="flex items-center gap-1.5 flex-1 max-w-[220px]" role="tablist" aria-label="히어로 슬라이드 선택">
              {HERO_SLIDES.map((slide, index) => {
                const isActive = activeSlide === index;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`${index + 1}번째 슬라이드: ${slide.ctaLabel}`}
                    onClick={() => {
                      setIsAutoPaused(true);
                      setActiveSlide(index);
                    }}
                    className="py-3 flex-1 flex items-center cursor-pointer"
                  >
                    <span
                      className={`block h-[3px] w-full rounded-sm transition-all duration-300 ${
                        isActive ? 'bg-white' : 'bg-white/35 hover:bg-white/60'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Slide Counter & Arrow Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-medium text-white/85 tabular-nums mr-1">
                0{activeSlide + 1} / 0{HERO_SLIDES.length}
              </span>
              <button
                type="button"
                onClick={handlePrevSlide}
                aria-label="이전 히어로 이미지"
                className="w-11 h-11 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-black/65 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextSlide}
                aria-label="다음 히어로 이미지"
                className="w-11 h-11 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-black/65 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Item Mobile Quick Menu Directly Below Hero */}
      <div className="bg-white border-b border-[#C8BEB0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-5">
          <div
            className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3"
            role="tablist"
            aria-label="쥬얼리 빠른 카테고리 메뉴"
          >
            {QUICK_MENU_CONFIG.map((menu) => {
              const Icon = menu.icon;
              const active = activeQuickMenu === menu.id;
              const count = categoryCounts[menu.id];
              return (
                <button
                  key={menu.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectQuickMenu(menu.id)}
                  className={`min-h-[76px] px-2.5 py-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1C1917] border-[#1C1917] text-[#FAF9F6] shadow-sm'
                      : 'bg-[#FAF9F6] border-[#C8BEB0] text-[#1C1917] hover:border-[#9A7B4F]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${
                      active ? 'text-[#E6D3B3]' : 'text-[#9A7B4F]'
                    }`}
                  />
                  <span className="text-[13px] font-semibold leading-tight whitespace-nowrap">
                    {menu.label}
                  </span>
                  <span
                    className={`text-[10px] leading-none whitespace-nowrap ${
                      active ? 'text-white/75' : 'text-[#78716C]'
                    }`}
                  >
                    {menu.caption} · {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Quick-Menu Showcase (Defaults to 오늘의추천 on Initial Load) */}
      <div id="quick-showcase" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-8 sm:pt-12">
        <div className="flex items-end justify-between gap-4 mb-5 sm:mb-8">
          <div>
            <p className="text-[11px] sm:text-xs tracking-wider text-[#9A7B4F] font-medium mb-1">
              {showcaseMeta.eyebrow}
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-semibold text-[#1C1917] [text-wrap:balance]">
              {showcaseMeta.title}
            </h2>
          </div>
        </div>

        {/* Mobile Horizontal Snap Carousel / Tablet & Desktop Grid */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          {displayedItems.map((item) => {
            const imageUrl = item.imageKey ? ITEM_IMAGE_MAP[item.imageKey] : undefined;
            return (
              <article
                key={item.id}
                className="w-[76vw] max-w-[296px] shrink-0 snap-start sm:w-auto sm:max-w-none group flex flex-col bg-white border border-[#C8BEB0] rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                <div className="aspect-[4/3] bg-[#F2EFE9] overflow-hidden">
                  <ResilientImage
                    src={imageUrl}
                    alt={item.name}
                    fallbackTitle={item.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="flex flex-col flex-1 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[#78716C] mb-1.5">
                    <span>{item.category}</span>
                    {item.todayPickTag && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#9A7B4F] font-medium truncate">{item.todayPickTag}</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-[15px] sm:text-base font-semibold text-[#1C1917] leading-snug mb-1">
                    {item.name}
                  </h3>

                  <p className="text-xs text-[#78716C] mb-2.5 line-clamp-1">{item.material}</p>

                  <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed mb-4 flex-1 line-clamp-3">
                    {item.todayPickNote || item.description}
                  </p>

                  <div className="pt-3 border-t border-[#D6CCC0] flex items-center justify-between gap-2.5">
                    <span className="text-[15px] font-semibold text-[#1C1917] tabular-nums whitespace-nowrap">
                      {formatKrw(item.priceKrw)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onInquireItem(item)}
                      className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] hover:bg-[#1C1917] hover:text-[#FAF9F6] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      시착 · 상담
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Compact Mobile Store Quick-Info Bar */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-5 bg-white border border-[#C8BEB0] rounded-xl">
          <a
            href="#location"
            className="flex items-start gap-3 min-h-[44px] hover:opacity-85 transition-opacity"
          >
            <MapPin className="w-4 h-4 text-[#9A7B4F] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[11px] text-[#78716C] block">매장 위치 · 길찾기</span>
              <span className="text-xs sm:text-sm font-medium text-[#1C1917] block leading-snug">
                {addressLabel}
              </span>
            </div>
          </a>
          <a
            href="#hours"
            className="flex items-start gap-3 min-h-[44px] pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l sm:pl-5 border-[#D6CCC0] hover:opacity-85 transition-opacity"
          >
            <Clock className="w-4 h-4 text-[#9A7B4F] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[11px] text-[#78716C] block">
                운영 상태 (KST {businessStatus.currentTimeLabel})
              </span>
              <span
                className={`text-xs sm:text-sm font-medium block leading-snug ${
                  businessStatus.isOpen ? 'text-[#166534]' : 'text-[#1C1917]'
                }`}
              >
                {businessStatus.statusLabel} · {businessStatus.detailLabel}
              </span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
