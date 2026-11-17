import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  CalendarOff,
  Car,
  Clock,
  ExternalLink,
  Footprints,
  LocateFixed,
  MapPin,
  Moon,
  Navigation,
  Search,
  Store,
  Sunrise,
  Sunset,
  TrainFront,
} from 'lucide-react';
import type { DayHours, ResolvedGooglePlaceInfo } from '../shared/types';
import type { KstBusinessStatus } from '../utils/shopAssets';
import { useAutocompleteSuggestions } from '../hooks/useAutocompleteSuggestions';

type TravelModeOption = 'DRIVING' | 'TRANSIT' | 'WALKING';

interface NearbySpot {
  id: string;
  name: string;
  primaryType?: string;
  location: google.maps.LatLngLiteral;
}

interface ComputedRouteSummary {
  distanceMeters: number;
  durationMillis: number;
  steps: Array<{
    instruction: string;
    distanceText: string;
  }>;
}

interface VisitDirectionsSectionProps {
  shopCoords: google.maps.LatLngLiteral;
  shopAddress: string;
  naverPlaceUrl: string;
  hours: DayHours[];
  businessStatus: KstBusinessStatus;
  googlePlaceInfo: ResolvedGooglePlaceInfo | null;
  hasMapsKey: boolean;
}

const ORIGIN_PRESETS = ['월평역', '정부청사역', '갈마역', '대전역'];

function checkQuotaError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('429') ||
    msg.includes('OVER_QUERY_LIMIT')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

