import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import type {
  ChatMessage,
  ClientWsEvent,
  DayHours,
  JewelryMenuItem,
  Reservation,
  ResolvedGooglePlaceInfo,
  ServerWsEvent,
  VisitorReview,
} from './src/shared/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const SHOP_ADDRESS = '대전 서구 월평동로 83 다모아아파트상가 101호';
const SHOP_LAT = 36.3626833;
const SHOP_LNG = 127.3675956;
const NAVER_PLACE_URL =
  'https://map.naver.com/p/entry/place/1009953930?placePath=%2Fhome%3Fentry%3Dplt%26from%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202611152137%26locale%3Dko%26svcName%3Dmap_pcv5&searchType=place&lng=127.3675956&lat=36.3626833&c=15.00,0,0,0,dh';

const WEEKLY_HOURS: DayHours[] = [
  { dayIndex: 0, dayLabel: '일', open: '00:00', close: '00:00', isClosed: true, note: '매주 일요일' },
  { dayIndex: 1, dayLabel: '월', open: '11:00', close: '20:00', isClosed: false },
  { dayIndex: 2, dayLabel: '화', open: '00:00', close: '00:00', isClosed: true, note: '매주 화요일' },
  { dayIndex: 3, dayLabel: '수', open: '15:00', close: '20:00', isClosed: false, note: '오후 3시 오픈' },
  { dayIndex: 4, dayLabel: '목', open: '00:00', close: '00:00', isClosed: true, note: '매주 목요일' },
  { dayIndex: 5, dayLabel: '금', open: '11:00', close: '20:00', isClosed: false },
  { dayIndex: 6, dayLabel: '토', open: '11:00', close: '20:00', isClosed: false },
];

const MENU_ITEMS: JewelryMenuItem[] = [
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
  {
    id: 'menu-care-polishing',
    name: '초음파 세척 · 폴리싱 및 스톤 점검',
    englishName: 'Atelier Care & Polishing',
    category: '수선 · 맞춤 케어',
    material: '14K / 18K / PT950 모든 귀금속',
    priceKrw: 15000,
    leadTime: '현장 20분 이내 완료 (자사 제품 무료)',
    description: '미세 스크래치 복원, 프롱(난발) 유격 점검, 고온 스팀·초음파 세척을 진행합니다.',
    isTodayPick: false,
  },
  {
    id: 'menu-care-resize',
    name: '반지 호수 수선 · 체인 끊어짐 리페어',
    englishName: 'Ring Resizing & Solder Repair',
    category: '수선 · 맞춤 케어',
    material: '레이저 용접 · 재도금 옵션 가능',
    priceKrw: 35000,
    leadTime: '당일 ~ 3일 소요 (상태 확인 후 안내)',
    description: '반지 사이즈 늘림/줄임, 끊어진 목걸이·팔찌 체인 레이저 접합 및 잠금장식 교체를 도와드립니다.',
    isTodayPick: false,
  },
];

interface PersistedStore {
  messages: ChatMessage[];
  reservations: Reservation[];
  reviews: VisitorReview[];
}

const DATA_DIR = path.join(__dirname, '.data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function persistReviewPhotos(photos: unknown): string[] {
  if (!Array.isArray(photos) || photos.length === 0) return [];
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const savedUrls: string[] = [];
  for (const raw of photos.slice(0, 3)) {
    if (typeof raw !== 'string') continue;
    const match = raw.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) continue;
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) continue;

    const filename = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
    savedUrls.push(`/uploads/${filename}`);
  }
  return savedUrls;
}

const NAVER_VISITOR_REVIEWS: VisitorReview[] = [
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
];

