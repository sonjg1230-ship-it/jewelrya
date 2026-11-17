import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';
import type {
  ChatMessage,
  ClientWsEvent,
  DayHours,
  JewelryMenuItem,
  MenuCategory,
  Reservation,
  ReservationStatus,
  ResolvedGooglePlaceInfo,
  ServerWsEvent,
  VisitorReview,
} from './shared/types';
import { getKstBusinessStatus } from './utils/shopAssets';
import { TodayPicksSection } from './components/TodayPicksSection';
import { VisitDirectionsSection } from './components/VisitDirectionsSection';
import { ReviewsSection } from './components/ReviewsSection';
import { LiveConciergeSectionAndDrawer } from './components/LiveConciergeWidget';
import { JewelryaLogo } from './components/JewelryaLogo';

const DEFAULT_COORDS = { lat: 36.3626833, lng: 127.3675956 };
const DEFAULT_SHOP_ADDRESS = '대전 서구 월평동로 83 다모아아파트상가 101호';
const DEFAULT_NAVER_URL =
  'https://map.naver.com/p/entry/place/1009953930?placePath=%2Fhome%3Fentry%3Dplt%26from%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202611152137%26locale%3Dko%26svcName%3Dmap_pcv5&searchType=place&lng=127.3675956&lat=36.3626833&c=15.00,0,0,0,dh';

