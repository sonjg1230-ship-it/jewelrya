import type { DayHours, JewelryMenuItem, MenuCategory, QuickMenuCategory } from '../shared/types';

export interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  targetCategory: QuickMenuCategory;
  ctaLabel: string;
}

export const HERO_IMAGE_PATH = '/src/assets/images/hero_jewelry_atelier_1794746607971.jpg';

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-atelier',
    eyebrow: 'JEWELRYIA FINE ATELIER',
    title: '시간이 지나도 빛나는\n쥬얼리아의 데일리 피스',
    subtitle: '대전 서구 월평동 파인 주얼리 쇼룸 · 시착 및 맞춤 상담 예약',
    imageUrl: '/src/assets/images/hero_jewelry_atelier_1794746607971.jpg',
    imageAlt: '쥬얼리아 파인 주얼리 부티크 쇼룸 전경',
    targetCategory: '오늘의추천',
    ctaLabel: '오늘의 추천 보기',
  },
  {
    id: 'slide-pure-gold',
    eyebrow: '24K PURE GOLD & DOLBANJI',
    title: '변치 않는 가치,\n24K 순금 · 아기 돌반지',
    subtitle: '정품 99.9% 순금 시세 적용 및 고급 보자기 선물 포장',
    imageUrl: '/src/assets/images/hero_pure_gold_1794889217809.jpg',
    imageAlt: '24K 순금 돌반지와 순금 뱅글 팔찌 컬렉션',
    targetCategory: '순금',
    ctaLabel: '순금 · 돌반지 보기',
  },
  {
    id: 'slide-ring-necklace',
    eyebrow: 'RING & NECKLACE COLLECTION',
    title: '손끝과 목선을 채우는\n18K 다이아 · 진주 컬렉션',
    subtitle: '커플링 맞춤 각인부터 데일리 솔리테어 레이어드까지',
    imageUrl: '/src/assets/images/hero_ring_necklace_1794889218481.jpg',
    imageAlt: '18K 솔리테어 다이아 반지와 진주 체인 목걸이',
    targetCategory: '반지',
    ctaLabel: '반지 · 목걸이 보기',
  },
  {
    id: 'slide-gift-curation',
    eyebrow: 'SIGNATURE GIFT CURATION',
    title: '소중한 기념일을 위한\n시그니처 주얼리 기프트',
    subtitle: '스웨이드 리본 박스와 메시지 카드 당일 포장 서비스',
    imageUrl: '/src/assets/images/hero_gift_curation_1794889218854.jpg',
    imageAlt: '샴페인 실크 리본으로 포장된 쥬얼리아 시그니처 주얼리 선물 박스',
    targetCategory: '선물추천',
    ctaLabel: '선물 추천 보기',
  },
];

export const ITEM_IMAGE_MAP: Record<NonNullable<JewelryMenuItem['imageKey']>, string> = {
  ring: '/src/assets/images/item_signature_ring_1794746607961.jpg',
  necklace: '/src/assets/images/item_pearl_necklace_1794746609764.jpg',
  earrings: '/src/assets/images/item_sculptural_earrings_1794746609368.jpg',
  couple: '/src/assets/images/item_couple_band_1794746609096.jpg',
  pureGold: '/src/assets/images/hero_pure_gold_1794889217809.jpg',
  dolbanji: '/src/assets/images/hero_pure_gold_1794889217809.jpg',
  giftBox: '/src/assets/images/hero_gift_curation_1794889218854.jpg',
};

export function filterMenuItemsByCategory(
  items: JewelryMenuItem[],
  category: MenuCategory
): JewelryMenuItem[] {
  if (category === '전체') return items;
  if (category === '오늘의추천') return items.filter((item) => item.isTodayPick);
  if (category === '선물추천') {
    return items.filter((item) => item.category === '선물추천' || item.isGiftRecommended);
  }
  return items.filter((item) => item.category === category);
}

export function formatKrw(amount: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface KstBusinessStatus {
  isOpen: boolean;
  statusLabel: '영업 중' | '영업 종료' | '오늘 휴무';
  detailLabel: string;
  currentDayIndex: number;
  currentDayLabel: string;
  currentTimeLabel: string;
  currentClockLabel: string;
  todayHoursLabel: string;
  countdownTitle: string;
  countdownSeconds: number;
  countdownParts: CountdownParts;
  targetTimeLabel: string;
  openTimeLabel: string;
  openTimeValue: string;
  closeTimeLabel: string;
  closeTimeValue: string;
  windowStartLabel: string;
  windowEndLabel: string;
  progressPercent: number;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function splitCountdown(totalSeconds: number): CountdownParts {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return { days, hours, minutes, seconds };
}

function findNextOpenRuleWithOffset(
  hours: DayHours[],
  currentDayIndex: number
): { rule: DayHours; offset: number } | undefined {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidateIndex = (currentDayIndex + offset) % 7;
    const candidate = hours.find((h) => h.dayIndex === candidateIndex && !h.isClosed);
    if (candidate) return { rule: candidate, offset };
  }
  return undefined;
}

function findPrevCloseGapSeconds(
  hours: DayHours[],
  currentDayIndex: number,
  nowTotalSeconds: number,
  allowTodayClosedCheck: boolean
): number {
  if (allowTodayClosedCheck) {
    const todayRule = hours.find((h) => h.dayIndex === currentDayIndex && !h.isClosed);
    if (todayRule) {
      const closeSec = parseMinutes(todayRule.close) * 60;
      if (nowTotalSeconds >= closeSec) {
        return nowTotalSeconds - closeSec;
      }
    }
  }
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidateIndex = (currentDayIndex - offset + 7) % 7;
    const candidate = hours.find((h) => h.dayIndex === candidateIndex && !h.isClosed);
    if (candidate) {
      const closeSec = parseMinutes(candidate.close) * 60;
      return offset * 86400 - closeSec + nowTotalSeconds;
    }
  }
  return 0;
}

