export type QuickMenuCategory =
  | '오늘의추천'
  | '순금'
  | '반지'
  | '돌반지'
  | '목걸이'
  | '선물추천';

export type MenuCategory =
  | '전체'
  | QuickMenuCategory
  | '수선 · 맞춤 케어';

export interface JewelryMenuItem {
  id: string;
  name: string;
  englishName: string;
  category: '순금' | '반지' | '돌반지' | '목걸이' | '선물추천' | '수선 · 맞춤 케어';
  material: string;
  priceKrw: number;
  leadTime: string;
  description: string;
  isTodayPick: boolean;
  isGiftRecommended?: boolean;
  todayPickTag?: string;
  todayPickNote?: string;
  imageKey?:
    | 'ring'
    | 'necklace'
    | 'earrings'
    | 'couple'
    | 'pureGold'
    | 'dolbanji'
    | 'giftBox';
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderRole: 'customer' | 'staff';
  senderName: string;
  text: string;
  attachedItemName?: string;
  attachedItemPrice?: number;
  reservationId?: string;
  createdAt: string;
}

export type ReservationStatus = '접수됨' | '예약 확정' | '방문 완료';

export interface Reservation {
  id: string;
  customerName: string;
  phone: string;
  visitDate: string;
  visitTime: string;
  purpose: string;
  itemInterest?: string;
  notes?: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface VisitorReview {
  id: string;
  authorName: string;
  rating: number;
  visitPurpose: string;
  purchasedItem?: string;
  content: string;
  photos?: string[];
  createdAt: string;
  verifiedVisit: boolean;
}

export interface DayHours {
  dayIndex: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  dayLabel: string;
  open: string; // "11:00"
  close: string; // "20:00"
  breakTime?: string;
  isClosed: boolean;
  note?: string;
}

export interface ResolvedGooglePlaceInfo {
  formattedAddress: string | null;
  shortAddress: string | null;
  matchedPlaceName: string | null;
  matchedPlaceId: string | null;
  rating: number | null;
  userRatingCount: number | null;
  weekdayDescriptions: string[] | null;
  openNow: boolean | null;
  googleMapsUri: string | null;
  googleReviews: Array<{
    authorName: string;
    rating: number;
    text: string;
    relativePublishTimeDescription: string;
  }>;
  quotaExceeded?: boolean;
  error?: string;
}

export type ServerWsEvent =
  | {
      type: 'init';
      messages: ChatMessage[];
      reservations: Reservation[];
      activeUsers: number;
      serverTime: string;
    }
  | { type: 'chat:message'; message: ChatMessage }
  | { type: 'reservation:created'; reservation: Reservation; message: ChatMessage }
  | { type: 'reservation:updated'; reservation: Reservation }
  | { type: 'presence:update'; activeUsers: number };

export type ClientWsEvent =
  | {
      type: 'chat:send';
      payload: {
        id: string;
        senderRole: 'customer' | 'staff';
        senderName: string;
        text: string;
        attachedItemName?: string;
        attachedItemPrice?: number;
      };
    }
  | {
      type: 'reservation:create';
      payload: {
        clientRequestId: string;
        customerName: string;
        phone: string;
        visitDate: string;
        visitTime: string;
        purpose: string;
        itemInterest?: string;
        notes?: string;
      };
    }
  | {
      type: 'reservation:updateStatus';
      payload: {
        id: string;
        status: ReservationStatus;
      };
    }
  | { type: 'sync:request' };