function loadInitialStore(): PersistedStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedStore;
      if (Array.isArray(parsed.messages) && Array.isArray(parsed.reservations) && Array.isArray(parsed.reviews)) {
        const existingIds = new Set(parsed.reviews.map((r) => r.id));
        for (const naverRev of NAVER_VISITOR_REVIEWS) {
          if (!existingIds.has(naverRev.id)) {
            parsed.reviews.push(naverRev);
          }
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read store.json, using initial seed:', err);
  }

  return {
    messages: [
      {
        id: 'msg-welcome-1',
        roomId: 'jewelryia-concierge',
        senderRole: 'staff',
        senderName: '쥬얼리아 컨시어지',
        text: '안녕하세요, 쥬얼리아입니다. 방문 예약이나 원하시는 주얼리 모델·사이즈·수선 문의사항을 남겨주시면 실시간으로 확인 후 안내해 드립니다.',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
    ],
    reservations: [
      {
        id: 'res-seed-1',
        customerName: '김서연',
        phone: '010-****-4821',
        visitDate: new Date().toISOString().slice(0, 10),
        visitTime: '15:00',
        purpose: '커플링 맞춤 상담',
        itemInterest: '세렌 베벨드 커플링 (1쌍)',
        notes: '3mm 무광 샴페인 골드 시착 희망',
        status: '예약 확정',
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
    ],
    reviews: [
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
      ...NAVER_VISITOR_REVIEWS,
    ],
  };
}

const store: PersistedStore = loadInitialStore();

function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store.json:', err);
  }
}

let cachedPlaceInfo: { data: ResolvedGooglePlaceInfo; expiresAt: number } | null = null;