export default function App() {
  // Demo Key quota exhaustion state (Case A requirement)
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || ''
  );
  const [shopCoords, setShopCoords] = useState<{ lat: number; lng: number }>(DEFAULT_COORDS);
  const [shopAddress, setShopAddress] = useState<string>(DEFAULT_SHOP_ADDRESS);
  const [naverPlaceUrl, setNaverPlaceUrl] = useState<string>(DEFAULT_NAVER_URL);
  const [hours, setHours] = useState<DayHours[]>([]);
  const [menuItems, setMenuItems] = useState<JewelryMenuItem[]>([]);
  const [reviews, setReviews] = useState<VisitorReview[]>([]);
  const [googlePlaceInfo, setGooglePlaceInfo] = useState<ResolvedGooglePlaceInfo | null>(null);

  // Real-time WebSocket state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeUsers, setActiveUsers] = useState<number>(1);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [attachedItem, setAttachedItem] = useState<JewelryMenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('오늘의추천');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Browser Notification API state
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('jewelryia_notifications_enabled') !== 'false';
  });
  const [toastNotice, setToastNotice] = useState<{
    id: string;
    title: string;
    body: string;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const notificationsActiveRef = useRef<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    notificationsActiveRef.current =
      notificationPermission === 'granted' && notificationsEnabled;
  }, [notificationPermission, notificationsEnabled]);

  // Listen to global Google Maps quota events
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // 1-second tick for live KST business hours countdown dashboard
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const triggerReservationNotification = useCallback(
    (title: string, body: string, tag: string) => {
      const toastId = `${tag}-${Date.now()}`;
      setToastNotice({ id: toastId, title, body });
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setToastNotice((prev) => (prev?.id === toastId ? null : prev));
      }, 5000);

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted' &&
        notificationsActiveRef.current
      ) {
        try {
          const notif = new window.Notification(title, { body, tag });
          notif.onclick = () => {
            window.focus();
            setIsDrawerOpen(true);
            notif.close();
          };
        } catch (err) {
          console.error('Failed to display browser notification:', err);
        }
      }
    },
    []
  );

  const handleToggleNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    const current = window.Notification.permission;
    setNotificationPermission(current);

    if (current === 'default') {
      try {
        const result = await window.Notification.requestPermission();
        setNotificationPermission(result);
        if (result === 'granted') {
          setNotificationsEnabled(true);
          window.localStorage.setItem('jewelryia_notifications_enabled', 'true');
          try {
            new window.Notification('쥬얼리아 예약 알림 활성화', {
              body: '새로운 방문 예약 및 예약 상태 변경 시 브라우저 알림을 보내드립니다.',
              tag: 'jewelryia-notif-enabled',
            });
          } catch {
            // Ignore if browser restricts immediate notification
          }
        }
      } catch (err) {
        console.error('Notification permission request failed:', err);
      }
      return;
    }

    if (current === 'granted') {
      setNotificationsEnabled((prev) => {
        const next = !prev;
        window.localStorage.setItem('jewelryia_notifications_enabled', String(next));
        return next;
      });
      return;
    }

    // Permission denied in browser settings
    setToastNotice({
      id: `denied-${Date.now()}`,
      title: '브라우저 알림 권한 차단됨',
      body: '주소창 왼쪽 사이트 설정에서 알림 권한을 허용해 주세요.',
    });
  }, []);

  // Load initial shop data, Maps config, reviews, and Google Place info
  useEffect(() => {
    let active = true;

    fetch('/api/maps-config')
      .then((res) => res.json())
      .then(
        (data: {
          apiKey?: string;
          shop?: { address?: string; lat: number; lng: number; naverPlaceUrl: string };
        }) => {
          if (!active) return;
          if (data.apiKey) setMapsApiKey(data.apiKey);
          if (data.shop) {
            if (data.shop.address) setShopAddress(data.shop.address);
            setShopCoords({ lat: data.shop.lat, lng: data.shop.lng });
            setNaverPlaceUrl(data.shop.naverPlaceUrl);
          }
        }
      )
      .catch((err) => console.error('Failed to load maps config:', err));

    fetch('/api/shop')
      .then((res) => res.json())
      .then((data: { hours: DayHours[]; menu: JewelryMenuItem[] }) => {
        if (!active) return;
        setHours(data.hours ?? []);
        setMenuItems(data.menu ?? []);
      })
      .catch((err) => console.error('Failed to load shop catalog:', err));

    fetch('/api/reviews')
      .then((res) => res.json())
      .then((data: { reviews: VisitorReview[] }) => {
        if (!active) return;
        setReviews(data.reviews ?? []);
      })
      .catch((err) => console.error('Failed to load reviews:', err));

    fetch('/api/place-resolve')
      .then((res) => {
        if (res.status === 429) {
          setQuotaExceeded(true);
        }
        return res.json();
      })
      .then((data: ResolvedGooglePlaceInfo) => {
        if (!active) return;
        if (data.quotaExceeded) {
          setQuotaExceeded(true);
        }
        setGooglePlaceInfo(data);
      })
      .catch((err) => console.error('Failed to resolve place info:', err));

    return () => {
      active = false;
    };
  }, []);

  // WebSocket Connection with Auto-Reconnect & Idempotent Handlers
  useEffect(() => {
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) return;
        setWsConnected(true);
        ws.send(JSON.stringify({ type: 'sync:request' } satisfies ClientWsEvent));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as ServerWsEvent;
          if (data.type === 'init') {
            setMessages(data.messages);
            setReservations(data.reservations);
            setActiveUsers(data.activeUsers);
          } else if (data.type === 'chat:message') {
            setMessages((prev) =>
              prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
            );
          } else if (data.type === 'reservation:created') {
            setReservations((prev) =>
              prev.some((r) => r.id === data.reservation.id) ? prev : [...prev, data.reservation]
            );
            setMessages((prev) =>
              prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
            );
            triggerReservationNotification(
              '쥬얼리아 · 새 방문 예약 접수',
              `${data.reservation.customerName}님 · ${data.reservation.visitDate} ${data.reservation.visitTime} (${data.reservation.purpose})`,
              `reservation-created-${data.reservation.id}`
            );
          } else if (data.type === 'reservation:updated') {
            setReservations((prev) =>
              prev.map((r) => (r.id === data.reservation.id ? data.reservation : r))
            );
            triggerReservationNotification(
              '쥬얼리아 · 예약 상태 변경',
              `${data.reservation.customerName}님의 ${data.reservation.visitDate} ${data.reservation.visitTime} 예약이 '${data.reservation.status}'(으)로 변경되었습니다.`,
              `reservation-updated-${data.reservation.id}-${data.reservation.status}`
            );
          } else if (data.type === 'presence:update') {
            setActiveUsers(data.activeUsers);
          }
        } catch (err) {
          console.error('WebSocket parse error:', err);
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setWsConnected(false);
        reconnectTimerRef.current = window.setTimeout(connect, 2500);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, []);

  const sendWsEvent = useCallback((event: ClientWsEvent) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }, []);

  const handleSendMessage = useCallback(
    (payload: {
      senderRole: 'customer' | 'staff';
      senderName: string;
      text: string;
      attachedItemName?: string;
      attachedItemPrice?: number;
    }) => {
      const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      sendWsEvent({
        type: 'chat:send',
        payload: { id, ...payload },
      });
    },
    [sendWsEvent]
  );

  const handleCreateReservation = useCallback(
    (payload: {
      customerName: string;
      phone: string;
      visitDate: string;
      visitTime: string;
      purpose: string;
      itemInterest?: string;
      notes?: string;
    }) => {
      const clientRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      sendWsEvent({
        type: 'reservation:create',
        payload: { clientRequestId, ...payload },
      });
    },
    [sendWsEvent]
  );

  const handleUpdateReservationStatus = useCallback(
    (id: string, status: ReservationStatus) => {
      sendWsEvent({
        type: 'reservation:updateStatus',
        payload: { id, status },
      });
    },
    [sendWsEvent]
  );

  const handleInquireItem = useCallback((item: JewelryMenuItem) => {
    setAttachedItem(item);
    setIsDrawerOpen(true);
  }, []);

  const handleSubmitReview = useCallback(
    async (payload: {
      authorName: string;
      rating: number;
      visitPurpose: string;
      purchasedItem?: string;
      content: string;
      photos?: string[];
    }) => {
      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { review: VisitorReview };
        setReviews((prev) => [data.review, ...prev]);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const businessStatus = useMemo(() => getKstBusinessStatus(hours, nowMs), [hours, nowMs]);
  const addressLabel = shopAddress;

  const mainContent = (
    <div id="top" className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1C1917] overflow-x-hidden">
      {/* Demo Key Quota Banner (Case A Requirement) */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Navigation Bar (Strict 3-Zone Contract, Compact Mobile Height <= 15% Viewport) */}
      <header className="sticky top-0 z-40 h-14 sm:h-16 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E5E0D8]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Single-element Brand Logo */}
          <a
            href="#top"
            aria-label="Jewelrya 쥬얼리아 홈으로 이동"
            className="inline-flex items-center shrink-0 min-h-[44px] py-1"
          >
            <JewelryaLogo size="header" />
          </a>

          {/* Zone 2: Concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E]">
            <a href="#featured" className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0">
              오늘의추천
            </a>
            <a href="#location" className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0">
              위치·경로
            </a>
            <a href="#hours" className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0">
              영업시간
            </a>
            <a href="#reviews" className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0">
              리뷰
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="min-h-[40px] sm:min-h-[44px] px-3.5 sm:px-4 py-2 text-xs font-medium text-[#FAF9F6] bg-[#1C1917] hover:bg-[#332E2A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              실시간 예약 · 채팅
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <TodayPicksSection
          menuItems={menuItems}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          addressLabel={addressLabel}
          businessStatus={businessStatus}
          onInquireItem={handleInquireItem}
          onOpenConcierge={() => setIsDrawerOpen(true)}
        />

        <VisitDirectionsSection
          shopCoords={shopCoords}
          shopAddress={addressLabel}
          naverPlaceUrl={naverPlaceUrl}
          hours={hours}
          businessStatus={businessStatus}
          googlePlaceInfo={googlePlaceInfo}
          hasMapsKey={Boolean(mapsApiKey)}
        />

        <ReviewsSection
          reviews={reviews}
          googlePlaceInfo={googlePlaceInfo}
          menuItems={menuItems}
          onSubmitReview={handleSubmitReview}
        />

        <LiveConciergeSectionAndDrawer
          messages={messages}
          reservations={reservations}
          hours={hours}
          activeUsers={activeUsers}
          wsConnected={wsConnected}
          attachedItem={attachedItem}
          menuItems={menuItems}
          notificationPermission={notificationPermission}
          notificationsEnabled={notificationsEnabled}
          onToggleNotifications={handleToggleNotifications}
          onClearAttachedItem={() => setAttachedItem(null)}
          onSendMessage={handleSendMessage}
          onCreateReservation={handleCreateReservation}
          onUpdateReservationStatus={handleUpdateReservationStatus}
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
        />
      </main>

      {toastNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100%-2.5rem)] bg-white border border-[#D6CFC4] rounded-xl shadow-lg p-4 flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-[#F2EFE9] flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-[#9A7B4F]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#1C1917]">{toastNotice.title}</p>
            <p className="text-xs text-[#57534E] mt-0.5 leading-relaxed">{toastNotice.body}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            aria-label="알림 닫기"
            className="p-1 text-[#78716C] hover:text-[#1C1917] rounded cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <footer className="border-t border-[#E5E0D8] bg-white py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#78716C]">
          <div className="space-y-2.5">
            <a href="#top" aria-label="Jewelrya 쥬얼리아 홈으로 이동" className="inline-block">
              <JewelryaLogo size="footer" />
            </a>
            <p>{addressLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={naverPlaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1C1917] transition-colors"
            >
              네이버 플레이스
            </a>
            <a href="#location" className="hover:text-[#1C1917] transition-colors">
              방문 경로 안내
            </a>
            <a href="#concierge" className="hover:text-[#1C1917] transition-colors">
              실시간 예약 문의
            </a>
          </div>
        </div>
      </footer>
    </div>
  );

  if (!mapsApiKey) {
    return mainContent;
  }

  return (
    <APIProvider
      apiKey={mapsApiKey}
      language="ko"
      region="KR"
      libraries={['places', 'routes', 'marker']}
    >
      {mainContent}
    </APIProvider>
  );
}