export function getKstBusinessStatus(hours: DayHours[], nowMs: number = Date.now()): KstBusinessStatus {
  const now = new Date(nowMs);
  const kstFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = kstFormatter.formatToParts(now);
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const weekdayPart = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hourPart = Number(parts.find((p) => p.type === 'hour')?.value ?? '12') % 24;
  const minutePart = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const secondPart = Number(parts.find((p) => p.type === 'second')?.value ?? '0');

  const currentDayIndex = weekdayMap[weekdayPart] ?? 1;
  const currentDayLabel = DAY_LABELS[currentDayIndex] ?? '월';
  const nowMinutes = hourPart * 60 + minutePart;
  const nowTotalSeconds = hourPart * 3600 + minutePart * 60 + secondPart;
  const currentTimeLabel = `${String(hourPart).padStart(2, '0')}:${String(minutePart).padStart(2, '0')}`;
  const currentClockLabel = `${currentTimeLabel}:${String(secondPart).padStart(2, '0')}`;

  const todayRule = hours.find((h) => h.dayIndex === currentDayIndex);
  const nextOpenMatch = findNextOpenRuleWithOffset(hours, currentDayIndex);
  const todayHoursLabel =
    !todayRule || todayRule.isClosed
      ? '정기휴무'
      : `${todayRule.open} - ${todayRule.close}`;

  if (!todayRule || todayRule.isClosed) {
    const reason = todayRule?.note ? `정기휴무 (${todayRule.note})` : '정기휴무';
    const nextText = nextOpenMatch
      ? ` · 다음 영업 ${nextOpenMatch.rule.dayLabel}요일 ${nextOpenMatch.rule.open}`
      : '';
    const remainingSeconds = nextOpenMatch
      ? nextOpenMatch.offset * 86400 +
        parseMinutes(nextOpenMatch.rule.open) * 60 -
        nowTotalSeconds
      : 0;
    const elapsedSinceClose = findPrevCloseGapSeconds(hours, currentDayIndex, nowTotalSeconds, false);
    const totalGap = elapsedSinceClose + remainingSeconds;
    const progressPercent =
      totalGap > 0 ? Math.max(4, Math.min(98, Math.round((elapsedSinceClose / totalGap) * 100))) : 0;

    return {
      isOpen: false,
      statusLabel: '오늘 휴무',
      detailLabel: `${reason}${nextText}`,
      currentDayIndex,
      currentDayLabel,
      currentTimeLabel,
      currentClockLabel,
      todayHoursLabel,
      countdownTitle: '다음 오픈까지 남은 시간',
      countdownSeconds: Math.max(0, remainingSeconds),
      countdownParts: splitCountdown(remainingSeconds),
      targetTimeLabel: nextOpenMatch
        ? nextOpenMatch.offset === 1
          ? `내일(${nextOpenMatch.rule.dayLabel}) ${nextOpenMatch.rule.open} 오픈`
          : `${nextOpenMatch.rule.dayLabel}요일 ${nextOpenMatch.rule.open} 오픈`
        : '영업 일정 확인 중',
      openTimeLabel: nextOpenMatch
        ? `다음 오픈 (${nextOpenMatch.rule.dayLabel}요일)`
        : '다음 오픈',
      openTimeValue: nextOpenMatch ? nextOpenMatch.rule.open : '--:--',
      closeTimeLabel: nextOpenMatch
        ? `다음 마감 (${nextOpenMatch.rule.dayLabel}요일)`
        : '마감 시간',
      closeTimeValue: nextOpenMatch ? nextOpenMatch.rule.close : '--:--',
      windowStartLabel: '휴무일 대기',
      windowEndLabel: nextOpenMatch
        ? `${nextOpenMatch.rule.dayLabel} ${nextOpenMatch.rule.open} 오픈`
        : '일정 확인',
      progressPercent,
    };
  }

  const openMinutes = parseMinutes(todayRule.open);
  const closeMinutes = parseMinutes(todayRule.close);
  const openTotalSeconds = openMinutes * 60;
  const closeTotalSeconds = closeMinutes * 60;

  if (nowMinutes >= openMinutes && nowMinutes < closeMinutes) {
    const remainingMinutes = closeMinutes - nowMinutes;
    const remainingSeconds = Math.max(0, closeTotalSeconds - nowTotalSeconds);
    const totalOpenSeconds = Math.max(1, closeTotalSeconds - openTotalSeconds);
    const elapsedSeconds = Math.max(0, nowTotalSeconds - openTotalSeconds);
    const progressPercent = Math.max(
      2,
      Math.min(100, Math.round((elapsedSeconds / totalOpenSeconds) * 100))
    );

    return {
      isOpen: true,
      statusLabel: '영업 중',
      detailLabel:
        remainingMinutes <= 45
          ? `${todayRule.close} 마감 예정 (${remainingMinutes}분 남음)`
          : `오늘 ${todayRule.close}까지 운영`,
      currentDayIndex,
      currentDayLabel,
      currentTimeLabel,
      currentClockLabel,
      todayHoursLabel,
      countdownTitle: '영업 마감까지 남은 시간',
      countdownSeconds: remainingSeconds,
      countdownParts: splitCountdown(remainingSeconds),
      targetTimeLabel: `오늘 ${todayRule.close} 마감`,
      openTimeLabel: '금일 오픈 시간',
      openTimeValue: todayRule.open,
      closeTimeLabel: '금일 마감 시간',
      closeTimeValue: todayRule.close,
      windowStartLabel: `${todayRule.open} 오픈`,
      windowEndLabel: `${todayRule.close} 마감`,
      progressPercent,
    };
  }

  if (nowMinutes < openMinutes) {
    const remainingSeconds = Math.max(0, openTotalSeconds - nowTotalSeconds);
    const elapsedSinceClose = findPrevCloseGapSeconds(hours, currentDayIndex, nowTotalSeconds, false);
    const totalGap = elapsedSinceClose + remainingSeconds;
    const progressPercent =
      totalGap > 0 ? Math.max(4, Math.min(98, Math.round((elapsedSinceClose / totalGap) * 100))) : 0;

    return {
      isOpen: false,
      statusLabel: '영업 종료',
      detailLabel: `오늘 ${todayRule.open} 오픈 예정`,
      currentDayIndex,
      currentDayLabel,
      currentTimeLabel,
      currentClockLabel,
      todayHoursLabel,
      countdownTitle: '다음 오픈까지 남은 시간',
      countdownSeconds: remainingSeconds,
      countdownParts: splitCountdown(remainingSeconds),
      targetTimeLabel: `오늘 ${todayRule.open} 오픈`,
      openTimeLabel: '금일 오픈 예정',
      openTimeValue: todayRule.open,
      closeTimeLabel: '금일 마감 예정',
      closeTimeValue: todayRule.close,
      windowStartLabel: '오픈 준비 중',
      windowEndLabel: `오늘 ${todayRule.open} 오픈`,
      progressPercent,
    };
  }

  const remainingSeconds = nextOpenMatch
    ? nextOpenMatch.offset * 86400 +
      parseMinutes(nextOpenMatch.rule.open) * 60 -
      nowTotalSeconds
    : 0;
  const elapsedSinceClose = findPrevCloseGapSeconds(hours, currentDayIndex, nowTotalSeconds, true);
  const totalGap = elapsedSinceClose + remainingSeconds;
  const progressPercent =
    totalGap > 0 ? Math.max(4, Math.min(98, Math.round((elapsedSinceClose / totalGap) * 100))) : 0;

  return {
    isOpen: false,
    statusLabel: '영업 종료',
    detailLabel: nextOpenMatch
      ? `다음 영업 ${nextOpenMatch.rule.dayLabel}요일 ${nextOpenMatch.rule.open} 오픈`
      : '영업 시간 외입니다',
    currentDayIndex,
    currentDayLabel,
    currentTimeLabel,
    currentClockLabel,
    todayHoursLabel,
    countdownTitle: '다음 오픈까지 남은 시간',
    countdownSeconds: Math.max(0, remainingSeconds),
    countdownParts: splitCountdown(remainingSeconds),
    targetTimeLabel: nextOpenMatch
      ? nextOpenMatch.offset === 1
        ? `내일(${nextOpenMatch.rule.dayLabel}) ${nextOpenMatch.rule.open} 오픈`
        : `${nextOpenMatch.rule.dayLabel}요일 ${nextOpenMatch.rule.open} 오픈`
      : '영업 시간 외',
    openTimeLabel: nextOpenMatch
      ? `다음 오픈 (${nextOpenMatch.rule.dayLabel}요일)`
      : '금일 오픈',
    openTimeValue: nextOpenMatch ? nextOpenMatch.rule.open : todayRule.open,
    closeTimeLabel: nextOpenMatch
      ? `다음 마감 (${nextOpenMatch.rule.dayLabel}요일)`
      : '금일 마감',
    closeTimeValue: nextOpenMatch ? nextOpenMatch.rule.close : todayRule.close,
    windowStartLabel: '금일 영업 종료',
    windowEndLabel: nextOpenMatch
      ? `${nextOpenMatch.rule.dayLabel} ${nextOpenMatch.rule.open} 오픈`
      : '다음 영업일',
    progressPercent,
  };
}