async function resolveGooglePlaceData(): Promise<ResolvedGooglePlaceInfo> {
  if (cachedPlaceInfo && Date.now() < cachedPlaceInfo.expiresAt) {
    return cachedPlaceInfo.data;
  }

  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  const result: ResolvedGooglePlaceInfo = {
    formattedAddress: null,
    shortAddress: null,
    matchedPlaceName: null,
    matchedPlaceId: null,
    rating: null,
    userRatingCount: null,
    weekdayDescriptions: null,
    openNow: null,
    googleMapsUri: null,
    googleReviews: [],
  };

  if (!apiKey) {
    result.error = 'Google Maps API 키가 설정되지 않았습니다.';
    return result;
  }

  try {
    // 1. Reverse Geocode exact coordinates (36.3626833, 127.3675956) via server-side Geocoding API
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${SHOP_LAT},${SHOP_LNG}&language=ko&key=${encodeURIComponent(apiKey)}`;
    const geoRes = await fetch(geoUrl);
    if (geoRes.status === 429) {
      result.quotaExceeded = true;
      return result;
    }
    if (geoRes.ok) {
      const geoJson = (await geoRes.json()) as {
        status?: string;
        results?: Array<{ formatted_address?: string; address_components?: Array<{ long_name: string; types: string[] }> }>;
      };
      if (geoJson.status === 'OVER_QUERY_LIMIT') {
        result.quotaExceeded = true;
        return result;
      }
      const primary = geoJson.results?.[0];
      if (primary?.formatted_address) {
        result.formattedAddress = primary.formatted_address;
        result.shortAddress = primary.formatted_address.replace(/^대한민국\s*/, '');
      }
    }

    // 2. Query Places API (New) searchText for "쥬얼리아" biased to exact coordinates
    const placesRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.regularOpeningHours,places.googleMapsUri,places.reviews,places.location',
      },
      body: JSON.stringify({
        textQuery: '쥬얼리아',
        languageCode: 'ko',
        regionCode: 'KR',
        locationBias: {
          circle: {
            center: { latitude: SHOP_LAT, longitude: SHOP_LNG },
            radius: 500.0,
          },
        },
        maxResultCount: 3,
      }),
    });

    if (placesRes.status === 429) {
      result.quotaExceeded = true;
      return result;
    }

    if (placesRes.ok) {
      const placesJson = (await placesRes.json()) as {
        places?: Array<{
          id?: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          rating?: number;
          userRatingCount?: number;
          regularOpeningHours?: {
            openNow?: boolean;
            weekdayDescriptions?: string[];
          };
          googleMapsUri?: string;
          location?: { latitude?: number; longitude?: number };
          reviews?: Array<{
            authorAttribution?: { displayName?: string };
            rating?: number;
            text?: { text?: string };
            relativePublishTimeDescription?: string;
          }>;
        }>;
      };

      const matched = placesJson.places?.find((p) => {
        const lat = p.location?.latitude;
        const lng = p.location?.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number') return false;
        const distApprox = Math.hypot(lat - SHOP_LAT, lng - SHOP_LNG);
        return distApprox < 0.005 || (p.displayName?.text?.includes('쥬얼리아') ?? false);
      });

      if (matched) {
        result.matchedPlaceName = matched.displayName?.text ?? null;
        result.matchedPlaceId = matched.id ?? null;
        if (matched.formattedAddress) {
          result.formattedAddress = matched.formattedAddress;
          result.shortAddress = matched.formattedAddress.replace(/^대한민국\s*/, '');
        }
        result.rating = typeof matched.rating === 'number' ? matched.rating : null;
        result.userRatingCount = typeof matched.userRatingCount === 'number' ? matched.userRatingCount : null;
        result.weekdayDescriptions = matched.regularOpeningHours?.weekdayDescriptions ?? null;
        result.openNow =
          typeof matched.regularOpeningHours?.openNow === 'boolean'
            ? matched.regularOpeningHours.openNow
            : null;
        result.googleMapsUri = matched.googleMapsUri ?? null;
        result.googleReviews = (matched.reviews ?? []).slice(0, 5).map((r) => ({
          authorName: r.authorAttribution?.displayName ?? '방문자',
          rating: r.rating ?? 5,
          text: r.text?.text ?? '',
          relativePublishTimeDescription: r.relativePublishTimeDescription ?? '',
        }));
      }
    }

    cachedPlaceInfo = {
      data: result,
      expiresAt: Date.now() + 1000 * 60 * 15,
    };
  } catch (err) {
    console.error('Error resolving Google Place data:', err);
    result.error = '위치 정보를 불러오는 중 오류가 발생했습니다.';
  }

  return result;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const broadcast = (event: ServerWsEvent) => {
    const payload = JSON.stringify(event);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  wss.on('connection', (ws) => {
    const activeUsers = wss.clients.size;
    const initEvent: ServerWsEvent = {
      type: 'init',
      messages: store.messages.slice(-80),
      reservations: store.reservations.slice(-30),
      activeUsers,
      serverTime: new Date().toISOString(),
    };
    ws.send(JSON.stringify(initEvent));
    broadcast({ type: 'presence:update', activeUsers });

    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as ClientWsEvent;

        if (parsed.type === 'sync:request') {
          ws.send(
            JSON.stringify({
              type: 'init',
              messages: store.messages.slice(-80),
              reservations: store.reservations.slice(-30),
              activeUsers: wss.clients.size,
              serverTime: new Date().toISOString(),
            } satisfies ServerWsEvent)
          );
          return;
        }

        if (parsed.type === 'chat:send') {
          const { id, senderRole, senderName, text, attachedItemName, attachedItemPrice } = parsed.payload;
          const cleanText = text?.trim();
          if (!cleanText || !id) return;

          // Idempotency guard against duplicate message IDs
          if (store.messages.some((m) => m.id === id)) {
            return;
          }

          const message: ChatMessage = {
            id,
            roomId: 'jewelryia-concierge',
            senderRole: senderRole === 'staff' ? 'staff' : 'customer',
            senderName: (senderName || (senderRole === 'staff' ? '쥬얼리아 컨시어지' : '방문 고객')).slice(0, 40),
            text: cleanText.slice(0, 1000),
            attachedItemName: attachedItemName?.slice(0, 120),
            attachedItemPrice: typeof attachedItemPrice === 'number' ? attachedItemPrice : undefined,
            createdAt: new Date().toISOString(),
          };

          store.messages.push(message);
          if (store.messages.length > 200) {
            store.messages = store.messages.slice(-200);
          }
          saveStore();
          broadcast({ type: 'chat:message', message });
          return;
        }

        if (parsed.type === 'reservation:create') {
          const { clientRequestId, customerName, phone, visitDate, visitTime, purpose, itemInterest, notes } =
            parsed.payload;
          if (!customerName?.trim() || !phone?.trim() || !visitDate || !visitTime) return;

          const existing = store.reservations.find((r) => r.id === `res-${clientRequestId}`);
          if (existing) return;

          const reservation: Reservation = {
            id: `res-${clientRequestId}`,
            customerName: customerName.trim().slice(0, 40),
            phone: phone.trim().slice(0, 30),
            visitDate,
            visitTime,
            purpose: purpose.trim().slice(0, 60),
            itemInterest: itemInterest?.trim().slice(0, 120),
            notes: notes?.trim().slice(0, 300),
            status: '접수됨',
            createdAt: new Date().toISOString(),
          };

          const message: ChatMessage = {
            id: `msg-${clientRequestId}`,
            roomId: 'jewelryia-concierge',
            senderRole: 'customer',
            senderName: reservation.customerName,
            text: `[방문 예약 요청] ${reservation.visitDate} ${reservation.visitTime} · ${reservation.purpose}${
              reservation.itemInterest ? ` (관심 품목: ${reservation.itemInterest})` : ''
            }${reservation.notes ? ` — ${reservation.notes}` : ''}`,
            reservationId: reservation.id,
            createdAt: reservation.createdAt,
          };

          store.reservations.push(reservation);
          store.messages.push(message);
          saveStore();
          broadcast({ type: 'reservation:created', reservation, message });
          return;
        }

        if (parsed.type === 'reservation:updateStatus') {
          const { id, status } = parsed.payload;
          const target = store.reservations.find((r) => r.id === id);
          if (!target) return;
          if (status !== '접수됨' && status !== '예약 확정' && status !== '방문 완료') return;

          target.status = status;
          saveStore();
          broadcast({ type: 'reservation:updated', reservation: target });

          const noticeMessage: ChatMessage = {
            id: `msg-status-${id}-${Date.now()}`,
            roomId: 'jewelryia-concierge',
            senderRole: 'staff',
            senderName: '쥬얼리아 컨시어지',
            text: `${target.customerName}님의 ${target.visitDate} ${target.visitTime} 방문 예약 상태가 '${status}'(으)로 업데이트되었습니다.`,
            reservationId: target.id,
            createdAt: new Date().toISOString(),
          };
          store.messages.push(noticeMessage);
          saveStore();
          broadcast({ type: 'chat:message', message: noticeMessage });
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      broadcast({ type: 'presence:update', activeUsers: wss.clients.size });
    });
  });

  // Public runtime Maps config (returns client-side API key)
  app.get('/api/maps-config', (_req, res) => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({
      apiKey,
      shop: {
        name: '쥬얼리아',
        address: SHOP_ADDRESS,
        lat: SHOP_LAT,
        lng: SHOP_LNG,
        naverPlaceUrl: NAVER_PLACE_URL,
      },
    });
  });

  // Server-side Google Geocoding & Places resolution for the shop coordinates
  app.get('/api/place-resolve', async (_req, res) => {
    const data = await resolveGooglePlaceData();
    res.json(data);
  });

  // Fallback road & pedestrian routing for regions (e.g. KR) where Google Routes API DRIVING/WALKING returns ZERO_RESULTS
  app.get('/api/directions-fallback', async (req, res) => {
    const originLat = Number(req.query.originLat);
    const originLng = Number(req.query.originLng);
    const destLat = Number(req.query.destLat);
    const destLng = Number(req.query.destLng);
    const mode = req.query.mode === 'WALKING' ? 'WALKING' : 'DRIVING';

    if (
      !Number.isFinite(originLat) ||
      !Number.isFinite(originLng) ||
      !Number.isFinite(destLat) ||
      !Number.isFinite(destLng)
    ) {
      res.status(400).json({ error: '출발지 및 도착지 좌표가 올바르지 않습니다.' });
      return;
    }

    const coordPair = `${originLng},${originLat};${destLng},${destLat}`;
    const queryParams = 'overview=full&geometries=geojson&steps=true';
    const candidateUrls =
      mode === 'WALKING'
        ? [
            `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordPair}?${queryParams}`,
            `https://router.project-osrm.org/route/v1/driving/${coordPair}?${queryParams}`,
          ]
        : [
            `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordPair}?${queryParams}`,
            `https://router.project-osrm.org/route/v1/driving/${coordPair}?${queryParams}`,
          ];

    const modifierToKorean = (modifier?: string): string => {
      switch (modifier) {
        case 'left':
          return '좌회전';
        case 'sharp left':
          return '급좌회전';
        case 'slight left':
          return '왼쪽 방향';
        case 'right':
          return '우회전';
        case 'sharp right':
          return '급우회전';
        case 'slight right':
          return '오른쪽 방향';
        case 'uturn':
          return '유턴';
        case 'straight':
        default:
          return '직진';
      }
    };

    const formatStepInstruction = (step: {
      name?: string;
      maneuver?: { type?: string; modifier?: string };
    }): string => {
      const roadName = step.name?.trim();
      const type = step.maneuver?.type ?? '';
      const modText = modifierToKorean(step.maneuver?.modifier);

      if (type === 'arrive') {
        return roadName ? `${roadName} 부근 목적지 도착` : '쥬얼리아 목적지 도착';
      }
      if (type === 'depart') {
        return roadName ? `${roadName} 방면으로 출발` : `출발지 이동 (${modText})`;
      }
      if (type === 'roundabout' || type === 'rotary') {
        return roadName ? `${roadName} 방면 회전교차로 진입` : '회전교차로 진출';
      }
      if (roadName) {
        return `${roadName} 방면 ${modText}`;
      }
      return modText;
    };

    const formatDistance = (meters: number): string => {
      if (!Number.isFinite(meters) || meters <= 0) return '';
      if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
      return `${Math.round(meters)} m`;
    };

    for (let idx = 0; idx < candidateUrls.length; idx += 1) {
      const url = candidateUrls[idx];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const upstream = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'JewelryiaVisitGuide/1.0' },
        });
        clearTimeout(timeoutId);

        if (!upstream.ok) continue;
        const json = (await upstream.json()) as {
          code?: string;
          routes?: Array<{
            distance?: number;
            duration?: number;
            geometry?: { coordinates?: Array<[number, number]> };
            legs?: Array<{
              steps?: Array<{
                name?: string;
                distance?: number;
                maneuver?: { type?: string; modifier?: string };
              }>;
            }>;
          }>;
        };

        const route = json.routes?.[0];
        const coords = route?.geometry?.coordinates;
        if (json.code !== 'Ok' || !route || !Array.isArray(coords) || coords.length === 0) {
          continue;
        }

        const distanceMeters = Math.round(route.distance ?? 0);
        // If walking fell back to general OSRM driving server (idx === 1), compute realistic pedestrian duration (~4.5 km/h = 1.25 m/s)
        const durationSeconds =
          mode === 'WALKING' && idx === 1
            ? Math.max(60, Math.round(distanceMeters / 1.25))
            : Math.max(60, Math.round((route.duration ?? 0) * (mode === 'DRIVING' ? 1.25 : 1)));

        const pathCoords = coords.map(([lng, lat]) => ({ lat, lng }));
        const rawSteps = route.legs?.[0]?.steps ?? [];
        const steps = rawSteps.slice(0, 10).map((s) => ({
          instruction: formatStepInstruction(s),
          distanceText: formatDistance(s.distance ?? 0),
        }));

        res.json({
          path: pathCoords,
          distanceMeters,
          durationMillis: durationSeconds * 1000,
          steps,
        });
        return;
      } catch (err) {
        console.warn('Fallback routing attempt failed:', url, err);
      }
    }

    res.status(502).json({ error: '경로 서버 응답을 불러오지 못했습니다.' });
  });

  // Shop catalog, hours, and Naver Place metadata
  app.get('/api/shop', (_req, res) => {
    res.json({
      name: '쥬얼리아',
      englishName: 'JEWELRYIA',
      address: SHOP_ADDRESS,
      coordinates: { lat: SHOP_LAT, lng: SHOP_LNG },
      naverPlaceUrl: NAVER_PLACE_URL,
      hours: WEEKLY_HOURS,
      menu: MENU_ITEMS,
    });
  });

  // Reviews CRUD
  app.get('/api/reviews', (_req, res) => {
    res.json({ reviews: [...store.reviews].reverse() });
  });

  app.post('/api/reviews', (req, res) => {
    const { authorName, rating, visitPurpose, purchasedItem, content, photos } = req.body as Partial<VisitorReview>;
    if (!authorName?.trim() || !content?.trim()) {
      res.status(400).json({ error: '작성자 이름과 리뷰 내용을 입력해 주세요.' });
      return;
    }
    const clampedRating = Math.min(5, Math.max(1, Number(rating) || 5));
    const savedPhotos = persistReviewPhotos(photos);

    const review: VisitorReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorName: authorName.trim().slice(0, 30),
      rating: clampedRating,
      visitPurpose: (visitPurpose || '매장 방문').trim().slice(0, 40),
      purchasedItem: purchasedItem?.trim().slice(0, 80) || undefined,
      content: content.trim().slice(0, 600),
      photos: savedPhotos.length > 0 ? savedPhotos : undefined,
      createdAt: new Date().toISOString().slice(0, 10),
      verifiedVisit: false,
    };

    store.reviews.push(review);
    saveStore();
    res.status(201).json({ review });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Jewelryia server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
