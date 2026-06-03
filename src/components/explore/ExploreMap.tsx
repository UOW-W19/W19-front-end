import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Meetup, NearbyLearner } from '@/types/meetup';
import type { CurrentWeather } from '@/services/api/weather';
import { getInitialMapboxToken, MAPBOX_TOKEN_STORAGE_KEY } from '@/lib/mapbox';
import { LocateFixed, MapPin, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExploreMapProps {
  meetups: Meetup[];
  learners: NearbyLearner[];
  onMeetupClick?: (meetup: Meetup) => void;
  onLearnerClick?: (learner: NearbyLearner) => void;
  userLocation?: { latitude: number; longitude: number };
  locationLabel?: string;
  isExtendedView?: boolean;
  currentWeather?: CurrentWeather;
  className?: string;
}

type LngLat = { lng: number; lat: number };

const DEFAULT_CENTER: LngLat = { lng: -73.98, lat: 40.76 };
const DEFAULT_ZOOM = 12;
const USER_FOCUS_ZOOM = 13;
const STACK_OFFSET_METERS = 12;
const METERS_PER_DEGREE_LAT = 111_320;

const isValidLngLat = (lng: unknown, lat: unknown): boolean => {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
  const Lng = lng as number;
  const Lat = lat as number;
  // Mapbox GL expects valid WGS84 ranges; clamp out clearly invalid values
  return Lng >= -180 && Lng <= 180 && Lat >= -85 && Lat <= 85;
};

type WebGLDiagnostics = {
  mapboxSupported: boolean | null;
  webgl2: boolean;
  webgl1: boolean;
};

type ErrorLike = {
  message?: string;
  status?: number;
  error?: {
    message?: string;
    status?: number;
  };
};

type MapboxTelemetryApi = typeof mapboxgl & {
  setTelemetryEnabled?: (enabled: boolean) => void;
  config?: {
    EVENTS_URL?: string;
  };
};

const getErrorInfo = (e: unknown): { message: string; status?: number } => {
  if (!e || typeof e !== 'object') {
    return { message: '' };
  }

  const err = e as ErrorLike;
  return {
    message: err.error?.message || err.message || '',
    status: err.error?.status ?? err.status,
  };
};

const detectWebGLSupport = (): { supported: boolean; diagnostics: WebGLDiagnostics } => {
  let mapboxSupported: boolean | null = null;
  try {
    mapboxSupported = typeof mapboxgl.supported === 'function' ? mapboxgl.supported() : null;
  } catch {
    mapboxSupported = null;
  }

  let webgl2 = false;
  let webgl1 = false;
  try {
    const canvas = document.createElement('canvas');
    webgl2 = !!canvas.getContext('webgl2');
    webgl1 = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    webgl2 = false;
    webgl1 = false;
  }

  // Mapbox GL JS requires WebGL (v2 can run on WebGL1; v3 requires WebGL2).
  const supported = mapboxSupported === true || webgl1 || webgl2;

  return {
    supported,
    diagnostics: { mapboxSupported, webgl2, webgl1 },
  };
};

const getAllCoordinates = (meetups: Meetup[], learners: NearbyLearner[]): LngLat[] => {
  const meetupCoords = meetups
    .map((m) => m.coordinates)
    .filter((c): c is { lng: number; lat: number } => !!c && Number.isFinite(c.lng) && Number.isFinite(c.lat))
    .map((c) => ({ lng: c.lng, lat: c.lat }));

  const learnerCoords = learners
    .map((l) => l.coordinates)
    .filter((c): c is { lng: number; lat: number } => !!c && Number.isFinite(c.lng) && Number.isFinite(c.lat))
    .map((c) => ({ lng: c.lng, lat: c.lat }));

  return [...meetupCoords, ...learnerCoords];
};

const computeCenterAndZoom = (coords: LngLat[]): { center: LngLat; zoom: number } => {
  if (!coords.length) return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };

  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const center: LngLat = {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
  };

  const span = Math.max(Math.abs(maxLat - minLat), Math.abs(maxLng - minLng));

  const zoom =
    span < 0.01 ? 14 :
      span < 0.03 ? 13 :
        span < 0.08 ? 12 :
          span < 0.2 ? 11 :
            span < 0.5 ? 10 :
              span < 1.0 ? 9 :
                8;

  return { center, zoom };
};

