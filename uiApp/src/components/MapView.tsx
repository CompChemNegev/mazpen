import { useEffect, useRef } from 'react';
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
  onMarkerClick,
  onMapReady,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

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
    mapRef.current = map;

    // Fix Leaflet resize issues
    setTimeout(() => map.invalidateSize(), 100);

    onMapReady?.(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

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
