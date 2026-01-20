import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Meetup, NearbyLearner } from '@/types/meetup';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExploreMapProps {
  meetups: Meetup[];
  learners: NearbyLearner[];
  onMeetupClick?: (meetup: Meetup) => void;
}

const MAPBOX_TOKEN_STORAGE_KEY = 'locale_mapbox_token';

const FALLBACK_MAPBOX_TOKEN =
  'pk.eyJ1IjoiYmxhbWVyIiwiYSI6ImNtam8wdHhxOTJ5NTEzZ3F4aDl3ZWo3a3YifQ.eRxSmSDlyopmOasm9-sHMw';

type LngLat = { lng: number; lat: number };

const DEFAULT_CENTER: LngLat = { lng: -73.98, lat: 40.76 };
const DEFAULT_ZOOM = 12;

const getInitialMapboxToken = (): string => {
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const storedToken = typeof window !== 'undefined'
    ? localStorage.getItem(MAPBOX_TOKEN_STORAGE_KEY)
    : null;

  return envToken || storedToken || FALLBACK_MAPBOX_TOKEN;
};

const isWebGLSupported = (): boolean => {
  try {
    return typeof mapboxgl.supported === 'function' ? mapboxgl.supported() : true;
  } catch {
    return false;
  }
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

export default function ExploreMap({ meetups, learners, onMeetupClick }: ExploreMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const origin = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  const [mapboxToken, setMapboxToken] = useState<string>(() => getInitialMapboxToken());
  const [tokenDraft, setTokenDraft] = useState('');

  const staticFallbackUrl = useMemo(() => {
    if (!mapError || !mapError.toLowerCase().includes('webgl')) return null;
    return buildStaticMapUrl({ meetups, learners, token: mapboxToken });
  }, [mapError, meetups, learners, mapboxToken]);

  const getFriendlyMapError = (e: unknown): string => {
    const err = e as any;
    const msg: string = err?.error?.message || err?.message || '';
    const status: number | undefined = err?.error?.status ?? err?.status;

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

  // Initialize map (re-runs when token changes)
  useEffect(() => {
    setIsMapReady(false);

    if (!mapboxToken) {
      setMapError('Map token missing. Set VITE_MAPBOX_TOKEN or paste a token below.');
      return;
    }

    if (!isWebGLSupported()) {
      setMapError('WebGL is not supported by your browser/device.');
      return;
    }

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

    try {
      // Clean container before initialization to prevent duplicates
      container.innerHTML = '';

      // Disable telemetry to prevent ad-blocker interference
      (mapboxgl as any).config = (mapboxgl as any).config || {};
      (mapboxgl as any).config.EVENTS_URL = '';

      const mbgl = mapboxgl as unknown as { setTelemetryEnabled?: (enabled: boolean) => void };
      if (mbgl.setTelemetryEnabled) {
        mbgl.setTelemetryEnabled(false);
      }

      mapboxgl.accessToken = mapboxToken;

      const mapInstance = new mapboxgl.Map({
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
        mapInstance.resize();
        setIsMapReady(true);
        setMapError(null);
      });

      mapInstance.on('error', (evt) => {
        // Ignore telemetry noise
        const errorMsg = (evt as any)?.error?.message || '';
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

    return () => {
      isCancelled = true;
      if (map.current) {
        map.current.remove();
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

    // Add meetup markers
    meetups.forEach((meetup) => {
      if (!meetup.coordinates) return;

      const el = document.createElement('div');
      el.className = 'meetup-marker w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg border-2 border-white text-base cursor-pointer';
      el.innerHTML = `<span class="text-lg">${meetup.language.flagEmoji || '📍'}</span>`;

      el.addEventListener('click', () => onMeetupClick?.(meetup));

      const marker = new mapboxgl.Marker(el)
        .setLngLat([meetup.coordinates.lng, meetup.coordinates.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Add learner markers
    learners.forEach((learner) => {
      const el = document.createElement('div');
      el.className = 'learner-marker w-8 h-8 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center shadow-md border-2 border-white text-white text-xs font-semibold';
      el.innerHTML = `<span>${learner.displayName[0]}</span>`;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([learner.coordinates.lng, learner.coordinates.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds only if we have valid coordinates
    const bounds = new mapboxgl.LngLatBounds();
    meetups.forEach(m => m.coordinates && bounds.extend([m.coordinates.lng, m.coordinates.lat]));
    learners.forEach(l => l.coordinates && bounds.extend([l.coordinates.lng, l.coordinates.lat]));
    
    // Only fit bounds if they are valid (not empty)
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [meetups, learners, isMapReady, onMeetupClick]);

  if (mapError) {
    return (
      <div className="h-80 w-full rounded-2xl overflow-hidden border border-border bg-muted flex items-center justify-center">
        <div className="text-center p-4 w-full max-w-md">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{mapError}</p>

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
    <div className="relative h-80 w-full rounded-2xl overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />

      {!isMapReady && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading map...</div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 flex gap-4 text-xs">
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
  );
}
