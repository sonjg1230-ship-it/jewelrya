import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchOsrmFallbackDirections,
  type LatLngPoint,
} from '../utils/routingFallback';

export interface FallbackComputedRoute {
  distanceMeters: number;
  durationMillis: number;
  steps: Array<{
    instruction: string;
    distanceText: string;
  }>;
}

interface FallbackInteractiveMapProps {
  shopCoords: LatLngPoint;
  resolvedAddress: string;
  naverPlaceUrl: string;
  originLocation: LatLngPoint | null;
  originLabel: string;
  travelMode: 'DRIVING' | 'TRANSIT' | 'WALKING';
  onRouteComputed: (summary: FallbackComputedRoute | null) => void;
  onRouteError: (msg: string | null) => void;
  onRouteLoadingChange: (loading: boolean) => void;
}

function createShopPinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'jewelrya-leaflet-pin',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <div style="background:#1C1917;color:#FAF9F6;border:2px solid #9A7B4F;border-radius:10px;padding:5px 10px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.22);">쥬얼리아</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid #1C1917;margin-top:-1px;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -34],
  });
}

function createOriginPinIcon(label: string): L.DivIcon {
  const safeLabel = (label || '출발지').replace(/[<>&"']/g, '').slice(0, 14);
  return L.divIcon({
    className: 'jewelrya-leaflet-origin-pin',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <div style="background:#9A7B4F;color:#FAF9F6;border:2px solid #FAF9F6;border-radius:10px;padding:4px 9px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.2);">${safeLabel}</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #9A7B4F;margin-top:-1px;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -30],
  });
}

export function FallbackInteractiveMap({
  shopCoords,
  resolvedAddress,
  naverPlaceUrl,
  originLocation,
  originLabel,
  travelMode,
  onRouteComputed,
  onRouteError,
  onRouteLoadingChange,
}: FallbackInteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const shopMarkerRef = useRef<L.Marker | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Initialize Leaflet map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      center: [shopCoords.lat, shopCoords.lng],
      zoom: 16,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    const primaryTiles = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    );

    let fallbackTilesAdded = false;
    primaryTiles.on('tileerror', () => {
      if (fallbackTilesAdded) return;
      fallbackTilesAdded = true;
      map.removeLayer(primaryTiles);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
    });

    primaryTiles.addTo(map);

    const shopMarker = L.marker([shopCoords.lat, shopCoords.lng], {
      icon: createShopPinIcon(),
    }).addTo(map);

    const popupNode = document.createElement('div');
    popupNode.style.minWidth = '180px';
    popupNode.innerHTML = `
      <div style="font-family:inherit;color:#1C1917;line-height:1.45;">
        <p style="font-weight:700;font-size:13px;margin:0 0 3px 0;">쥬얼리아</p>
        <p style="font-size:11px;color:#57534E;margin:0 0 6px 0;"></p>
        <a href="" target="_blank" rel="noopener noreferrer" style="font-size:11px;font-weight:600;color:#7D623C;text-decoration:none;">네이버 플레이스 열기 &rarr;</a>
      </div>
    `;
    const addrP = popupNode.querySelectorAll('p')[1];
    if (addrP) addrP.textContent = resolvedAddress;
    const linkA = popupNode.querySelector('a');
    if (linkA) linkA.setAttribute('href', naverPlaceUrl);

    shopMarker.bindPopup(popupNode).openPopup();

    mapRef.current = map;
    shopMarkerRef.current = shopMarker;

    return () => {
      map.remove();
      mapRef.current = null;
      shopMarkerRef.current = null;
      originMarkerRef.current = null;
      routePolylineRef.current = null;
    };
  }, []);

  // Sync shop coordinates & popup address when updated
  useEffect(() => {
    const map = mapRef.current;
    const marker = shopMarkerRef.current;
    if (!map || !marker) return;
    marker.setLatLng([shopCoords.lat, shopCoords.lng]);
    if (!originLocation) {
      map.setView([shopCoords.lat, shopCoords.lng], 16);
    }
  }, [shopCoords, originLocation]);

  // Compute & draw fallback route when originLocation or travelMode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (!originLocation) {
      onRouteComputed(null);
      onRouteLoadingChange(false);
      return;
    }

    const originMarker = L.marker([originLocation.lat, originLocation.lng], {
      icon: createOriginPinIcon(originLabel),
    }).addTo(map);
    originMarkerRef.current = originMarker;

    let cancelled = false;
    onRouteError(null);
    onRouteLoadingChange(true);

    if (travelMode === 'TRANSIT') {
      onRouteLoadingChange(false);
      onRouteComputed(null);
      onRouteError(
        '대중교통 상세 경로는 상단 Google 지도 길찾기 버튼 또는 자동차·도보 탭을 이용해 주세요.'
      );
      const bounds = L.latLngBounds(
        [originLocation.lat, originLocation.lng],
        [shopCoords.lat, shopCoords.lng]
      );
      map.fitBounds(bounds, { padding: [52, 52], maxZoom: 17 });
      return () => {
        cancelled = true;
      };
    }

    fetchOsrmFallbackDirections(originLocation, shopCoords, travelMode)
      .then((result) => {
        if (cancelled) return;
        onRouteLoadingChange(false);

        const latLngs = result.path.map((pt) => [pt.lat, pt.lng] as [number, number]);
        const polyline = L.polyline(latLngs, {
          color: travelMode === 'WALKING' ? '#44403C' : '#9A7B4F',
          weight: travelMode === 'WALKING' ? 4 : 5,
          opacity: 0.92,
          dashArray: travelMode === 'WALKING' ? '6, 8' : undefined,
        }).addTo(map);
        routePolylineRef.current = polyline;

        const bounds = polyline.getBounds();
        bounds.extend([originLocation.lat, originLocation.lng]);
        bounds.extend([shopCoords.lat, shopCoords.lng]);
        map.fitBounds(bounds, { padding: [52, 52], maxZoom: 17 });

        onRouteComputed({
          distanceMeters: result.distanceMeters,
          durationMillis: result.durationMillis,
          steps: result.steps,
        });
      })
      .catch(() => {
        if (cancelled) return;
        onRouteLoadingChange(false);
        onRouteComputed(null);
        onRouteError('경로 계산에 실패했습니다. 출발지를 다시 선택하거나 잠시 후 시도해 주세요.');
      });

    return () => {
      cancelled = true;
    };
  }, [
    originLocation,
    originLabel,
    shopCoords,
    travelMode,
    onRouteComputed,
    onRouteError,
    onRouteLoadingChange,
  ]);

  return <div ref={containerRef} className="w-full h-full z-0" aria-label="쥬얼리아 매장 위치 지도" />;
}
