import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Meetup, NearbyLearner } from '@/types/meetup';

interface ExploreMapProps {
  meetups: Meetup[];
  learners: NearbyLearner[];
  onMeetupClick?: (meetup: Meetup) => void;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmxhbWVyIiwiYSI6ImNtam8wdHhxOTJ5NTEzZ3F4aDl3ZWo3a3YifQ.eRxSmSDlyopmOasm9-sHMw';

export default function ExploreMap({ meetups, learners, onMeetupClick }: ExploreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-73.98, 40.76], // NYC default
        zoom: 12,
        pitch: 20,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );

      map.current.on('load', () => {
        setIsMapReady(true);
      });

      return () => {
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        map.current?.remove();
        map.current = null;
        setIsMapReady(false);
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  }, []);

  // Add markers when map is ready
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add meetup markers
    meetups.forEach((meetup) => {
      if (!meetup.coordinates) return;

      const el = document.createElement('div');
      el.className = 'meetup-marker';
      el.innerHTML = `
        <div style="
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, hsl(142 76% 36%), hsl(142 71% 45%));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          cursor: pointer;
          font-size: 16px;
          border: 2px solid white;
        ">${meetup.languageFlag}</div>
      `;
      el.style.cursor = 'pointer';

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(`
          <div style="padding: 8px; font-family: system-ui;">
            <strong style="font-size: 14px;">${meetup.title}</strong>
            <p style="margin: 4px 0 0; font-size: 12px; color: #666;">
              ${meetup.participants.length}/${meetup.maxParticipants} joined
            </p>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([meetup.coordinates.lng, meetup.coordinates.lat])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('click', () => {
        onMeetupClick?.(meetup);
      });

      markersRef.current.push(marker);
    });

    // Add learner markers
    learners.forEach((learner) => {
      const el = document.createElement('div');
      el.className = 'learner-marker';
      el.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, hsl(262 83% 58%), hsl(280 65% 60%));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          font-size: 12px;
          font-weight: 600;
          color: white;
          border: 2px solid white;
        ">${learner.displayName[0]}</div>
      `;

      const languageFlags = learner.languages.learning
        .slice(0, 2)
        .map(l => l === 'Spanish' ? '🇪🇸' : l === 'French' ? '🇫🇷' : l === 'Japanese' ? '🇯🇵' : l === 'Korean' ? '🇰🇷' : l === 'German' ? '🇩🇪' : l === 'Italian' ? '🇮🇹' : l === 'English' ? '🇬🇧' : '🌐')
        .join(' ');

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false })
        .setHTML(`
          <div style="padding: 8px; font-family: system-ui;">
            <strong style="font-size: 14px;">${learner.displayName}</strong>
            <p style="margin: 4px 0 0; font-size: 12px; color: #666;">
              Learning: ${languageFlags}
            </p>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([learner.coordinates.lng, learner.coordinates.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (meetups.length > 0 || learners.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      meetups.forEach(m => m.coordinates && bounds.extend([m.coordinates.lng, m.coordinates.lat]));
      learners.forEach(l => bounds.extend([l.coordinates.lng, l.coordinates.lat]));
      
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [meetups, learners, isMapReady, onMeetupClick]);
  return (
    <div className="relative h-64 rounded-2xl overflow-hidden border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1 border border-border">
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
