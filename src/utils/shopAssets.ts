import type {
  DayHours,
  JewelryMenuItem,
  MenuCategory,
  QuickMenuCategory,
  VisitorReview,
} from '../shared/types';
import heroJewelryAtelierImg from '../assets/images/hero_jewelry_atelier_1794746607971.jpg';
import heroPureGoldImg from '../assets/images/hero_pure_gold_1794889217809.jpg';
import heroRingNecklaceImg from '../assets/images/hero_ring_necklace_1794889218481.jpg';
import heroGiftCurationImg from '../assets/images/hero_gift_curation_1794889218854.jpg';
import itemSignatureRingImg from '../assets/images/item_signature_ring_1794746607961.jpg';
import itemPearlNecklaceImg from '../assets/images/item_pearl_necklace_1794746609764.jpg';
import itemSculpturalEarringsImg from '../assets/images/item_sculptural_earrings_1794746609368.jpg';
import itemCoupleBandImg from '../assets/images/item_couple_band_1794746609096.jpg';

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

export const HERO_IMAGE_PATH = heroJewelryAtelierImg;

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-atelier',
    eyebrow: 'JEWELRYIA FINE ATELIER',
    title: '시간이 지나도 빛나는\n쥬얼리아의 데일리 피스',
    subtitle: '대전 서구 월평동 파인 주얼리 쇼룸 · 시착 및 맞춤 상담 예약',
    imageUrl: heroJewelryAtelierImg,
    imageAlt: '쥬얼리아 파인 주얼리 부티크 쇼룸 전경',
    targetCategory: '오늘의추천',
    ctaLabel: '오늘의 추천 보기',
  },
  {
    id: 'slide-pure-gold',
    eyebrow: '24K PURE GOLD & DOLBANJI',
    title: '변치 않는 가치,\n24K 순금 · 아기 돌반지',
    subtitle: '정품 99.9% 순금 시세 적용 및 고급 보자기 선물 포장',
    imageUrl: heroPureGoldImg,
    imageAlt: '24K 순금 돌반지와 순금 뱅글 팔찌 컬렉션',
    targetCategory: '순금',
    ctaLabel: '순금 · 돌반지 보기',
  },
  {
    id: 'slide-ring-necklace',
    eyebrow: 'RING & NECKLACE COLLECTION',
    title: '손끝과 목선을 채우는\n18K 다이아 · 진주 컬렉션',
    subtitle: '커플링 맞춤 각인부터 데일리 솔리테어 레이어드까지',
    imageUrl: heroRingNecklaceImg,
    imageAlt: '18K 솔리테어 다이아 반지와 진주 체인 목걸이',
    targetCategory: '반지',
    ctaLabel: '반지 · 목걸이 보기',
  },
  {
    id: 'slide-gift-curation',
    eyebrow: 'SIGNATURE GIFT CURATION',
    title: '소중한 기념일을 위한\n시그니처 주얼리 기프트',
    subtitle: '스웨이드 리본 박스와 메시지 카드 당일 포장 서비스',
    imageUrl: heroGiftCurationImg,
    imageAlt: '샴페인 실크 리본으로 포장된 쥬얼리아 시그니처 주얼리 선물 박스',
    targetCategory: '선물추천',
    ctaLabel: '선물 추천 보기',
  },
];

export const ITEM_IMAGE_MAP: Record<NonNullable<JewelryMenuItem['imageKey']>, string> = {
  ring: itemSignatureRingImg,
  necklace: itemPearlNecklaceImg,
  earrings: itemSculpturalEarringsImg,
  couple: itemCoupleBandImg,
  pureGold: heroPureGoldImg,
  dolbanji: heroPureGoldImg,
  giftBox: heroGiftCurationImg,
};

export const DEFAULT_WEEKLY_HOURS: DayHours[] = [
  { dayIndex: 0, dayLabel: '일', open: '00:00', close: '00:00', isClosed: true, note: '매주 일요일' },
  { dayIndex: 1, dayLabel: '월', open: '11:00', close: '20:00', isClosed: false },
  { dayIndex: 2, dayLabel: '화', open: '00:00', close: '00:00', isClosed: true, note: '매주 화요일' },
  { dayIndex: 3, dayLabel: '수', open: '15:00', close: '20:00', isClosed: false, note: '오후 3시 오픈' },
  { dayIndex: 4, dayLabel: '목', open: '00:00', close: '00:00', isClosed: true, note: '매주 목요일' },
  { dayIndex: 5, dayLabel: '금', open: '11:00', close: '20:00', isClosed: false },
  { dayIndex: 6, dayLabel: '토', open: '11:00', close: '20:00', isClosed: false },
];

