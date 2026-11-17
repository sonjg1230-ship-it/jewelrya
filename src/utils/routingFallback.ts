export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface ComputedRouteResult {
  path: LatLngPoint[];
  distanceMeters: number;
  durationMillis: number;
  steps: Array<{
    instruction: string;
    distanceText: string;
  }>;
}

export interface FallbackPlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
  location: LatLngPoint;
}

export const PRESET_ORIGIN_COORDS: Record<string, LatLngPoint> = {
  월평역: { lat: 36.3584569, lng: 127.3617014 },
  정부청사역: { lat: 36.3579577, lng: 127.3814824 },
  갈마역: { lat: 36.3578985, lng: 127.3720367 },
  대전역: { lat: 36.3313521, lng: 127.433365 },
};

function modifierToKorean(modifier?: string): string {
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
}

function formatStepInstruction(step: {
  name?: string;
  maneuver?: { type?: string; modifier?: string };
}): string {
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
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export async function fetchOsrmFallbackDirections(
  origin: LatLngPoint,
  dest: LatLngPoint,
  mode: 'DRIVING' | 'WALKING'
): Promise<ComputedRouteResult> {
  // 1. Try server-side proxy first when running full-stack Express server
  try {
    const params = new URLSearchParams({
      originLat: String(origin.lat),
      originLng: String(origin.lng),
      destLat: String(dest.lat),
      destLng: String(dest.lng),
      mode,
    });
    const resp = await fetch(`/api/directions-fallback?${params.toString()}`);
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('application/json')) {
      const data = (await resp.json()) as ComputedRouteResult;
      if (Array.isArray(data.path) && data.path.length > 0) {
        return data;
      }
    }
  } catch {
    // Fall through to browser CORS routing on static deployments (e.g. Vercel)
  }

  // 2. Direct browser-side OSRM routing (CORS-enabled endpoints)
  const coordPair = `${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
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

  for (let idx = 0; idx < candidateUrls.length; idx += 1) {
    const url = candidateUrls[idx];
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 7000);
      const upstream = await fetch(url, { signal: controller.signal });
      window.clearTimeout(timeoutId);

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

      return {
        path: pathCoords,
        distanceMeters,
        durationMillis: durationSeconds * 1000,
        steps,
      };
    } catch {
      // Try next routing endpoint
    }
  }

  throw new Error('경로 서버 응답을 불러오지 못했습니다.');
}

export async function searchOriginFallback(query: string): Promise<FallbackPlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const presetMatches: FallbackPlaceSuggestion[] = Object.entries(PRESET_ORIGIN_COORDS)
    .filter(([name]) => name.includes(trimmed) || trimmed.includes(name))
    .map(([name, location]) => ({
      id: `preset-${name}`,
      title: name,
      subtitle: '대전 주요 역 · 추천 출발지',
      location,
    }));

  try {
    const params = new URLSearchParams({
      q: trimmed.includes('대전') ? trimmed : `대전 ${trimmed}`,
      countrycodes: 'kr',
      format: 'json',
      limit: '5',
      'accept-language': 'ko',
    });
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (!resp.ok) return presetMatches;

    const results = (await resp.json()) as Array<{
      place_id: number;
      display_name: string;
      name?: string;
      lat: string;
      lon: string;
    }>;

    const remoteSuggestions: FallbackPlaceSuggestion[] = results
      .map((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const parts = item.display_name.split(',').map((p) => p.trim());
        const title = item.name?.trim() || parts[0] || trimmed;
        const subtitle = parts.slice(1, 4).join(' · ') || '대한민국 대전';
        return {
          id: `osm-${item.place_id}`,
          title,
          subtitle,
          location: { lat, lng },
        };
      })
      .filter((item): item is FallbackPlaceSuggestion => item !== null);

    const seenTitles = new Set(presetMatches.map((p) => p.title));
    return [
      ...presetMatches,
      ...remoteSuggestions.filter((item) => !seenTitles.has(item.title)),
    ].slice(0, 5);
  } catch {
    return presetMatches;
  }
}
