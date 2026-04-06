import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';

export interface MapMarker {
  lat: number;
  lng: number;
  color?: string;
  size?: number;
  popup?: string;
  id?: string;
}

export interface MapPath {
  points: [number, number][];
  color?: string;
  weight?: number;
  dashArray?: string;
}

export interface MapPolygon {
  points: [number, number][];
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  markers?: MapMarker[];
  paths?: MapPath[];
  polygons?: MapPolygon[];
  autoLocate?: boolean;
  showLocateControl?: boolean;
  locateZoom?: number;
  onMarkerClick?: (id: string) => void;
  onMapReady?: (map: L.Map) => void;
}

export default function MapView({
  center = [38.9072, -77.0369],
  zoom = 13,
  className = '',
  markers = [],
  paths = [],
  polygons = [],
  autoLocate = true,
  showLocateControl = true,
  locateZoom = 14,
  onMarkerClick,
  onMapReady,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const userLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const updateUserLocationLayer = useCallback((lat: number, lng: number, accuracy?: number) => {
    const map = mapRef.current;
    const userLayer = userLayerGroupRef.current;
    if (!map || !userLayer) return;

    userLayer.clearLayers();

    const userIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;border-radius:50%;
        background:#2563eb;
        border:3px solid white;
        box-shadow:0 0 0 2px rgba(37,99,235,0.35);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    L.marker([lat, lng], { icon: userIcon }).addTo(userLayer).bindPopup('Your location');

    if (accuracy && Number.isFinite(accuracy)) {
      L.circle([lat, lng], {
        radius: accuracy,
        color: '#2563eb',
        fillColor: '#60a5fa',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(userLayer);
    }
  }, []);

  const locateUser = useCallback((recenter: boolean) => {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude, accuracy } = position.coords;
        updateUserLocationLayer(latitude, longitude, accuracy);
        if (recenter) {
          map.flyTo([latitude, longitude], Math.max(map.getZoom(), locateZoom), { duration: 0.6 });
        }
      },
      () => {
        // Ignore failures silently to avoid breaking map usage when location is denied.
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      },
    );
  }, [locateZoom, updateUserLocationLayer]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    userLayerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    if (showLocateControl) {
      const LocateControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: () => {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          const button = L.DomUtil.create('a', '', container);
          button.href = '#';
          button.title = 'Find my location';
          button.style.width = '30px';
          button.style.height = '30px';
          button.style.lineHeight = '30px';
          button.style.textAlign = 'center';
          button.style.fontWeight = 'bold';
          button.style.color = '#1f2937';
          button.innerHTML = '&#9678;';

          L.DomEvent.on(button, 'click', L.DomEvent.stopPropagation)
            .on(button, 'click', L.DomEvent.preventDefault)
            .on(button, 'click', () => locateUser(true));

          return container;
        },
      });

      map.addControl(new LocateControl());
    }

    // Fix Leaflet resize issues
    setTimeout(() => map.invalidateSize(), 100);

    if (autoLocate) {
      locateUser(true);
    }

    onMapReady?.(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      userLayerGroupRef.current = null;
    };
  }, [autoLocate, locateUser, onMapReady, showLocateControl, center, zoom]);

  // Update layers
  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // Polygons (draw first, behind markers)
    polygons.forEach(p => {
      L.polygon(p.points, {
        color: p.color || '#3b82f6',
        fillColor: p.fillColor || p.color || '#3b82f6',
        fillOpacity: p.fillOpacity ?? 0.15,
        weight: 2,
      }).addTo(group);
    });

    // Paths
    paths.forEach(p => {
      L.polyline(p.points, {
        color: p.color || '#8b5cf6',
        weight: p.weight || 3,
        opacity: 0.8,
        dashArray: p.dashArray,
      }).addTo(group);
    });

    // Markers
    markers.forEach(m => {
      const size = m.size || 14;
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${m.color || '#3b82f6'};
          border:2px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,0.35);
          cursor:pointer;
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(group);
      if (m.popup) marker.bindPopup(m.popup, { className: 'ecms-popup' });
      if (m.id && onMarkerClick) {
        marker.on('click', () => onMarkerClick(m.id!));
      }
    });
  }, [markers, paths, polygons, onMarkerClick]);

  return <div ref={containerRef} className={`w-full h-full min-h-[200px] ${className}`} />;
}