function DirectionsMapController({
  shopCoords,
  originLocation,
  originLabel,
  travelMode,
  nearbySpots,
  resolvedAddress,
  naverPlaceUrl,
  onRouteComputed,
  onRouteError,
  onRouteLoadingChange,
}: {
  shopCoords: google.maps.LatLngLiteral;
  originLocation: google.maps.LatLngLiteral | null;
  originLabel: string;
  travelMode: TravelModeOption;
  nearbySpots: NearbySpot[];
  resolvedAddress: string;
  naverPlaceUrl: string;
  onRouteComputed: (summary: ComputedRouteSummary | null) => void;
  onRouteError: (msg: string | null) => void;
  onRouteLoadingChange: (loading: boolean) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [shopMarker, setShopMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [infoOpen, setInfoOpen] = useState(true);
  const [selectedNearby, setSelectedNearby] = useState<NearbySpot | null>(null);

  const handleShopMarkerRef = useCallback(
    (m: google.maps.marker.AdvancedMarkerElement | null) => {
      setShopMarker(m);
    },
    []
  );

  useEffect(() => {
    if (!map || !originLocation) {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      onRouteComputed(null);
      return;
    }

    let cancelled = false;
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    onRouteError(null);
    onRouteLoadingChange(true);

    const drawFallbackPolyline = (
      pathPoints: google.maps.LatLngLiteral[],
      distanceMeters: number,
      durationMillis: number,
      steps: Array<{ instruction: string; distanceText: string }>
    ) => {
      if (cancelled) return;
      const polyline = new google.maps.Polyline({
        path: pathPoints,
        strokeColor: travelMode === 'WALKING' ? '#44403C' : '#9A7B4F',
        strokeWeight: travelMode === 'WALKING' ? 4 : 5,
        strokeOpacity: 0.92,
      });
      polyline.setMap(map);
      polylinesRef.current = [polyline];

      const bounds = new google.maps.LatLngBounds();
      pathPoints.forEach((pt) => bounds.extend(pt));
      bounds.extend(originLocation);
      bounds.extend(shopCoords);
      map.fitBounds(bounds, 60);

      onRouteComputed({
        distanceMeters,
        durationMillis,
        steps,
      });
    };

    const runFallbackDirections = async () => {
      if (travelMode === 'TRANSIT') {
        if (cancelled) return;
        onRouteLoadingChange(false);
        onRouteError('선택하신 구간의 대중교통 경로를 찾지 못했습니다. 자동차 또는 도보 경로를 확인해 보세요.');
        onRouteComputed(null);
        return;
      }

      try {
        const params = new URLSearchParams({
          originLat: String(originLocation.lat),
          originLng: String(originLocation.lng),
          destLat: String(shopCoords.lat),
          destLng: String(shopCoords.lng),
          mode: travelMode,
        });
        const resp = await fetch(`/api/directions-fallback?${params.toString()}`);
        if (cancelled) return;
        if (!resp.ok) {
          throw new Error(`Fallback route status ${resp.status}`);
        }
        const data = (await resp.json()) as {
          path: google.maps.LatLngLiteral[];
          distanceMeters: number;
          durationMillis: number;
          steps: Array<{ instruction: string; distanceText: string }>;
        };
        if (!data.path || data.path.length === 0) {
          throw new Error('Empty fallback path');
        }
        onRouteLoadingChange(false);
        drawFallbackPolyline(data.path, data.distanceMeters, data.durationMillis, data.steps);
      } catch (fallbackErr) {
        if (cancelled) return;
        onRouteLoadingChange(false);
        console.error('Fallback directions error:', fallbackErr);
        onRouteError('경로 계산에 실패했습니다. 출발지를 다시 선택하거나 잠시 후 시도해 주세요.');
        onRouteComputed(null);
      }
    };

    if (!routesLib) {
      if (travelMode === 'DRIVING' || travelMode === 'WALKING') {
        void runFallbackDirections();
      } else {
        onRouteLoadingChange(false);
      }
      return () => {
        cancelled = true;
        polylinesRef.current.forEach((p) => p.setMap(null));
        polylinesRef.current = [];
      };
    }

    const request = {
      origin: originLocation,
      destination: shopCoords,
      travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    // Modern Routes API JS SDK wrapper (avoids CORS preflight issues)
    (
      routesLib.Route as unknown as {
        computeRoutes: (req: unknown) => Promise<{
          routes?: Array<{
            createPolylines: () => google.maps.Polyline[];
            viewport?: google.maps.LatLngBounds;
            distanceMeters?: number;
            durationMillis?: number;
            legs?: Array<{
              steps?: Array<{
                instructions?: string;
                localizedValues?: { distance?: { text?: string } };
              }>;
            }>;
          }>;
        }>;
      }
    )
      .computeRoutes(request)
      .then(({ routes }) => {
        if (cancelled) return;

        if (!routes || routes.length === 0) {
          void runFallbackDirections();
          return;
        }

        onRouteLoadingChange(false);
        const primaryRoute = routes[0];
        const createdPolylines = primaryRoute.createPolylines();
        createdPolylines.forEach((polyline) => {
          polyline.setOptions({
            strokeColor: travelMode === 'WALKING' ? '#44403C' : '#9A7B4F',
            strokeWeight: travelMode === 'WALKING' ? 4 : 5,
            strokeOpacity: 0.92,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = createdPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 60);
        }

        const rawSteps = primaryRoute.legs?.[0]?.steps ?? [];
        const steps = rawSteps
          .filter((s) => s.instructions)
          .slice(0, 8)
          .map((s) => ({
            instruction: s.instructions!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            distanceText: s.localizedValues?.distance?.text ?? '',
          }));

        onRouteComputed({
          distanceMeters: primaryRoute.distanceMeters ?? 0,
          durationMillis: primaryRoute.durationMillis ?? 0,
          steps,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        checkQuotaError(err);
        console.warn('Google Routes API returned error, trying fallback routing:', err);
        void runFallbackDirections();
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routesLib, originLocation, shopCoords, travelMode, onRouteComputed, onRouteError, onRouteLoadingChange]);

  return (
    <>
      <AdvancedMarker
        ref={handleShopMarkerRef}
        position={shopCoords}
        onClick={() => setInfoOpen((prev) => !prev)}
        title="쥬얼리아"
      >
        <Pin background="#1C1917" borderColor="#9A7B4F" glyphColor="#FAF9F6" scale={1.15} />
      </AdvancedMarker>

      {infoOpen && shopMarker && (
        <InfoWindow anchor={shopMarker} onCloseClick={() => setInfoOpen(false)}>
          <div className="p-1 max-w-[230px] text-[#1C1917]">
            <p className="font-semibold text-sm mb-1">쥬얼리아</p>
            <p className="text-xs text-[#57534E] leading-snug mb-2">{resolvedAddress}</p>
            <a
              href={naverPlaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#7D623C] hover:underline"
            >
              <span>네이버 플레이스 열기</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </InfoWindow>
      )}

      {originLocation && (
        <AdvancedMarker position={originLocation} title={originLabel || '출발지'}>
          <Pin background="#9A7B4F" borderColor="#FAF9F6" glyphColor="#FAF9F6" scale={0.95} />
        </AdvancedMarker>
      )}

      {nearbySpots.map((spot) => (
        <AdvancedMarker
          key={spot.id}
          position={spot.location}
          onClick={() => setSelectedNearby(spot)}
          title={spot.name}
        >
          <div className="px-2 py-1 bg-white/95 border border-[#D6CFC4] rounded-md shadow-sm text-[11px] font-medium text-[#44403C] whitespace-nowrap">
            {spot.name}
          </div>
        </AdvancedMarker>
      ))}

      {selectedNearby && (
        <InfoWindow
          position={selectedNearby.location}
          onCloseClick={() => setSelectedNearby(null)}
        >
          <div className="p-1 text-xs text-[#1C1917]">
            <p className="font-semibold">{selectedNearby.name}</p>
            <p className="text-[#78716C] mt-0.5">매장 인근 교통·편의 거점</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function VisitDirectionsSection({
  shopCoords,
  shopAddress,
  naverPlaceUrl,
  hours,
  businessStatus,
  googlePlaceInfo,
  hasMapsKey,
}: VisitDirectionsSectionProps) {
  const placesLib = useMapsLibrary('places');

  const [originInput, setOriginInput] = useState('');
  const [originLocation, setOriginLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [originLabel, setOriginLabel] = useState('');
  const [travelMode, setTravelMode] = useState<TravelModeOption>('DRIVING');
  const [routeSummary, setRouteSummary] = useState<ComputedRouteSummary | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [nearbySpots, setNearbySpots] = useState<NearbySpot[]>([]);

  const { suggestions, isLoading: autocompleteLoading, resetSession } = useAutocompleteSuggestions(
    originInput,
    shopCoords
  );

  // Fetch nearby transit / parking stations dynamically via Places API (New)
  useEffect(() => {
    if (!placesLib) return;
    let cancelled = false;

    placesLib.Place.searchNearby({
      fields: ['id', 'displayName', 'location', 'primaryType'],
      locationRestriction: {
        center: shopCoords,
        radius: 1200,
      },
      includedPrimaryTypes: ['subway_station', 'bus_station', 'parking'],
      maxResultCount: 5,
      language: 'ko',
    })
      .then((res) => {
        if (cancelled) return;
        const list: NearbySpot[] = (res.places ?? [])
          .filter((p) => p.location && p.displayName)
          .map((p, idx) => ({
            id: p.id || `nearby-${idx}`,
            name: p.displayName!,
            primaryType: p.primaryType ?? undefined,
            location: {
              lat: p.location!.lat(),
              lng: p.location!.lng(),
            },
          }));
        setNearbySpots(list);
      })
      .catch((err: unknown) => {
        checkQuotaError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [placesLib, shopCoords]);

  const handleSelectSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      if (place.location) {
        const label = place.displayName || place.formattedAddress || originInput;
        setOriginLocation({
          lat: place.location.lat(),
          lng: place.location.lng(),
        });
        setOriginLabel(label);
        setOriginInput(label);
      }
      resetSession();
    } catch (err) {
      checkQuotaError(err);
      setRouteError('선택한 출발지 좌표를 불러오지 못했습니다.');
    }
  };

  const handleSelectPresetOrigin = async (presetName: string) => {
    if (!placesLib) {
      setRouteError('지도 서비스가 아직 초기화 중입니다.');
      return;
    }
    setRouteError(null);
    setRouteLoading(true);
    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: presetName,
        fields: ['displayName', 'location', 'formattedAddress'],
        region: 'kr',
        language: 'ko',
        locationBias: {
          center: shopCoords,
          radius: 25000,
        },
        maxResultCount: 1,
      });

      const matched = places?.[0];
      if (matched?.location) {
        const label = matched.displayName || presetName;
        setOriginLocation({
          lat: matched.location.lat(),
          lng: matched.location.lng(),
        });
        setOriginLabel(label);
        setOriginInput(label);
      } else {
        setRouteLoading(false);
        setRouteError(`'${presetName}' 위치를 찾지 못했습니다.`);
      }
    } catch (err) {
      setRouteLoading(false);
      checkQuotaError(err);
      setRouteError('출발지 검색 중 오류가 발생했습니다.');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setRouteError('이 브라우저에서는 위치 정보 조회를 지원하지 않습니다.');
      return;
    }
    setGeoLoading(true);
    setRouteError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setOriginLocation(coords);
        setOriginLabel('현재 내 위치');
        setOriginInput('현재 내 위치');
      },
      () => {
        setGeoLoading(false);
        setRouteError('현재 위치를 가져올 수 없습니다. 브라우저 위치 권한을 허용하거나 출발지를 검색해 주세요.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const resolvedAddress =
    shopAddress || '대전 서구 월평동로 83 다모아아파트상가 101호';

  const googleDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shopCoords.lat},${shopCoords.lng}`;

  return (
    <section id="location" className="py-16 lg:py-24 border-t border-[#E5E0D8]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs tracking-wider text-[#9A7B4F] font-medium mb-2">
              LOCATION &amp; VISIT DIRECTIONS
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] [text-wrap:balance]">
              위치 확인 및 방문 경로 안내
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={naverPlaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#1C1917] bg-white border border-[#D6CFC4] hover:border-[#9A7B4F] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>네이버 플레이스 보기</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#9A7B4F]" />
            </a>
            <a
              href={googleDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#FAF9F6] bg-[#1C1917] hover:bg-[#332E2A] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Google 지도 길찾기</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Google Map */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative w-full h-[440px] lg:h-[580px] rounded-xl overflow-hidden border border-[#E5E0D8] bg-[#F2EFE9]">
              {hasMapsKey ? (
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  defaultCenter={shopCoords}
                  defaultZoom={16}
                  gestureHandling="greedy"
                  mapTypeControl={false}
                  streetViewControl={false}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="w-full h-full"
                >
                  <DirectionsMapController
                    shopCoords={shopCoords}
                    originLocation={originLocation}
                    originLabel={originLabel}
                    travelMode={travelMode}
                    nearbySpots={nearbySpots}
                    resolvedAddress={resolvedAddress}
                    naverPlaceUrl={naverPlaceUrl}
                    onRouteComputed={setRouteSummary}
                    onRouteError={setRouteError}
                    onRouteLoadingChange={setRouteLoading}
                  />
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <MapPin className="w-8 h-8 text-[#9A7B4F] mb-3" />
                  <p className="text-sm font-medium text-[#1C1917]">지도를 불러오는 중입니다</p>
                  <p className="text-xs text-[#78716C] mt-1 tabular-nums">
                    쥬얼리아 기준 좌표: {shopCoords.lat}, {shopCoords.lng}
                  </p>
                </div>
              )}
            </div>

            {/* Nearby transit & landmarks discovered via Places API (New) */}
            {nearbySpots.length > 0 && (
              <div className="p-4 bg-white border border-[#E5E0D8] rounded-xl">
                <p className="text-xs font-medium text-[#78716C] mb-2">
                  반경 1.2km 이내 인근 교통 · 주차 거점 (Google Places 실시간 탐색)
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#1C1917]">
                  {nearbySpots.map((spot, idx) => (
                    <span key={spot.id} className="inline-flex items-center gap-1.5">
                      <span>{spot.name}</span>
                      {idx < nearbySpots.length - 1 && (
                        <span className="text-[#D6CFC4]" aria-hidden="true">
                          ·
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Directions Planner + Business Hours */}
          <div className="lg:col-span-5 space-y-6">
            {/* Directions Control Card */}
            <div className="p-6 bg-white border border-[#E5E0D8] rounded-xl space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#1C1917] mb-1">방문 경로 계산</h3>
                <p className="text-xs text-[#78716C]">
                  도착지: 쥬얼리아 ({resolvedAddress})
                </p>
              </div>

              {/* Origin Search Input */}
              <div className="relative">
                <label htmlFor="origin-search" className="block text-xs font-medium text-[#57534E] mb-1.5">
                  출발지 검색
                </label>
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 pointer-events-none" />
                  <input
                    id="origin-search"
                    type="text"
                    value={originInput}
                    onChange={(e) => setOriginInput(e.target.value)}
                    placeholder="역명, 대학, 도로명 주소를 입력하세요"
                    className="w-full pl-10 pr-24 py-2.5 text-sm bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
                  />
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={geoLoading}
                    className="absolute right-1.5 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#1C1917] bg-white border border-[#E5E0D8] hover:border-[#9A7B4F] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-[#9A7B4F]" />
                    <span>{geoLoading ? '확인 중' : '현위치'}</span>
                  </button>
                </div>

                {(suggestions.length > 0 || autocompleteLoading) && originInput !== originLabel && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#E5E0D8] rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {autocompleteLoading && suggestions.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-[#78716C]">주소 후보를 검색하는 중...</div>
                    ) : (
                      suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => void handleSelectSuggestion(s)}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#1C1917] hover:bg-[#FAF9F6] border-b last:border-b-0 border-[#F0ECE4] cursor-pointer"
                        >
                          {s.placePrediction?.text.text}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Quick Origin Presets */}
              <div>
                <span className="block text-xs text-[#78716C] mb-2">주요 출발지 빠른 선택</span>
                <div className="flex flex-wrap gap-1.5">
                  {ORIGIN_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => void handleSelectPresetOrigin(preset)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        originLabel === preset
                          ? 'bg-[#1C1917] text-[#FAF9F6] border-[#1C1917]'
                          : 'bg-[#FAF9F6] text-[#44403C] border-[#E5E0D8] hover:border-[#9A7B4F]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Travel Mode Segmented Control */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F2EFE9] rounded-lg border border-[#E5E0D8]">
                {(
                  [
                    { id: 'DRIVING', label: '자동차', Icon: Car },
                    { id: 'TRANSIT', label: '대중교통', Icon: TrainFront },
                    { id: 'WALKING', label: '도보', Icon: Footprints },
                  ] as const
                ).map(({ id, label, Icon }) => {
                  const active = travelMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTravelMode(id)}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active ? 'bg-white text-[#1C1917] shadow-sm' : 'text-[#57534E] hover:text-[#1C1917]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Route Output */}
              {!originLocation && !routeLoading && !routeError && (
                <div className="p-3.5 bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg text-xs text-[#57534E]">
                  위에서 출발지(예: 월평역, 정부청사역 또는 현위치)를 선택하시면 지도 위에{' '}
                  {travelMode === 'DRIVING' ? '자동차' : travelMode === 'WALKING' ? '도보' : '대중교통'} 경로가 안내됩니다.
                </div>
              )}

              {routeLoading && (
                <div className="p-4 bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg text-xs text-[#57534E]">
                  최적 방문 경로를 계산하고 있습니다...
                </div>
              )}

              {routeError && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                  {routeError}
                </div>
              )}

              {routeSummary && !routeLoading && (
                <div className="p-4 bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg space-y-3">
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#E5E0D8]">
                    <div>
                      <span className="text-xs text-[#78716C] block">예상 소요 시간</span>
                      <span className="text-xl font-semibold text-[#1C1917] tabular-nums">
                        약 {Math.max(1, Math.round(routeSummary.durationMillis / 60000))}분
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#78716C] block">이동 거리</span>
                      <span className="text-base font-medium text-[#44403C] tabular-nums">
                        {(routeSummary.distanceMeters / 1000).toFixed(1)} km
                      </span>
                    </div>
                  </div>

                  {routeSummary.steps.length > 0 && (
                    <ol className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {routeSummary.steps.map((step, i) => (
                        <li key={i} className="flex items-start justify-between gap-3 text-xs text-[#44403C]">
                          <span className="leading-relaxed">
                            <span className="font-medium text-[#9A7B4F] mr-1.5 tabular-nums">{i + 1}.</span>
                            {step.instruction}
                          </span>
                          {step.distanceText && (
                            <span className="text-[#78716C] shrink-0 tabular-nums">{step.distanceText}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>

            {/* Business Hours Card with Live Status & Countdown Dashboard */}
            <div id="hours" className="p-5 sm:p-6 bg-white border border-[#E5E0D8] rounded-xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#9A7B4F]" />
                  <h3 className="text-base font-semibold text-[#1C1917]">영업시간 안내</h3>
                </div>
                <span className="text-xs font-medium text-[#78716C] tabular-nums">
                  {businessStatus.currentDayLabel}요일 · KST {businessStatus.currentClockLabel}
                </span>
              </div>

              {/* Visual Live Operating & Remaining-Time Dashboard (.business-status-card) */}
              <div
                className={`business-status-card rounded-2xl border overflow-hidden ${
                  businessStatus.isOpen
                    ? 'bg-[#F5FBF7] border-[#BBE2C8]'
                    : 'bg-[#FAF8F4] border-[#E5E0D8]'
                }`}
              >
                {/* Status Header with Dedicated Status Icon */}
                <div
                  className={`px-4 py-3.5 border-b flex items-center justify-between gap-3 ${
                    businessStatus.isOpen
                      ? 'bg-[#EAF6EE] border-[#C6E6D0]'
                      : 'bg-[#F3EFE8] border-[#E5E0D8]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                        businessStatus.isOpen
                          ? 'bg-white border-[#BBE2C8] text-[#166534]'
                          : businessStatus.statusLabel === '오늘 휴무'
                          ? 'bg-white border-[#D6CFC4] text-[#78716C]'
                          : 'bg-white border-[#E5D3B3] text-[#7D623C]'
                      }`}
                    >
                      {businessStatus.isOpen ? (
                        <Store className="w-5 h-5" />
                      ) : businessStatus.statusLabel === '오늘 휴무' ? (
                        <CalendarOff className="w-5 h-5" />
                      ) : (
                        <Moon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`text-sm sm:text-[15px] font-bold tracking-tight block ${
                          businessStatus.isOpen ? 'text-[#166534]' : 'text-[#1C1917]'
                        }`}
                      >
                        {businessStatus.statusLabel}
                      </span>
                      <span className="text-xs text-[#57534E] block truncate">
                        {businessStatus.detailLabel}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase tracking-wider text-[#78716C] block">
                      TODAY
                    </span>
                    <span className="text-xs font-semibold text-[#1C1917] tabular-nums">
                      {businessStatus.todayHoursLabel}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3.5">
                  {/* Hierarchical Open / Close Time Split Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white border border-[#E5E0D8] rounded-xl p-3 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#78716C]">
                        <Sunrise className="w-3.5 h-3.5 text-[#9A7B4F] shrink-0" />
                        <span className="truncate">{businessStatus.openTimeLabel}</span>
                      </div>
                      <span className="text-lg sm:text-xl font-semibold text-[#1C1917] tabular-nums tracking-tight mt-1.5 block">
                        {businessStatus.openTimeValue}
                      </span>
                    </div>

                    <div className="bg-white border border-[#E5E0D8] rounded-xl p-3 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#78716C]">
                        <Sunset className="w-3.5 h-3.5 text-[#9A7B4F] shrink-0" />
                        <span className="truncate">{businessStatus.closeTimeLabel}</span>
                      </div>
                      <span className="text-lg sm:text-xl font-semibold text-[#1C1917] tabular-nums tracking-tight mt-1.5 block">
                        {businessStatus.closeTimeValue}
                      </span>
                    </div>
                  </div>

                  {/* Countdown Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-[#57534E]">
                        {businessStatus.countdownTitle}
                      </span>
                      <span className="font-semibold text-[#1C1917] tabular-nums">
                        {businessStatus.targetTimeLabel}
                      </span>
                    </div>

                    {/* Tabular Countdown KPI Tiles */}
                    <div
                      className={`grid gap-2 ${
                        businessStatus.countdownParts.days > 0 ? 'grid-cols-4' : 'grid-cols-3'
                      }`}
                    >
                      {businessStatus.countdownParts.days > 0 && (
                        <div className="bg-white border border-[#E5E0D8] rounded-xl py-2.5 px-2 text-center">
                          <span className="text-xl sm:text-2xl font-semibold text-[#1C1917] tabular-nums leading-none block">
                            {businessStatus.countdownParts.days}
                          </span>
                          <span className="text-[11px] text-[#78716C] mt-1 block">일</span>
                        </div>
                      )}
                      <div className="bg-white border border-[#E5E0D8] rounded-xl py-2.5 px-2 text-center">
                        <span className="text-xl sm:text-2xl font-semibold text-[#1C1917] tabular-nums leading-none block">
                          {String(businessStatus.countdownParts.hours).padStart(2, '0')}
                        </span>
                        <span className="text-[11px] text-[#78716C] mt-1 block">시간</span>
                      </div>
                      <div className="bg-white border border-[#E5E0D8] rounded-xl py-2.5 px-2 text-center">
                        <span className="text-xl sm:text-2xl font-semibold text-[#1C1917] tabular-nums leading-none block">
                          {String(businessStatus.countdownParts.minutes).padStart(2, '0')}
                        </span>
                        <span className="text-[11px] text-[#78716C] mt-1 block">분</span>
                      </div>
                      <div className="bg-white border border-[#E5E0D8] rounded-xl py-2.5 px-2 text-center">
                        <span
                          className={`text-xl sm:text-2xl font-semibold tabular-nums leading-none block ${
                            businessStatus.isOpen ? 'text-[#166534]' : 'text-[#9A7B4F]'
                          }`}
                        >
                          {String(businessStatus.countdownParts.seconds).padStart(2, '0')}
                        </span>
                        <span className="text-[11px] text-[#78716C] mt-1 block">초</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Operating Timeline Progress Bar */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="h-2 w-full rounded-sm bg-[#E5E0D8]/80 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${
                          businessStatus.isOpen ? 'bg-[#166534]' : 'bg-[#9A7B4F]'
                        }`}
                        style={{ width: `${businessStatus.progressPercent}%` }}
                        role="progressbar"
                        aria-valuenow={businessStatus.progressPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={
                          businessStatus.isOpen
                            ? `오늘 영업 진행률 ${businessStatus.progressPercent}%`
                            : `다음 오픈까지 대기 진행률 ${businessStatus.progressPercent}%`
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#57534E] tabular-nums">
                      <span>{businessStatus.windowStartLabel}</span>
                      <span className="font-medium text-[#1C1917]">
                        {businessStatus.isOpen
                          ? `운영 진행 ${businessStatus.progressPercent}%`
                          : `오픈 대기 ${businessStatus.progressPercent}%`}
                      </span>
                      <span>{businessStatus.windowEndLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              <ul className="divide-y divide-[#F0ECE4] text-sm">
                {hours.map((row) => {
                  const isToday = row.dayIndex === businessStatus.currentDayIndex;
                  return (
                    <li
                      key={row.dayIndex}
                      className={`py-2 px-2.5 -mx-2.5 rounded-md flex items-center justify-between gap-3 ${
                        isToday ? 'bg-[#F2EFE9] font-medium text-[#1C1917]' : 'text-[#44403C]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5">{row.dayLabel}</span>
                        {isToday && <span className="text-xs text-[#9A7B4F]">오늘</span>}
                      </div>
                      <span
                        className={`tabular-nums ${
                          row.isClosed ? 'text-[#78716C]' : 'text-[#1C1917]'
                        }`}
                      >
                        {row.isClosed
                          ? `정기휴무${row.note ? ` (${row.note})` : ''}`
                          : `${row.open} - ${row.close}`}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <p className="text-xs text-[#57534E] pt-1">
                · 매주 수요일은 오후 3시에 오픈합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
