import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Bell,
  BellOff,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  Radio,
  Send,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  ChatMessage,
  DayHours,
  JewelryMenuItem,
  Reservation,
  ReservationStatus,
} from '../shared/types';
import { formatKrw } from '../utils/shopAssets';

interface LiveConciergeWidgetProps {
  messages: ChatMessage[];
  reservations: Reservation[];
  hours: DayHours[];
  activeUsers: number;
  wsConnected: boolean;
  attachedItem: JewelryMenuItem | null;
  menuItems: JewelryMenuItem[];
  notificationPermission: NotificationPermission | 'unsupported';
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  onClearAttachedItem: () => void;
  onSendMessage: (payload: {
    senderRole: 'customer' | 'staff';
    senderName: string;
    text: string;
    attachedItemName?: string;
    attachedItemPrice?: number;
  }) => void;
  onCreateReservation: (payload: {
    customerName: string;
    phone: string;
    visitDate: string;
    visitTime: string;
    purpose: string;
    itemInterest?: string;
    notes?: string;
  }) => void;
  onUpdateReservationStatus: (id: string, status: ReservationStatus) => void;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
}

const STANDARD_TIME_SLOTS = ['11:30', '13:00', '14:30', '16:00', '17:30', '19:00'];
const WEDNESDAY_TIME_SLOTS = ['15:00', '16:00', '17:00', '18:00', '19:00'];
const WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const PURPOSES = [
  '오늘의 추천템 시착',
  '커플링 맞춤 상담',
  '기념일 선물 추천',
  '주얼리 세척 · 수선',
];
const QUICK_PROMPTS = [
  '오늘 방문 시착 가능한 시간대가 있을까요?',
  '매장 인근 주차 안내 부탁드립니다.',
  '반지 호수 수선 비용과 소요 시간이 궁금합니다.',
];

function getKstNowInfo(): { dateStr: string; year: number; month: number; day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '2026');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '1');
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '12') % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { dateStr, year, month, day, minutes: hour * 60 + minute };
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDayOfWeekFromKey(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function parseHhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function getDayHoursRule(hours: DayHours[], dayIndex: number): DayHours | undefined {
  if (hours.length > 0) {
    return hours.find((h) => h.dayIndex === dayIndex);
  }
  // Fallback matching store schedule if hours haven't loaded yet
  const closedDays = [0, 2, 4];
  if (closedDays.includes(dayIndex)) {
    return { dayIndex, dayLabel: WEEKDAY_HEADERS[dayIndex], open: '00:00', close: '00:00', isClosed: true };
  }
  return {
    dayIndex,
    dayLabel: WEEKDAY_HEADERS[dayIndex],
    open: dayIndex === 3 ? '15:00' : '11:00',
    close: '20:00',
    isClosed: false,
  };
}

function getCandidateSlotsForDate(hours: DayHours[], dateKey: string): string[] {
  const dayIndex = getDayOfWeekFromKey(dateKey);
  const rule = getDayHoursRule(hours, dayIndex);
  if (!rule || rule.isClosed) return [];
  if (rule.open >= '15:00') return WEDNESDAY_TIME_SLOTS;
  return STANDARD_TIME_SLOTS;
}

function findInitialAvailableDate(hours: DayHours[]): string {
  const kst = getKstNowInfo();
  for (let offset = 0; offset < 21; offset += 1) {
    const dt = new Date(Date.UTC(kst.year, kst.month - 1, kst.day + offset));
    const key = toDateKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    const slots = getCandidateSlotsForDate(hours, key);
    if (slots.length === 0) continue;
    if (offset === 0) {
      const hasFutureSlot = slots.some((s) => parseHhmmToMinutes(s) > kst.minutes + 15);
      if (!hasFutureSlot) continue;
    }
    return key;
  }
  return kst.dateStr;
}

function formatKoreanDateDisplay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const weekday = WEEKDAY_HEADERS[getDayOfWeekFromKey(dateKey)] ?? '';
  return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')} (${weekday})`;
}

function formatTimeLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function LiveConciergePanel({
  messages,
  reservations,
  hours,
  activeUsers,
  wsConnected,
  attachedItem,
  menuItems,
  notificationPermission,
  notificationsEnabled,
  onToggleNotifications,
  onClearAttachedItem,
  onSendMessage,
  onCreateReservation,
  onUpdateReservationStatus,
  compact = false,
  onClose,
}: Omit<LiveConciergeWidgetProps, 'isDrawerOpen' | 'onCloseDrawer'> & {
  compact?: boolean;
  onClose?: () => void;
}) {
  const kstNow = useMemo(() => getKstNowInfo(), []);
  const [activeTab, setActiveTab] = useState<'chat' | 'reserve'>('chat');
  const [role, setRole] = useState<'customer' | 'staff'>('customer');
  const [senderName, setSenderName] = useState('방문 고객');
  const [chatText, setChatText] = useState('');

  // Reservation form & visual calendar states
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [visitDate, setVisitDate] = useState(() => findInitialAvailableDate(hours));
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>(() => {
    const initial = findInitialAvailableDate(hours);
    const [y, m] = initial.split('-').map(Number);
    return { year: y, month: m };
  });
  const [visitTime, setVisitTime] = useState('15:00');
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [itemInterest, setItemInterest] = useState('');
  const [notes, setNotes] = useState('');
  const [reservationSent, setReservationSent] = useState(false);

  const messageListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (attachedItem) {
      setItemInterest(attachedItem.name);
    }
  }, [attachedItem]);

  // Ensure initial date & default time slot respect loaded shop hours
  const bookedSlotsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of reservations) {
      if (!map.has(r.visitDate)) {
        map.set(r.visitDate, new Set());
      }
      map.get(r.visitDate)!.add(r.visitTime);
    }
    return map;
  }, [reservations]);

  const selectedDaySlots = useMemo(() => {
    const candidates = getCandidateSlotsForDate(hours, visitDate);
    const booked = bookedSlotsByDate.get(visitDate);
    const isToday = visitDate === kstNow.dateStr;
    return candidates.map((time) => {
      const isBooked = Boolean(booked?.has(time));
      const isPast = isToday && parseHhmmToMinutes(time) <= kstNow.minutes + 15;
      return {
        time,
        disabled: isBooked || isPast,
        reason: isBooked ? '예약됨' : isPast ? '마감' : null,
      };
    });
  }, [hours, visitDate, bookedSlotsByDate, kstNow]);

  // Keep selected visitDate valid when hours load, and keep visitTime valid when date changes
  useEffect(() => {
    const rule = getDayHoursRule(hours, getDayOfWeekFromKey(visitDate));
    if (!rule || rule.isClosed) {
      const nextValid = findInitialAvailableDate(hours);
      setVisitDate(nextValid);
      const [y, m] = nextValid.split('-').map(Number);
      setCalendarMonth({ year: y, month: m });
    }
  }, [hours, visitDate]);

  useEffect(() => {
    const current = selectedDaySlots.find((s) => s.time === visitTime);
    if (!current || current.disabled) {
      const firstOpen = selectedDaySlots.find((s) => !s.disabled);
      if (firstOpen) {
        setVisitTime(firstOpen.time);
      }
    }
  }, [selectedDaySlots, visitTime]);

  const calendarCells = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const cells: Array<{
      dateKey: string;
      dayNumber: number;
      dayOfWeek: number;
      isPast: boolean;
      isToday: boolean;
      isClosed: boolean;
      isWedLateOpen: boolean;
      hasBookings: boolean;
      isSelectable: boolean;
    } | null> = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push(null);
    }

    for (let d = 1; d <= daysInMonth; d += 1) {
      const dateKey = toDateKey(year, month, d);
      const dayOfWeek = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
      const rule = getDayHoursRule(hours, dayOfWeek);
      const isClosed = !rule || rule.isClosed;
      const isPast = dateKey < kstNow.dateStr;
      const isToday = dateKey === kstNow.dateStr;
      const isWedLateOpen = !isClosed && rule.open >= '15:00';
      const hasBookings = (bookedSlotsByDate.get(dateKey)?.size ?? 0) > 0;
      const slots = getCandidateSlotsForDate(hours, dateKey);
      const hasRemainingToday =
        !isToday || slots.some((s) => parseHhmmToMinutes(s) > kstNow.minutes + 15);
      const isSelectable = !isPast && !isClosed && hasRemainingToday;

      cells.push({
        dateKey,
        dayNumber: d,
        dayOfWeek,
        isPast,
        isToday,
        isClosed,
        isWedLateOpen,
        hasBookings,
        isSelectable,
      });
    }

    return cells;
  }, [calendarMonth, hours, kstNow, bookedSlotsByDate]);

  const canGoPrevMonth =
    calendarMonth.year > kstNow.year ||
    (calendarMonth.year === kstNow.year && calendarMonth.month > kstNow.month);

  const handleShiftMonth = (delta: number) => {
    setCalendarMonth((prev) => {
      const d = new Date(Date.UTC(prev.year, prev.month - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });
  };

  useEffect(() => {
    const el = messageListRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, activeTab]);

  const handleChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendMessage({
      senderRole: role,
      senderName: role === 'staff' ? '쥬얼리아 컨시어지' : senderName.trim() || '방문 고객',
      text: chatText.trim(),
      attachedItemName: attachedItem?.name,
      attachedItemPrice: attachedItem?.priceKrw,
    });
    setChatText('');
    if (attachedItem) onClearAttachedItem();
  };

  const hasAvailableSlot = selectedDaySlots.some((s) => !s.disabled);

  const handleReservationSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim() || !hasAvailableSlot) return;
    onCreateReservation({
      customerName: customerName.trim(),
      phone: phone.trim(),
      visitDate,
      visitTime,
      purpose,
      itemInterest: itemInterest || undefined,
      notes: notes.trim() || undefined,
    });
    setCustomerName('');
    setPhone('');
    setNotes('');
    setReservationSent(true);
    window.setTimeout(() => setReservationSent(false), 4000);
    setActiveTab('chat');
  };

  return (
    <div className="flex flex-col h-full bg-white border border-[#C8BEB0] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#C8BEB0] bg-[#FAF9F6] flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#1C1917] truncate">
              쥬얼리아 실시간 컨시어지
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#78716C] mt-0.5">
            <span className="inline-flex items-center gap-1">
              <Radio className={`w-3.5 h-3.5 ${wsConnected ? 'text-[#166534]' : 'text-[#9A7B4F]'}`} />
              <span>{wsConnected ? '실시간 연결됨' : '연결 재시도 중'}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">현재 접속 {activeUsers}명</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-0.5 bg-[#EFECE6] rounded-lg border border-[#C8BEB0]">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                role === 'customer' ? 'bg-white text-[#1C1917] shadow-sm' : 'text-[#57534E]'
              }`}
            >
              고객
            </button>
            <button
              type="button"
              onClick={() => setRole('staff')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                role === 'staff' ? 'bg-white text-[#1C1917] shadow-sm' : 'text-[#57534E]'
              }`}
            >
              매장 응대
            </button>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="창 닫기"
              className="p-1.5 text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-[#EFECE6] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="px-5 py-2.5 border-b border-[#C8BEB0] bg-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#1C1917] text-[#FAF9F6]'
                : 'bg-[#F2EFE9] text-[#44403C] hover:text-[#1C1917]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>실시간 문의 채팅</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reserve')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'reserve'
                ? 'bg-[#1C1917] text-[#FAF9F6]'
                : 'bg-[#F2EFE9] text-[#44403C] hover:text-[#1C1917]'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>방문 예약 신청</span>
          </button>
        </div>

        {notificationPermission !== 'unsupported' && (
          <button
            type="button"
            onClick={onToggleNotifications}
            title="새 예약 또는 상태 변경 시 브라우저 알림 수신"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              notificationPermission === 'granted' && notificationsEnabled
                ? 'bg-[#FAF9F6] border-[#9A7B4F] text-[#7D623C]'
                : 'bg-white border-[#C8BEB0] text-[#57534E] hover:border-[#9A7B4F] hover:text-[#1C1917]'
            }`}
          >
            {notificationPermission === 'granted' && notificationsEnabled ? (
              <>
                <Bell className="w-3.5 h-3.5 text-[#9A7B4F]" />
                <span>알림 켜짐</span>
              </>
            ) : notificationPermission === 'denied' ? (
              <>
                <BellOff className="w-3.5 h-3.5" />
                <span>알림 차단됨</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" />
                <span>예약 알림 받기</span>
              </>
            )}
          </button>
        )}
      </div>

      {activeTab === 'chat' ? (
        <>
          {/* Message Feed */}
          <div
            ref={messageListRef}
            className={`flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAF9F6]/60 ${
              compact ? 'min-h-[300px] max-h-[420px]' : 'min-h-[340px] max-h-[440px]'
            }`}
          >
            {reservationSent && (
              <div className="p-3 bg-white border border-[#9A7B4F]/40 rounded-lg text-xs text-[#1C1917]">
                방문 예약 요청이 실시간 채팅창과 매장 대기열에 접수되었습니다.
              </div>
            )}

            {messages.map((msg) => {
              const isStaff = msg.senderRole === 'staff';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-[#78716C] mb-1 px-1">
                    <span className="font-medium text-[#44403C]">{msg.senderName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatTimeLabel(msg.createdAt)}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      isStaff
                        ? 'bg-white border border-[#C8BEB0] text-[#1C1917]'
                        : 'bg-[#1C1917] text-[#FAF9F6]'
                    }`}
                  >
                    {msg.attachedItemName && (
                      <div
                        className={`mb-2 pb-2 border-b text-xs ${
                          isStaff
                            ? 'border-[#D6CCC0] text-[#7D623C]'
                            : 'border-white/15 text-[#E5D3B3]'
                        }`}
                      >
                        문의 상품: {msg.attachedItemName}
                        {typeof msg.attachedItemPrice === 'number' &&
                          ` (${formatKrw(msg.attachedItemPrice)})`}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reservation Status Strip for Staff or Recent Bookings */}
          {reservations.length > 0 && (
            <div className="px-5 py-3 border-t border-[#C8BEB0] bg-[#F6F4EF] max-h-36 overflow-y-auto">
              <div className="flex items-center justify-between text-xs font-medium text-[#57534E] mb-2">
                <span>실시간 방문 예약 현황 ({reservations.length}건)</span>
                {role === 'staff' && <span className="text-[#9A7B4F]">매니저 상태 변경 가능</span>}
              </div>
              <div className="space-y-1.5">
                {reservations.slice(-3).reverse().map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white px-3 py-2 rounded-lg border border-[#C8BEB0]"
                  >
                    <div className="flex items-center gap-2 text-[#1C1917] min-w-0">
                      <UserCheck className="w-3.5 h-3.5 text-[#9A7B4F] shrink-0" />
                      <span className="font-medium truncate">
                        {res.customerName} · {res.visitDate} {res.visitTime}
                      </span>
                      <span className="text-[#78716C] truncate">{res.purpose}</span>
                    </div>

                    {role === 'staff' ? (
                      <div className="flex items-center gap-1 shrink-0">
                        {(['접수됨', '예약 확정', '방문 완료'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => onUpdateReservationStatus(res.id, st)}
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                              res.status === st
                                ? 'bg-[#1C1917] text-[#FAF9F6]'
                                : 'bg-[#F2EFE9] text-[#57534E] hover:text-[#1C1917]'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="font-medium text-[#7D623C] shrink-0">{res.status}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Composer */}
          <form onSubmit={handleChatSubmit} className="p-4 border-t border-[#C8BEB0] bg-white space-y-2.5">
            {attachedItem && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#FAF9F6] border border-[#B5A897] rounded-lg text-xs">
                <span className="text-[#1C1917] truncate">
                  선택된 상품: <strong className="font-medium">{attachedItem.name}</strong> (
                  {formatKrw(attachedItem.priceKrw)})
                </span>
                <button
                  type="button"
                  onClick={onClearAttachedItem}
                  className="text-[#78716C] hover:text-[#1C1917] cursor-pointer"
                >
                  해제
                </button>
              </div>
            )}

            {role === 'customer' && (
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setChatText(q)}
                    className="px-2.5 py-1 text-[11px] text-[#57534E] bg-[#FAF9F6] border border-[#C8BEB0] hover:border-[#9A7B4F] rounded-md transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              {role === 'customer' && (
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="성함"
                  aria-label="성함"
                  className="w-24 sm:w-28 px-3 py-2.5 text-xs bg-[#FAF9F6] border border-[#C8BEB0] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
                />
              )}
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder={
                  role === 'staff'
                    ? '고객에게 보낼 실시간 답변을 입력하세요...'
                    : '예약 또는 주얼리 문의사항을 입력하세요...'
                }
                className="flex-1 min-w-0 px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#C8BEB0] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
              />
              <button
                type="submit"
                disabled={!chatText.trim()}
                aria-label="메시지 전송"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1C1917] text-[#FAF9F6] text-xs font-medium rounded-lg hover:bg-[#332E2A] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>전송</span>
              </button>
            </div>
          </form>
        </>
      ) : (
        /* Reservation Booking Form */
        <form onSubmit={handleReservationSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">방문자 성함</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-[#C8BEB0] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">연락처</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-[#C8BEB0] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
              />
            </div>
          </div>

          {/* Visual Calendar Date & Time Picker */}
          <div className="p-3.5 sm:p-4 bg-[#FAF9F6] border border-[#C8BEB0] rounded-xl space-y-3.5">
            {/* Calendar Month Header */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-[#1C1917] block">
                  방문 날짜 선택
                </span>
                <span className="text-[11px] text-[#78716C] block">
                  월·금·토 11:00–20:00 · 수 15:00–20:00 (일·화·목 휴무)
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleShiftMonth(-1)}
                  disabled={!canGoPrevMonth}
                  aria-label="이전 달"
                  className="w-9 h-9 rounded-lg border border-[#C8BEB0] bg-white flex items-center justify-center text-[#1C1917] hover:border-[#9A7B4F] disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="min-w-[82px] text-center text-xs font-semibold text-[#1C1917] tabular-nums">
                  {calendarMonth.year}.{String(calendarMonth.month).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => handleShiftMonth(1)}
                  aria-label="다음 달"
                  className="w-9 h-9 rounded-lg border border-[#C8BEB0] bg-white flex items-center justify-center text-[#1C1917] hover:border-[#9A7B4F] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Header Row */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[#78716C]">
              {WEEKDAY_HEADERS.map((wd, idx) => (
                <div
                  key={wd}
                  className={`py-1 ${
                    idx === 0 || idx === 2 || idx === 4 ? 'text-[#A8A29E]' : 'text-[#57534E]'
                  }`}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* 7-Column Calendar Grid */}
            <div className="grid grid-cols-7 gap-1" role="grid" aria-label="방문 날짜 달력">
              {calendarCells.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="h-11" aria-hidden="true" />;
                }

                const isSelected = visitDate === cell.dateKey;
                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    disabled={!cell.isSelectable}
                    onClick={() => setVisitDate(cell.dateKey)}
                    aria-label={`${cell.dateKey} ${cell.isClosed ? '정기휴무' : '예약 가능'}`}
                    aria-selected={isSelected}
                    className={`relative h-11 rounded-lg border flex flex-col items-center justify-center transition-colors tabular-nums ${
                      isSelected
                        ? 'bg-[#1C1917] border-[#1C1917] text-[#FAF9F6] shadow-sm cursor-pointer'
                        : cell.isSelectable
                        ? cell.isToday
                          ? 'bg-white border-[#9A7B4F] text-[#1C1917] hover:bg-[#F2EFE9] cursor-pointer'
                          : 'bg-white border-[#C8BEB0] text-[#1C1917] hover:border-[#9A7B4F] cursor-pointer'
                        : 'bg-[#F2EFE9]/60 border-transparent text-[#A8A29E] cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`text-xs font-medium leading-none ${
                        cell.isClosed && !cell.isPast ? 'line-through decoration-[#A8A29E]/60' : ''
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.isClosed ? (
                      <span className="text-[9px] leading-none mt-1 text-[#A8A29E]">휴무</span>
                    ) : cell.isWedLateOpen && cell.isSelectable ? (
                      <span
                        className={`text-[9px] leading-none mt-1 ${
                          isSelected ? 'text-[#E6D3B3]' : 'text-[#9A7B4F]'
                        }`}
                      >
                        15시~
                      </span>
                    ) : cell.hasBookings && cell.isSelectable ? (
                      <span
                        className={`w-2.5 h-[2px] mt-1.5 ${
                          isSelected ? 'bg-[#E6D3B3]' : 'bg-[#9A7B4F]'
                        }`}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="h-2.5" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Time Slots for Selected Date */}
            <div className="pt-3 border-t border-[#C8BEB0] space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#1C1917]">
                  <Clock className="w-3.5 h-3.5 text-[#9A7B4F]" />
                  <span>{formatKoreanDateDisplay(visitDate)} 시간 선택</span>
                </span>
                <span className="text-[11px] font-semibold text-[#7D623C] tabular-nums">
                  {selectedDaySlots.some((s) => !s.disabled)
                    ? `${visitTime} 선택됨`
                    : '예약 가능 시간 없음'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {selectedDaySlots.map((slot) => {
                  const isActive = visitTime === slot.time && !slot.disabled;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={slot.disabled}
                      onClick={() => setVisitTime(slot.time)}
                      className={`min-h-[40px] px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors tabular-nums flex items-center justify-center gap-1 ${
                        isActive
                          ? 'bg-[#1C1917] text-[#FAF9F6] border-[#1C1917] cursor-pointer'
                          : slot.disabled
                          ? 'bg-[#F2EFE9]/70 text-[#A8A29E] border-[#C8BEB0]/70 cursor-not-allowed'
                          : 'bg-white text-[#1C1917] border-[#C8BEB0] hover:border-[#9A7B4F] cursor-pointer'
                      }`}
                    >
                      <span className={slot.disabled ? 'line-through' : ''}>{slot.time}</span>
                      {slot.reason && (
                        <span className="text-[10px] text-[#A8A29E]">{slot.reason}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">상담 목적</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-[#C8BEB0] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
              >
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">관심 상품 (선택)</label>
              <select
                value={itemInterest}
                onChange={(e) => setItemInterest(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-[#C8BEB0] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
              >
                <option value="">매장 방문 후 추천</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] mb-1">요청사항 (선택)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="반지 호수, 각인 문구, 희망 소재 등 미리 전달할 내용을 적어주세요."
              className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-[#C8BEB0] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
            />
          </div>

          <button
            type="submit"
            disabled={!hasAvailableSlot}
            className="w-full min-h-[44px] py-3 bg-[#1C1917] text-[#FAF9F6] text-sm font-medium rounded-lg hover:bg-[#332E2A] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {hasAvailableSlot
              ? `${formatKoreanDateDisplay(visitDate)} ${visitTime} 예약 접수하기`
              : '예약 가능한 날짜와 시간을 선택해 주세요'}
          </button>
        </form>
      )}
    </div>
  );
}

export function LiveConciergeSectionAndDrawer(props: LiveConciergeWidgetProps) {
  return (
    <>
      {/* Embedded Concierge Section */}
      <section id="concierge" className="py-16 lg:py-24 border-t border-[#C8BEB0]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-5">
              <p className="text-xs tracking-wider text-[#9A7B4F] font-medium">
                LIVE CONCIERGE &amp; RESERVATION
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] [text-wrap:balance]">
                실시간 방문 예약 및 문의
              </h2>
              <p className="text-sm text-[#57534E] leading-relaxed">
                방문 전 궁금한 시착 가능 여부, 커플링 사이즈 측정, 수선 견적 문의를 실시간 채팅으로 바로 남겨주세요. 예약 신청 시 매장 대기 현황과 즉시 동기화됩니다.
              </p>

              <div className="pt-4 border-t border-[#C8BEB0] space-y-3 text-sm text-[#44403C]">
                <div>
                  <span className="font-medium text-[#1C1917] block">1:1 프라이빗 시착 예약</span>
                  <span className="text-xs text-[#78716C]">
                    대기 시간 없이 전담 주얼리 스타일리스트와 원하시는 피스를 여유롭게 착용해 볼 수 있습니다.
                  </span>
                </div>
                <div>
                  <span className="font-medium text-[#1C1917] block">수선 · 리폼 사전 상담</span>
                  <span className="text-xs text-[#78716C]">
                    체인 접합, 호수 조정, 스톤 재세팅 등 작업 가능 여부와 예상 일정을 바로 안내해 드립니다.
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <LiveConciergePanel
                messages={props.messages}
                reservations={props.reservations}
                hours={props.hours}
                activeUsers={props.activeUsers}
                wsConnected={props.wsConnected}
                attachedItem={props.attachedItem}
                menuItems={props.menuItems}
                notificationPermission={props.notificationPermission}
                notificationsEnabled={props.notificationsEnabled}
                onToggleNotifications={props.onToggleNotifications}
                onClearAttachedItem={props.onClearAttachedItem}
                onSendMessage={props.onSendMessage}
                onCreateReservation={props.onCreateReservation}
                onUpdateReservationStatus={props.onUpdateReservationStatus}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Slide-over Drawer (opened from Header CTA or Product "시착 · 상담 예약" button) */}
      {props.isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="쥬얼리아 실시간 예약 및 채팅"
        >
          <div className="w-full max-w-lg h-full p-3 sm:p-4">
            <LiveConciergePanel
              compact
              messages={props.messages}
              reservations={props.reservations}
              hours={props.hours}
              activeUsers={props.activeUsers}
              wsConnected={props.wsConnected}
              attachedItem={props.attachedItem}
              menuItems={props.menuItems}
              notificationPermission={props.notificationPermission}
              notificationsEnabled={props.notificationsEnabled}
              onToggleNotifications={props.onToggleNotifications}
              onClearAttachedItem={props.onClearAttachedItem}
              onSendMessage={props.onSendMessage}
              onCreateReservation={props.onCreateReservation}
              onUpdateReservationStatus={props.onUpdateReservationStatus}
              onClose={props.onCloseDrawer}
            />
          </div>
        </div>
      )}
    </>
  );
}