const markerStackKey = (lng: number, lat: number) =>
  `${lat.toFixed(5)}:${lng.toFixed(5)}`;

const offsetStackedCoordinate = (
  lng: number,
  lat: number,
  stackIndex: number
): [number, number] => {
  if (stackIndex === 0) return [lng, lat];

  const angle = ((stackIndex - 1) % 8) * (Math.PI / 4);
  const ring = Math.floor((stackIndex - 1) / 8) + 1;
  const distanceMeters = STACK_OFFSET_METERS * ring;
  const latOffset = (Math.sin(angle) * distanceMeters) / METERS_PER_DEGREE_LAT;
  const lngScale = METERS_PER_DEGREE_LAT * Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const lngOffset = (Math.cos(angle) * distanceMeters) / lngScale;

  return [lng + lngOffset, lat + latOffset];
};

const buildStaticMapUrl = ({
  meetups,
  learners,
  token,
}: {
  meetups: Meetup[];
  learners: NearbyLearner[];
  token: string;
}): string => {
  const coords = getAllCoordinates(meetups, learners);
  const { center, zoom } = computeCenterAndZoom(coords);

  const overlayParts: string[] = [];

  meetups.slice(0, 20).forEach((m) => {
    const c = m.coordinates;
    if (!c) return;
    overlayParts.push(`pin-s+2563eb(${c.lng.toFixed(5)},${c.lat.toFixed(5)})`);
  });

  learners.slice(0, 20).forEach((l) => {
    const c = l.coordinates;
    if (!c) return;
    overlayParts.push(`pin-s+f59e0b(${c.lng.toFixed(5)},${c.lat.toFixed(5)})`);
  });

  const overlay = overlayParts.length ? `${overlayParts.join(',')}/` : '';

  const width = 600;
  const height = 320;
  const style = 'mapbox/streets-v12';

  return `https://api.mapbox.com/styles/v1/${style}/static/${overlay}${center.lng.toFixed(5)},${center.lat.toFixed(5)},${zoom},0,0/${width}x${height}@2x?access_token=${encodeURIComponent(token)}`;
};