export const DEFAULT_MENU_ITEMS: JewelryMenuItem[] = [
  {
    id: 'pick-solitaire-ring',
    name: '루체 18K 솔리테어 다이아 링',
    englishName: 'Luce 18K Solitaire Ring',
    category: '반지',
    material: '18K 샴페인 골드 · 랩그로운 다이아몬드 0.3ct (E/VVS2)',
    priceKrw: 890000,
    leadTime: '맞춤 제작 10일 / 매장 시착 가능',
    description:
      '부드러운 6프롱 세팅으로 빛의 투과율을 극대화한 시그니처 솔리테어 링입니다. 단독 착용은 물론 가드링과의 레이어드에도 매끄럽게 어우러집니다.',
    isTodayPick: true,
    isGiftRecommended: true,
    todayPickTag: '오늘의 시그니처 1위',
    todayPickNote: '자연광 아래에서 가장 맑은 광채가 돋보이는 데일리·프로포즈 겸용 베스트셀러입니다.',
    imageKey: 'ring',
  },
  {
    id: 'pick-pearl-necklace',
    name: '아코야 담수진주 베젤 네크리스',
    englishName: 'Freshwater Pearl Bezel Necklace',
    category: '목걸이',
    material: '14K 옐로우 골드 · 천연 담수 진주 8.5mm',
    priceKrw: 340000,
    leadTime: '당일 수령 가능 (42cm / 45cm 체인 조절)',
    description:
      '은은한 핑크빛 오리엔트 광택을 지닌 천연 진주를 얇은 골드 베젤로 감싸 목선 위에 단정하게 안착되는 네크리스입니다.',
    isTodayPick: true,
    isGiftRecommended: true,
    todayPickTag: '선물 추천 베스트',
    todayPickNote: '니트나 셔츠 칼라 위로 자연스럽게 포인트가 되어 기념일 선물 문의가 가장 많습니다.',
    imageKey: 'necklace',
  },
  {
    id: 'pick-pure-gold-bracelet',
    name: '24K 순금 해머드 뱅글 브레이슬릿 (5돈)',
    englishName: '24K Pure Gold Hammered Bangle',
    category: '순금',
    material: '24K 순금 99.9% (18.75g / 5돈) · 태극마크 감정 보증',
    priceKrw: 2850000,
    leadTime: '당일 시세 확인 후 수령 / 주문제작 5일',
    description:
      '손망치 질감으로 은은한 빛을 머금은 24K 순금 뱅글 팔찌입니다. 착용감과 자산 가치를 동시에 만족시키는 데일리 순금 라인입니다.',
    isTodayPick: true,
    todayPickTag: '순금 컬렉션 인기',
    todayPickNote: '오늘의 금 시세에 맞춘 합리적인 공임과 정품 보증서 발급으로 믿고 구매하실 수 있습니다.',
    imageKey: 'pureGold',
  },
  {
    id: 'pick-couple-bands',
    name: '세렌 베벨드 커플링 (1쌍)',
    englishName: 'Serene Beveled Couple Bands',
    category: '반지',
    material: '14K / 18K 샴페인·로즈·화이트 골드 선택 · 내부 각인 포함',
    priceKrw: 780000,
    leadTime: '주문 제작 14일 (무료 레이저 각인)',
    description:
      '가장자리를 정교하게 커팅한 베벨 엣지와 안쪽 컴포트 핏 설계로 장시간 착용에도 편안한 쥬얼리아 대표 커플링입니다.',
    isTodayPick: true,
    todayPickTag: '커플 상담 인기',
    todayPickNote: '3mm / 4mm 폭 선택과 무광·유광 믹스 커스텀이 매장에서 바로 가능합니다.',
    imageKey: 'couple',
  },
  {
    id: 'menu-dolbanji-1don',
    name: '복(福) 수복 순금 아기 돌반지 (1돈 / 반돈)',
    englishName: '24K Baby Milestone Ring (3.75g)',
    category: '돌반지',
    material: '24K 순금 99.9% (3.75g / 1.875g 선택) · 보자기 선물 포장',
    priceKrw: 565000,
    leadTime: '당일 매장 수령 및 이름 각인 가능',
    description:
      '아이의 첫 생일을 축복하는 전통 수복(壽福) 문양과 깔끔한 민자 디자인의 24K 순금 돌반지입니다. 고급 한지 케이스와 보자기 포장이 기본 제공됩니다.',
    isTodayPick: false,
    isGiftRecommended: true,
    imageKey: 'dolbanji',
  },
  {
    id: 'menu-dolbanji-bracelet',
    name: '24K 순금 띠별 참 아기 돌팔찌 (2돈)',
    englishName: '24K Baby Zodiac Gold Bracelet',
    category: '돌반지',
    material: '24K 순금 99.9% (7.5g / 2돈) · 잠금 안전줄 포함',
    priceKrw: 1120000,
    leadTime: '당일 수령 / 맞춤 각인 2일',
    description:
      '아기 손목에 맞춰 조절 가능한 스틱형·밴드형 순금 돌팔찌에 아기 띠 코인 참을 더해 백일·돌 선물로 인기가 높습니다.',
    isTodayPick: false,
    isGiftRecommended: true,
    imageKey: 'pureGold',
  },
  {
    id: 'menu-pure-gold-bar-necklace',
    name: '24K 순금 오벌 코인 펜던트 (3돈)',
    englishName: '24K Pure Gold Oval Coin Pendant',
    category: '순금',
    material: '24K 순금 99.9% (11.25g) · 18K 보조 체인 매칭 가능',
    priceKrw: 1690000,
    leadTime: '당일 시세 적용 · 매장 시착 가능',
    description:
      '현대적인 무광 코인 쉐입으로 캐주얼한 의상에도 세련되게 어우러지는 24K 순금 목걸이 펜던트입니다.',
    isTodayPick: false,
    imageKey: 'pureGold',
  },
  {
    id: 'menu-pure-gold-lucky-ring',
    name: '24K 순금 행운의 매듭 평반지 (2돈)',
    englishName: '24K Pure Gold Knot Band Ring',
    category: '순금',
    material: '24K 순금 99.9% (7.5g / 2돈)',
    priceKrw: 1140000,
    leadTime: '당일 수령 가능 (호수별 상시 구비)',
    description:
      '모던한 매듭 포인트가 들어간 순금 평반지로 부모님 효도 선물과 본인 소장용으로 꾸준히 사랑받는 디자인입니다.',
    isTodayPick: false,
    isGiftRecommended: true,
    imageKey: 'dolbanji',
  },
  {
    id: 'menu-guard-ring',
    name: '하프 이터니티 14K 가드링',
    englishName: 'Half Eternity Guard Ring',
    category: '반지',
    material: '14K 골드 · 멜리 다이아몬드 15석',
    priceKrw: 310000,
    leadTime: '5~7일 소요',
    description: '메인 링과 함께 레이어드하거나 단독으로 착용하기 좋은 얇은 하프 이터니티 반지입니다.',
    isTodayPick: false,
    imageKey: 'ring',
  },
  {
    id: 'menu-birthstone-necklace',
    name: '탄생석 미니멀 펜던트 목걸이',
    englishName: 'Birthstone Minimal Pendant',
    category: '목걸이',
    material: '14K 골드 · 천연 유색 보석 12종 선택',
    priceKrw: 245000,
    leadTime: '3~5일 소요',
    description: '원하는 월의 천연 탄생석을 선택해 세팅하는 가벼운 데일리 펜던트입니다.',
    isTodayPick: false,
    isGiftRecommended: true,
    imageKey: 'necklace',
  },
  {
    id: 'menu-diamond-drop-necklace',
    name: '18K 일리제 다이아 1부 데일리 목걸이',
    englishName: '18K Ilise 0.1ct Diamond Necklace',
    category: '목걸이',
    material: '18K 로즈/옐로우 골드 · 천연 다이아몬드 0.1ct',
    priceKrw: 490000,
    leadTime: '당일 수령 가능',
    description: '쇄골 라인에 맑게 맺히는 1부 다이아몬드 솔리테어 목걸이로 첫 파인 주얼리 선물로 손색없습니다.',
    isTodayPick: false,
    isGiftRecommended: true,
    imageKey: 'giftBox',
  },
  {
    id: 'menu-gift-signature-set',
    name: '쥬얼리아 시그니처 기프트 박스 세트',
    englishName: 'Signature Gift Box Duo Set',
    category: '선물추천',
    material: '14K 솔리테어 펜던트 + 스터드 이어링 · 스웨이드 리본 패키지',
    priceKrw: 460000,
    leadTime: '당일 포장 및 메시지 카드 동봉 가능',
    description:
      '기념일, 생일, 졸업 선물로 가장 추천하는 쥬얼리아의 목걸이·귀걸이 기프트 세트입니다. 샴페인 실크 리본 박스로 정성껏 포장해 드립니다.',
    isTodayPick: false,
    isGiftRecommended: true,
    imageKey: 'giftBox',
  },
  {
    id: 'menu-sculptural-earrings',
    name: '오브제 새틴 드롭 이어링 (선물 인기)',
    englishName: 'Objet Satin Drop Earrings',
    category: '선물추천',
    material: '14K 무광 브러시드 골드 · 멜리 다이아몬드 파베',
    priceKrw: 420000,
    leadTime: '당일 시착 및 선물 포장 가능',
    description:
      '수작업 헤어라인 새틴 마감 위로 섬세한 멜리 파베 세팅을 더해 얼굴선을 따라 우아한 입체감을 선사하는 드롭 이어링입니다.',
    isTodayPick: false,
    isGiftRecommended: true,
    imageKey: 'earrings',
  },
];

