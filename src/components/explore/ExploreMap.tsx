import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Meetup, NearbyLearner } from '@/types/meetup';
import { MapPin } from 'lucide-react';

interface ExploreMapProps {
  meetups: Meetup[];
  learners: NearbyLearner[];
  onMeetupClick?: (meetup: Meetup) => void;
}

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  'pk.eyJ1IjoiYmxhbWVyIiwiYSI6ImNtam8wdHhxOTJ5NTEzZ3F4aDl3ZWo3a3YifQ.eRxSmSDlyopmOasm9-sHMw';

export default function ExploreMap({ meetups, learners, onMeetupClick }: ExploreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Map already initialized

    if (!MAPBOX_TOKEN) {
      setMapError('Map token missing. Set VITE_MAPBOX_TOKEN.');
      return;
    }

    if (!mapboxgl.supported()) {
      setMapError('WebGL is not supported by your browser.');
      return;
    }


    try {
      // Clean container before initialization to prevent duplicates
      if (mapContainer.current) {
        mapContainer.current.innerHTML = '';
      }

      // Disable telemetry if possible
      const mbgl = mapboxgl as unknown as { setTelemetryEnabled?: (enabled: boolean) => void };
      if (mbgl.setTelemetryEnabled) {
        mbgl.setTelemetryEnabled(false);
      }

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/streets-v12', // Switched to standard style
        center: [-73.98, 40.76],
        zoom: 12,
        pitch: 0,
        preserveDrawingBuffer: true, // Re-enabled for stability
        failIfMajorPerformanceCaveat: false,
        attributionControl: false,
      });

      map.current = mapInstance;

      mapInstance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
      mapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

      mapInstance.on('load', () => {
        mapInstance.resize(); // Force resize to ensure rendering
        setIsMapReady(true);
        setMapError(null);
      });

      mapInstance.on('error', (e) => {
        const errorMsg = e.error?.message || '';
        if (errorMsg.includes('events.mapbox.com') || errorMsg.includes('ERR_BLOCKED')) return;
        console.error('[ExploreMap] Map error:', e);
      });

    } catch (error) {
      console.error('[ExploreMap] Failed to initialize map:', error);
      setMapError('Failed to initialize map. Please refresh.');
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setIsMapReady(false);
    };
  }, []); // Run once on mount

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
      el.innerHTML = `
        <div>${meetup.languageFlag || '📍'}</div>
      `;

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
      el.innerHTML = `
        <div>${learner.displayName[0]}</div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([learner.coordinates.lng, learner.coordinates.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds
    if (meetups.length > 0 || learners.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      meetups.forEach(m => m.coordinates && bounds.extend([m.coordinates.lng, m.coordinates.lat]));
      learners.forEach(l => bounds.extend([l.coordinates.lng, l.coordinates.lat]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [meetups, learners, isMapReady, onMeetupClick]);

  if (mapError) {
    return (
      <div className="relative h-80 rounded-2xl overflow-hidden border border-border bg-muted flex flex-col items-center justify-center gap-3">
        <MapPin className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center px-4">{mapError}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-border bg-muted/20">
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
      />
      {!isMapReady && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <div className="animate-pulse text-muted-foreground text-sm">Loading map...</div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1 border border-border z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-foreground">Meetups</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <span className="text-foreground">Learners</span>
        </div>
      </div>
    </div>
  );
}