export default function ExploreMap({
  meetups,
  learners,
  onMeetupClick,
  onLearnerClick,
  userLocation,
  locationLabel,
  isExtendedView = false,
  currentWeather,
  className,
}: ExploreMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const userInteractedRef = useRef(false);
  const lastUserLngLatRef = useRef<LngLat | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [webglDiagnostics, setWebglDiagnostics] = useState<WebGLDiagnostics | null>(null);

  const origin = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  const [mapboxToken, setMapboxToken] = useState<string>(() => getInitialMapboxToken());
  const [tokenDraft, setTokenDraft] = useState('');
  const showCurrentLocationBadge = isExtendedView && !!userLocation;
  const CurrentWeatherIcon = currentWeather?.isDay ? Sun : Moon;
  const currentLocationLabel = locationLabel?.trim() || 'Current Location';
  const recenterButtonPosition = isExtendedView
    ? 'left-4 bottom-4 z-20'
    : 'left-3 top-3';
  const legendPosition = isExtendedView
    ? 'left-4 top-4 z-10'
    : 'left-3 bottom-3';

  const staticFallbackUrl = useMemo(() => {
    if (!mapError || !mapError.toLowerCase().includes('webgl')) return null;
    return buildStaticMapUrl({ meetups, learners, token: mapboxToken });
  }, [mapError, meetups, learners, mapboxToken]);

  const getFriendlyMapError = (e: unknown): string => {
    const { message: msg, status } = getErrorInfo(e);

    if (msg.includes('events.mapbox.com') || msg.includes('ERR_BLOCKED')) {
      return 'Map telemetry was blocked by your browser. (Safe to ignore; we already disable telemetry.)';
    }

    if (status === 401 || msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
      return 'Mapbox token is invalid (401). Paste a valid public token (pk.*) below.';
    }

    if (status === 403 || msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
      return `Mapbox blocked this domain (403). In your Mapbox token settings, allow: ${origin}`;
    }

    if (msg.includes('ERR_BLOCKED_BY_CLIENT') || msg.toLowerCase().includes('blocked')) {
      return 'The map request was blocked by a browser extension (ad blocker / shields). Try disabling it for this site.';
    }

    if (msg.toLowerCase().includes('webgl') && msg.toLowerCase().includes('not supported')) {
      return 'WebGL is not supported by your browser/device.';
    }

    if (msg.toLowerCase().includes('failed to fetch')) {
      return 'Network error while loading the map. Check your connection or VPN/ad blocker.';
    }

    return msg ? `Map failed to load: ${msg}` : 'Map failed to load. Please refresh.';
  };

  const saveToken = () => {
    const cleaned = tokenDraft.trim();
    if (!cleaned) return;

    localStorage.setItem(MAPBOX_TOKEN_STORAGE_KEY, cleaned);
    setMapboxToken(cleaned);
    setTokenDraft('');
    setMapError(null);
  };

  const recenterOnUser = () => {
    if (!map.current || !userLocation) return;
    if (!isValidLngLat(userLocation.longitude, userLocation.latitude)) return;

    userInteractedRef.current = false;
    hasCenteredOnUserRef.current = true;
    map.current.easeTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: Math.max(map.current.getZoom(), USER_FOCUS_ZOOM),
      duration: 650,
    });
  };

  // Initialize map (re-runs when token changes)
  useEffect(() => {
    setIsMapReady(false);
    userInteractedRef.current = false;
    hasCenteredOnUserRef.current = false;
    lastUserLngLatRef.current = null;

    if (!mapboxToken) {
      setMapError('Map token missing. Set VITE_MAPBOX_TOKEN or paste a token below.');
      return;
    }

    // Collect diagnostics but do NOT block map initialization.
    // In some embedded/preview environments, pre-checks can be false negatives.
    // We'll attempt to initialize Mapbox and rely on runtime errors if WebGL is truly unavailable.
    const { diagnostics } = detectWebGLSupport();
    setWebglDiagnostics(diagnostics);

    // Clear any previous map instance (helps with hot-reload + StrictMode)
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    const container = mapContainer.current;
    if (!container) {
      setMapError('Map container not found. Please refresh.');
      return;
    }

    let isCancelled = false;
    let mapInstance: mapboxgl.Map | null = null;

    // If the user starts interacting (zoom/pan), stop any pending camera animation
    // Only stop animations ONCE when user first interacts, not continuously
    const markUserInteracted = () => {
      if (!userInteractedRef.current) {
        userInteractedRef.current = true;
        try {
          mapInstance?.stop();
        } catch {
          // noop
        }
      }
    };

    try {
      // Clean container before initialization to prevent duplicates
      container.innerHTML = '';

      // Disable telemetry to prevent ad-blocker interference
      // Use try-catch as some properties may be read-only in newer versions
      try {
        const mbgl = mapboxgl as MapboxTelemetryApi;

        // Try to disable telemetry via the API method first (most reliable)
        if (typeof mbgl.setTelemetryEnabled === 'function') {
          mbgl.setTelemetryEnabled(false);
        }

        // Attempt to override EVENTS_URL (helps avoid ad-blocker interference)
        // In newer versions, config properties may be read-only getters
        if (mbgl?.config && typeof mbgl.config === 'object') {
          try {
            // Try direct assignment first
            mbgl.config.EVENTS_URL = '';
          } catch {
            // If that fails (read-only property), try Object.defineProperty
            try {
              Object.defineProperty(mbgl.config, 'EVENTS_URL', {
                value: '',
                writable: true,
                configurable: true
              });
            } catch {
              // If both fail, telemetry may still work via setTelemetryEnabled
              // This is not critical for map functionality
            }
          }
        }
      } catch (e) {
        // Telemetry configuration is optional; don't let it block map initialization
        console.warn('[ExploreMap] Could not fully disable telemetry (non-critical):', e);
      }

      mapboxgl.accessToken = mapboxToken;

      mapInstance = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-73.98, 40.76],
        zoom: 12,
        pitch: 0,
        preserveDrawingBuffer: true,
        failIfMajorPerformanceCaveat: false,
        attributionControl: false,
      });

      map.current = mapInstance;

      mapInstance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
      mapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

      const timeoutId = window.setTimeout(() => {
        if (isCancelled) return;
        if (!isMapReady) {
          setMapError(`Map is taking too long to load. If your token is restricted, allow: ${origin}`);
        }
      }, 12000);

      mapInstance.on('load', () => {
        window.clearTimeout(timeoutId);
        if (isCancelled) return;
        if (mapInstance) {
          mapInstance.resize();
        }
        setIsMapReady(true);
        setMapError(null);
      });

      mapInstance.on('wheel', markUserInteracted);
      mapInstance.on('mousedown', markUserInteracted);
      mapInstance.on('touchstart', markUserInteracted);
      mapInstance.on('dragstart', markUserInteracted);
      mapInstance.on('zoomstart', markUserInteracted);

      mapInstance.on('error', (evt) => {
        // Ignore telemetry noise
        const errorMsg = getErrorInfo(evt).message;
        if (errorMsg.includes('events.mapbox.com') || errorMsg.includes('ERR_BLOCKED')) return;

        console.error('[ExploreMap] Map error event:', evt);
        if (!isCancelled) {
          setMapError(getFriendlyMapError(evt));
        }
      });

    } catch (error) {
      console.error('[ExploreMap] Failed to initialize map:', error);
      if (!isCancelled) {
        setMapError(getFriendlyMapError(error));
      }
    }

    // Resize handler for container size changes
    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    // Use ResizeObserver for container-specific size changes
    let resizeObserver: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (map.current) {
          // Small delay to ensure layout has settled
          requestAnimationFrame(() => {
            map.current?.resize();
          });
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      try {
        mapInstance?.off('wheel', markUserInteracted);
        mapInstance?.off('mousedown', markUserInteracted);
        mapInstance?.off('touchstart', markUserInteracted);
        mapInstance?.off('dragstart', markUserInteracted);
        mapInstance?.off('zoomstart', markUserInteracted);
      } catch {
        // noop
      }
      mapInstance?.remove();
      if (map.current === mapInstance) {
        map.current = null;
      }
      setIsMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken, origin]);

  // Update markers
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    const stackCounts = new Map<string, number>();

    const nextMarkerLngLat = (lng: number, lat: number): [number, number] => {
      const key = markerStackKey(lng, lat);
      const stackIndex = stackCounts.get(key) ?? 0;
      stackCounts.set(key, stackIndex + 1);
      return offsetStackedCoordinate(lng, lat, stackIndex);
    };

    // Add meetup markers
    meetups.forEach((meetup) => {
      if (!meetup.coordinates) return;
      if (!isValidLngLat(meetup.coordinates.lng, meetup.coordinates.lat)) return;

      const el = document.createElement('div');
      el.className = 'meetup-marker w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg border-2 border-white text-base cursor-pointer';
      el.innerHTML = `<span class="text-lg">${meetup.language.flagEmoji || '📍'}</span>`;

      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onMeetupClick?.(meetup);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat(nextMarkerLngLat(meetup.coordinates.lng, meetup.coordinates.lat))
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Add learner markers
    learners.forEach((learner) => {
      if (!learner.coordinates) return;
      if (!isValidLngLat(learner.coordinates.lng, learner.coordinates.lat)) return;

      const el = document.createElement('div');
      el.className = 'learner-marker w-8 h-8 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center shadow-md border-2 border-white text-white text-xs font-semibold overflow-hidden';

      if (learner.avatarUrl) {
        const img = document.createElement('img');
        img.src = learner.avatarUrl;
        img.alt = learner.displayName;
        img.className = 'h-full w-full rounded-full object-cover';
        el.appendChild(img);
      } else {
        const fallback = document.createElement('span');
        fallback.textContent = learner.displayName[0]?.toUpperCase() ?? 'U';
        el.appendChild(fallback);
      }

      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onLearnerClick?.(learner);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat(nextMarkerLngLat(learner.coordinates.lng, learner.coordinates.lat))
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // NOTE: We intentionally do NOT call fitBounds here when userLocation exists.
    // fitBounds will often zoom way out ("whole globe") if any marker has bad coords
    // or if markers are geographically far apart.
    // User centering is handled by the userLocation effect below.
    if (!userLocation) {
      const bounds = new mapboxgl.LngLatBounds();

      meetups.forEach((m) => {
        const c = m.coordinates;
        if (!c) return;
        if (!isValidLngLat(c.lng, c.lat)) return;
        bounds.extend([c.lng, c.lat]);
      });

      learners.forEach((l) => {
        const c = l.coordinates;
        if (!c) return;
        if (!isValidLngLat(c.lng, c.lat)) return;
        bounds.extend([c.lng, c.lat]);
      });

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    }
  }, [meetups, learners, isMapReady, onMeetupClick, onLearnerClick, userLocation]);

  // Add/update user location marker
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    if (!userLocation) {
      hasCenteredOnUserRef.current = false;
      lastUserLngLatRef.current = null;
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }
    if (!isValidLngLat(userLocation.longitude, userLocation.latitude)) return;

    const next: LngLat = { lng: userLocation.longitude, lat: userLocation.latitude };
    const prev = lastUserLngLatRef.current;
    const changed =
      !prev ||
      Math.abs(prev.lng - next.lng) > 1e-7 ||
      Math.abs(prev.lat - next.lat) > 1e-7;
    lastUserLngLatRef.current = next;

    // Create user location marker with pulsing effect
    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'user-location-marker relative';
      el.innerHTML = `
        <div class="absolute inset-0 w-6 h-6 bg-blue-500/30 rounded-full animate-ping"></div>
        <div class="relative w-6 h-6 bg-blue-500 rounded-full border-2 border-background shadow-lg flex items-center justify-center">
          <div class="w-2 h-2 bg-background rounded-full"></div>
        </div>
      `;

      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([next.lng, next.lat])
        .addTo(map.current);
    } else if (changed) {
      userMarkerRef.current.setLngLat([next.lng, next.lat]);
    }

    // Only center on user ONCE when location first becomes available
    if (!hasCenteredOnUserRef.current && !userInteractedRef.current) {
      hasCenteredOnUserRef.current = true;
      map.current.easeTo({
        center: [next.lng, next.lat],
        zoom: Math.max(map.current.getZoom(), USER_FOCUS_ZOOM),
        duration: 650,
      });
    }
  }, [userLocation, isMapReady]);

  if (mapError) {
    return (
      <div className={`${className ?? 'h-80 w-full rounded-2xl border border-border'} overflow-hidden bg-muted flex items-center justify-center`}>
        <div className="text-center p-4 w-full max-w-md">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{mapError}</p>

          {(mapError.toLowerCase().includes('webgl') || mapError.toLowerCase().includes('context')) &&
            webglDiagnostics && (
              <div className="mt-3 rounded-lg border border-border bg-background/70 px-3 py-2 text-left text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Diagnostics</p>
                <p className="mt-1 font-mono">
                  mapboxSupported: {String(webglDiagnostics.mapboxSupported)}
                  <br />
                  webgl2: {String(webglDiagnostics.webgl2)}
                  <br />
                  webgl1: {String(webglDiagnostics.webgl1)}
                </p>
                {!webglDiagnostics.webgl1 && !webglDiagnostics.webgl2 && (
                  <p className="mt-2">
                    Note: Interactive maps require <span className="font-medium">WebGL</span>. If WebGL stays
                    false, enable hardware acceleration in your browser.
                  </p>
                )}
                <p className="mt-2">
                  Test here:{' '}
                  <a
                    href="https://get.webgl.org"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    get.webgl.org
                  </a>
                </p>
              </div>
            )}

          {staticFallbackUrl && (
            <div className="mt-4">
              <img
                src={staticFallbackUrl}
                alt="Static map preview of meetups and nearby learners"
                className="w-full h-40 rounded-lg object-cover border border-border"
                loading="lazy"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Showing a static preview because interactive maps require WebGL.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <Input
              value={tokenDraft}
              onChange={(e) => setTokenDraft(e.target.value)}
              placeholder="Paste Mapbox public token (pk.*)"
              className="bg-background"
            />
            <div className="flex gap-2 justify-center">
              <Button type="button" variant="default" onClick={saveToken} disabled={!tokenDraft.trim()}>
                Save token
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  localStorage.removeItem(MAPBOX_TOKEN_STORAGE_KEY);
                  setMapboxToken(getInitialMapboxToken());
                  setMapError(null);
                }}
              >
                Reset
              </Button>
            </div>
            {origin && (
              <p className="text-xs text-muted-foreground">
                Current origin: <span className="font-mono">{origin}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className ? `locale-explore-map ${className}` : 'locale-explore-map relative h-80 w-full rounded-2xl overflow-hidden border border-border'}>
      <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

      <style>{`
        .locale-explore-map .mapboxgl-ctrl-top-right {
          top: 3.75rem;
          right: 0.75rem;
        }
        .locale-explore-map .mapboxgl-ctrl-top-right .mapboxgl-ctrl {
          margin: 0;
        }
      `}</style>

      {!isMapReady && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading map...</div>
        </div>
      )}

      {showCurrentLocationBadge && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-10 flex w-[min(13rem,calc(100%-6rem))] -translate-x-1/2 flex-col items-center">
          <div className="w-full rounded-full border border-foreground/10 bg-white px-4 py-2 text-center text-sm font-semibold text-foreground shadow-lg shadow-black/20 backdrop-blur-sm">
            <span className="block truncate">{currentLocationLabel}</span>
          </div>
          {currentWeather && (
            <div className="mt-2 flex min-h-10 items-center justify-center gap-4 px-4 py-1 text-foreground drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
              <CurrentWeatherIcon
                className={`h-6 w-6 ${currentWeather.isDay ? 'text-yellow-400' : 'text-blue-900'}`}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap text-base font-semibold">
                {Math.round(currentWeather.temperatureC)}&deg; C
              </span>
            </div>
          )}
        </div>
      )}

      {userLocation && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={recenterOnUser}
          disabled={!isMapReady}
          className={`absolute ${recenterButtonPosition} h-10 w-10 rounded-full border border-foreground/20 bg-white text-purple shadow-lg shadow-black/20 backdrop-blur-sm hover:bg-white hover:text-purple focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 disabled:opacity-60`}
          aria-label="Recenter map on your location"
          title="Recenter map on your location"
        >
          <LocateFixed className="h-4 w-4" />
        </Button>
      )}

      {/* Legend */}
      <div className={`absolute ${legendPosition} pointer-events-none`}>
        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 flex gap-4 text-xs pointer-events-auto">
          {userLocation && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>You</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Meetups</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span>Learners</span>
          </div>
        </div>
      </div>
    </div>
  );
}