export const DEFAULT_VISITOR_REVIEWS: VisitorReview[] = [
  {
    id: 'naver-rev-merini',
    authorName: '메리니',
    rating: 5,
    visitPurpose: '네이버 블로그 리뷰',
    purchasedItem: '골드바 1돈 (온누리 상품권 QR 결제)',
    content:
      '답프로포즈 겸 남자친구 생일선물로 골드바를 알아보던 중, 온누리 상품권도 QR 결제로 사용할 수 있는 주얼리아에서 시세에 맞춰 1돈 알차게 구매했어요.',
    createdAt: '2026-02-13',
    verifiedVisit: true,
  },
  {
    id: 'rev-1',
    authorName: '박지현',
    rating: 5,
    visitPurpose: '기념일 선물',
    purchasedItem: '아코야 담수진주 베젤 네크리스',
    content:
      '월평동 근처 조용한 주얼리 샵을 찾다가 예약하고 방문했어요. 조명 아래서 피부톤에 맞는 골드 컬러를 세심하게 비교해 주셔서 만족스럽게 구매했습니다.',
    createdAt: '2026-11-08',
    verifiedVisit: true,
  },
  {
    id: 'rev-2',
    authorName: '이준호 · 최유진',
    rating: 5,
    visitPurpose: '커플링 맞춤 상담',
    purchasedItem: '세렌 베벨드 커플링 (1쌍)',
    content:
      '착용감이 정말 편하고 무광 텍스처가 과하지 않아서 좋았습니다. 주차나 대중교통 위치 설명도 친절해서 처음 찾아가기 쉬웠어요.',
    createdAt: '2026-10-29',
    verifiedVisit: true,
  },
  {
    id: 'rev-3',
    authorName: '정민아',
    rating: 5,
    visitPurpose: '주얼리 수선 · 케어',
    purchasedItem: '반지 호수 수선 · 체인 끊어짐 리페어',
    content:
      '오래된 14K 목걸이 체인이 끊어져서 수선 맡겼는데 레이저 용접 티가 거의 나지 않고 새것처럼 세척까지 해주셔서 감사했습니다.',
    createdAt: '2026-10-17',
    verifiedVisit: true,
  },
  {
    id: 'naver-rev-bokttaeng46',
    authorName: '복땡이46',
    rating: 5,
    visitPurpose: '네이버 영수증 리뷰',
    purchasedItem: '14K 귀걸이 · 금목걸이 · 팔찌',
    content:
      '월평동 다모아 상가내 주얼리아에서 14k귀걸이 샀어요~ 금목걸이 팔찌 이쁜 디자인이 많아요~^^',
    createdAt: '2025-09-17',
    verifiedVisit: true,
  },
  {
    id: 'naver-rev-bomnalcake',
    authorName: '봄날케이크',
    rating: 5,
    visitPurpose: '네이버 영수증 리뷰',
    purchasedItem: '신상 목걸이',
    content:
      '구식 목걸이를 새롭게 기분전환하려고 다녀왔어요 예쁜 신제품 모델이 많아요 매주 서울 종로가서 신상모델을 구해온답니다 다모아 상가 가까이 사신다면 한번 다녀오세요',
    createdAt: '2025-08-11',
    verifiedVisit: true,
  },
];

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
