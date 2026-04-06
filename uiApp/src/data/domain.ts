export interface Scenario {
  id: string;
  name: string;
  type: 'drill' | 'real_event' | 'training' | 'other';
  description: string | null;
  created_at: string;
}

export interface MeasurementTypeInfo {
  id: string;
  name: string;
  unit: string;
}

export interface Instrument {
  id: string;
  name: string;
  type: string;
  calibration_date: string | null;
}

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface Measurement {
  id: string;
  scenario_id: string;
  timestamp: string;
  location: GeoJSONPoint | null;
  measurement_type_id: string;
  value: number;
  unit: string;
  instrument_id: string;
  mission_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  measurement_type: MeasurementTypeInfo;
  instrument: Instrument;
}

export interface Mission {
  id: string;
  scenario_id: string;
  name: string;
  description: string | null;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  target_area: GeoJSONPolygon | null;
  created_at: string;
}

export interface Visitor {
  id: string;
  scenario_id: string;
  created_at: string;
  demographics: Record<string, any>;
  tags: string[];
}

export interface BodyMeasurement {
  id: string;
  visitor_id: string;
  timestamp: string;
  type: string;
  value: number;
  unit: string;
}

export type Severity = 'safe' | 'warning' | 'danger';

const SEVERITY_THRESHOLDS: Record<string, [number, number]> = {
  radiation: [1, 4],
  air_quality: [50, 150],
  water: [1, 5],
  soil: [100, 500],
  noise: [70, 90],
};

export function getSeverity(m: Measurement): Severity {
  const thresholds = SEVERITY_THRESHOLDS[m.measurement_type?.name] || [1, 10];
  if (m.value >= thresholds[1]) return 'danger';
  if (m.value >= thresholds[0]) return 'warning';
  return 'safe';
}

export function getLat(m: Measurement): number {
  return m.location?.coordinates[1] ?? 0;
}

export function getLng(m: Measurement): number {
  return m.location?.coordinates[0] ?? 0;
}

export function getMeasurementStatus(m: Measurement): string {
  return (m.metadata?.status as string) ?? 'pending';
}

export function getVisitorName(v: Visitor): string {
  return v.demographics?.name ?? 'Unknown';
}

export function getVisitorStatus(v: Visitor): string {
  if (v.tags?.includes('flagged')) return 'flagged';
  if (v.tags?.includes('under_observation')) return 'under_observation';
  return 'cleared';
}

export function missionAreaToLatLng(m: Mission): [number, number][] {
  if (!m.target_area?.coordinates?.[0]) return [];
  return m.target_area.coordinates[0].map(c => [c[1], c[0]] as [number, number]);
}

export const TYPE_LABELS: Record<string, string> = {
  radiation: 'Radiation',
  air_quality: 'Air Quality',
  water: 'Water Contamination',
  soil: 'Soil Contamination',
  noise: 'Noise Level',
};

export const UNIT_MAP: Record<string, string> = {
  radiation: '\u03bcSv/h',
  air_quality: 'AQI',
  water: 'ppm',
  soil: 'Bq/kg',
  noise: 'dB',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  safe: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export const MAP_CENTER: [number, number] = [38.9072, -77.0369];
