// ── Types matching API schemas ─────────────────────────────

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
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface Label {
  id: string;
  scenario_id: string;
  name: string;
  description: string | null;
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

export interface MissionAssignment {
  id: string;
  mission_id: string;
  instrument_id: string;
  assigned_at: string;
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

export interface VisitorTrack {
  id: string;
  visitor_id: string;
  geom: GeoJSONPoint | null;
  recorded_at: string;
  label?: string;
}

export interface Alert {
  id: string;
  type: 'threshold_breach' | 'equipment_failure' | 'team_sos' | 'new_hazard';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  read: boolean;
}

// ── Helpers ────────────────────────────────────────────────

export type Severity = 'safe' | 'warning' | 'danger';
export type MeasurementTypeName = 'radiation' | 'air_quality' | 'water' | 'soil' | 'noise';

const SEVERITY_THRESHOLDS: Record<string, [number, number]> = {
  radiation: [1, 4],
  air_quality: [50, 150],
  water: [1, 5],
  soil: [100, 500],
  noise: [70, 90],
};

export function getSeverity(m: Measurement): Severity {
  const t = SEVERITY_THRESHOLDS[m.measurement_type?.name] || [1, 10];
  if (m.value >= t[1]) return 'danger';
  if (m.value >= t[0]) return 'warning';
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

export function trackLat(t: VisitorTrack): number {
  return t.geom?.coordinates[1] ?? 0;
}

export function trackLng(t: VisitorTrack): number {
  return t.geom?.coordinates[0] ?? 0;
}

// ── Display maps ───────────────────────────────────────────

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

// ── Center point ───────────────────────────────────────────
export const MAP_CENTER: [number, number] = [38.9072, -77.0369];

// ── Reference data ─────────────────────────────────────────
const SC = 'SC-001';

const INSTRUMENTS: Record<string, Instrument> = {
  ALPHA:   { id: 'ALPHA',   name: 'Alpha Team',   type: 'field_kit', calibration_date: null },
  BRAVO:   { id: 'BRAVO',   name: 'Bravo Team',   type: 'field_kit', calibration_date: null },
  CHARLIE: { id: 'CHARLIE', name: 'Charlie Team', type: 'field_kit', calibration_date: null },
  DELTA:   { id: 'DELTA',   name: 'Delta Team',   type: 'field_kit', calibration_date: null },
  ECHO:    { id: 'ECHO',    name: 'Echo Team',    type: 'field_kit', calibration_date: null },
};

const MT: Record<string, MeasurementTypeInfo> = {
  radiation:    { id: 'MT-RAD',   name: 'radiation',    unit: '\u03bcSv/h' },
  air_quality:  { id: 'MT-AQ',    name: 'air_quality',  unit: 'AQI' },
  water:        { id: 'MT-WAT',   name: 'water',        unit: 'ppm' },
  soil:         { id: 'MT-SOIL',  name: 'soil',         unit: 'Bq/kg' },
  noise:        { id: 'MT-NOISE', name: 'noise',        unit: 'dB' },
};

function pt(lat: number, lng: number): GeoJSONPoint {
  return { type: 'Point', coordinates: [lng, lat] };
}

function poly(points: [number, number][]): GeoJSONPolygon {
  const ring = points.map(([lat, lng]) => [lng, lat] as [number, number]);
  if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push([...ring[0]] as [number, number]);
  }
  return { type: 'Polygon', coordinates: [ring] };
}

function meas(
  id: string, instKey: string, typeKey: string, value: number,
  lat: number, lng: number, timestamp: string, notes: string,
  status: string = 'pending', missionId: string | null = null,
): Measurement {
  const instrument = INSTRUMENTS[instKey];
  const mt = MT[typeKey];
  return {
    id, scenario_id: SC, timestamp, location: pt(lat, lng),
    measurement_type_id: mt.id, value, unit: mt.unit,
    instrument_id: instrument.id, mission_id: missionId,
    metadata: { notes, status }, created_at: timestamp,
    measurement_type: mt, instrument,
  };
}

// ── Scenarios ──────────────────────────────────────────────
export const scenarios: Scenario[] = [
  { id: 'SC-001', name: 'operation-clearwater', type: 'real_event', description: 'Chemical Spill \u2013 Potomac River Basin', created_at: '2026-04-02T08:30:00Z' },
  { id: 'SC-002', name: 'station-7-containment', type: 'real_event', description: 'Radiation Leak \u2013 Bethesda Research Facility', created_at: '2026-04-03T14:15:00Z' },
  { id: 'SC-003', name: 'hurricane-delta-response', type: 'drill', description: 'Hurricane Aftermath \u2013 Chesapeake Bay Area', created_at: '2026-03-28T06:00:00Z' },
];

// ── Instruments ────────────────────────────────────────────
export const instruments: Instrument[] = Object.values(INSTRUMENTS);

// ── Measurement Types ──────────────────────────────────────
export const measurementTypesList: MeasurementTypeInfo[] = Object.values(MT);

// ── Measurements ───────────────────────────────────────────
export const measurements: Measurement[] = [
  meas('M-001','ALPHA','radiation',0.15,38.912,-77.042,'2026-04-05T06:12:00Z','Background levels normal at perimeter checkpoint A.','verified'),
  meas('M-002','ALPHA','radiation',1.2,38.905,-77.030,'2026-04-05T06:45:00Z','Elevated readings near drainage outlet. Recommend follow-up.','verified'),
  meas('M-003','BRAVO','radiation',4.8,38.918,-77.050,'2026-04-05T07:20:00Z','HIGH READING \u2013 50m from facility east wall. Area cordoned.','flagged'),
  meas('M-004','ALPHA','air_quality',42,38.895,-77.025,'2026-04-05T07:00:00Z','Air quality good in residential zone.','verified'),
  meas('M-005','BRAVO','air_quality',128,38.910,-77.060,'2026-04-05T08:15:00Z','Unhealthy for sensitive groups. Downwind from site.','verified'),
  meas('M-006','DELTA','air_quality',245,38.920,-77.035,'2026-04-05T08:45:00Z','Very unhealthy. Evacuation advisory issued for sector 4.','verified'),
  meas('M-007','CHARLIE','water',0.3,38.900,-77.045,'2026-04-05T06:30:00Z','Water sample from municipal supply \u2013 within limits.','verified'),
  meas('M-008','DELTA','water',3.7,38.908,-77.055,'2026-04-05T09:00:00Z','Elevated contaminants in creek downstream of spill site.','pending'),
  meas('M-009','BRAVO','water',9.4,38.915,-77.040,'2026-04-05T09:30:00Z','CRITICAL \u2013 Direct runoff sample. Do not consume advisory.','flagged'),
  meas('M-010','ALPHA','soil',45,38.903,-77.020,'2026-04-04T14:00:00Z','Soil sample from park \u2013 background levels.','verified'),
  meas('M-011','DELTA','soil',380,38.912,-77.048,'2026-04-04T15:30:00Z','Moderately contaminated. Flagged for remediation assessment.','pending'),
  meas('M-012','BRAVO','soil',820,38.925,-77.038,'2026-04-04T16:00:00Z','Heavy contamination in agricultural plot. Immediate action needed.','flagged'),
  meas('M-013','CHARLIE','noise',52,38.898,-77.033,'2026-04-05T10:00:00Z','Normal ambient noise at residential area.','verified'),
  meas('M-014','ECHO','noise',81,38.907,-77.052,'2026-04-05T10:30:00Z','Elevated noise from cleanup equipment operations.','pending'),
  meas('M-015','DELTA','noise',98,38.922,-77.028,'2026-04-05T11:00:00Z','Hazardous noise level near demolition site. PPE required.','verified'),
  meas('M-016','ALPHA','radiation',0.85,38.910,-77.042,'2026-04-05T11:30:00Z','Slightly elevated. Monitoring point #7.','pending'),
  meas('M-017','CHARLIE','air_quality',38,38.902,-77.038,'2026-04-05T12:00:00Z','Upwind sector clear.','verified'),
  meas('M-018','DELTA','water',2.4,38.916,-77.045,'2026-04-05T12:30:00Z','Secondary water source showing mild contamination.','pending'),
  meas('M-019','BRAVO','radiation',5.2,38.899,-77.055,'2026-04-05T13:00:00Z','HOT SPOT identified at storm drain. Decon team requested.','flagged'),
  meas('M-020','ALPHA','soil',210,38.913,-77.032,'2026-04-05T13:30:00Z','Moderate contamination spreading east from primary site.','pending'),
];

// ── Missions ───────────────────────────────────────────────
export const missions: Mission[] = [
  {
    id: 'MSN-001', scenario_id: SC, name: 'Riverside Survey', status: 'active',
    description: 'Complete water and soil sampling along 3km stretch of Potomac riverbank. Document any visible contamination.',
    target_area: poly([[38.905,-77.050],[38.905,-77.030],[38.915,-77.030],[38.915,-77.050]]),
    created_at: '2026-04-05T06:00:00Z',
  },
  {
    id: 'MSN-002', scenario_id: SC, name: 'Zone 3 Perimeter Scan', status: 'active',
    description: 'Radiation survey of 500m exclusion zone perimeter. Mark any readings above 2 \u03bcSv/h for decontamination.',
    target_area: poly([[38.916,-77.055],[38.916,-77.045],[38.926,-77.045],[38.926,-77.055]]),
    created_at: '2026-04-05T07:00:00Z',
  },
  {
    id: 'MSN-003', scenario_id: SC, name: 'Water Treatment Assessment', status: 'planned',
    description: 'Inspect municipal water treatment facility. Test intake, processing, and output water samples.',
    target_area: poly([[38.895,-77.040],[38.895,-77.025],[38.902,-77.025],[38.902,-77.040]]),
    created_at: '2026-04-06T08:00:00Z',
  },
  {
    id: 'MSN-004', scenario_id: SC, name: 'Residential Clearance', status: 'completed',
    description: 'Door-to-door radiation screening in Sector 2 residential area. Issue clearance certificates.',
    target_area: poly([[38.900,-77.025],[38.900,-77.015],[38.908,-77.015],[38.908,-77.025]]),
    created_at: '2026-04-03T09:00:00Z',
  },
  {
    id: 'MSN-005', scenario_id: SC, name: 'Air Quality Grid Mapping', status: 'planned',
    description: 'Deploy portable AQI sensors at 12 grid points across the monitoring zone. Collect 24hr baseline data.',
    target_area: poly([[38.910,-77.065],[38.910,-77.050],[38.925,-77.050],[38.925,-77.065]]),
    created_at: '2026-04-07T06:00:00Z',
  },
];

// ── Visitors ───────────────────────────────────────────────
export const visitors: Visitor[] = [
  {
    id: 'V-001', scenario_id: SC, created_at: '2026-04-03T08:00:00Z',
    demographics: { name: 'Maria Chen', age: 34, contact: '+1-202-555-0147', id_number: 'DC-8834721', exposure_reading: 0.08, vital_signs: { bp: '120/80', hr: 72, temp: 36.6 }, notes: 'Resident of Sector 1. No direct exposure. Cleared after screening.' },
    tags: ['cleared'],
  },
  {
    id: 'V-002', scenario_id: SC, created_at: '2026-04-03T07:00:00Z',
    demographics: { name: 'James Okafor', age: 45, contact: '+1-202-555-0298', id_number: 'DC-5521034', exposure_reading: 0.32, vital_signs: { bp: '135/88', hr: 84, temp: 36.8 }, notes: 'Works near facility perimeter. Mild exposure detected. 48hr monitoring.' },
    tags: ['under_observation'],
  },
  {
    id: 'V-003', scenario_id: SC, created_at: '2026-04-02T06:30:00Z',
    demographics: { name: 'Sarah Mitchell', age: 28, contact: '+1-202-555-0412', id_number: 'DC-7712905', exposure_reading: 1.15, vital_signs: { bp: '142/92', hr: 96, temp: 37.2 }, notes: 'Was jogging along river trail during initial spill. Significant exposure. Referred to medical.' },
    tags: ['flagged'],
  },
  {
    id: 'V-004', scenario_id: SC, created_at: '2026-04-04T10:00:00Z',
    demographics: { name: 'Robert Pham', age: 52, contact: '+1-202-555-0633', id_number: 'DC-3348291', exposure_reading: 0.05, vital_signs: { bp: '118/76', hr: 68, temp: 36.5 }, notes: 'Visiting from out of state. Was in safe zone entire time.' },
    tags: ['cleared'],
  },
  {
    id: 'V-005', scenario_id: SC, created_at: '2026-04-03T07:30:00Z',
    demographics: { name: 'Elena Vasquez', age: 41, contact: '+1-202-555-0891', id_number: 'DC-6639482', exposure_reading: 0.45, vital_signs: { bp: '128/82', hr: 78, temp: 36.7 }, notes: 'School teacher. Was outdoors during plume passage. Monitoring for 24hrs.' },
    tags: ['under_observation'],
  },
  {
    id: 'V-006', scenario_id: SC, created_at: '2026-04-04T09:00:00Z',
    demographics: { name: 'David Kim', age: 67, contact: '+1-202-555-0155', id_number: 'DC-1192847', exposure_reading: 0.12, vital_signs: { bp: '148/94', hr: 88, temp: 36.4 }, notes: 'Elderly resident. Pre-existing hypertension. Cleared but referred for follow-up.' },
    tags: ['cleared'],
  },
  {
    id: 'V-007', scenario_id: SC, created_at: '2026-04-02T09:00:00Z',
    demographics: { name: 'Aisha Rahman', age: 31, contact: '+1-202-555-0774', id_number: 'DC-4457190', exposure_reading: 0.62, vital_signs: { bp: '130/85', hr: 82, temp: 37.0 }, notes: 'First responder \u2013 paramedic. Entered zone without full PPE initially.' },
    tags: ['under_observation'],
  },
  {
    id: 'V-008', scenario_id: SC, created_at: '2026-04-04T08:00:00Z',
    demographics: { name: 'Thomas Wright', age: 39, contact: '+1-202-555-0521', id_number: 'DC-8823156', exposure_reading: 0.21, vital_signs: { bp: '122/78', hr: 74, temp: 36.6 }, notes: 'Journalist covering the incident. Was at press area only.' },
    tags: ['cleared'],
  },
];

// ── Visitor Tracks (mock) ──────────────────────────────────
function trk(vid: string, lat: number, lng: number, time: string, label: string): VisitorTrack {
  return { id: vid + '-T-' + Date.parse(time), visitor_id: vid, geom: pt(lat, lng), recorded_at: time, label };
}

export const visitorTracks: Record<string, VisitorTrack[]> = {
  'V-001': [
    trk('V-001',38.9020,-77.0380,'2026-04-03T08:00:00Z','Home \u2013 1423 Oak St'),
    trk('V-001',38.9050,-77.0320,'2026-04-03T09:30:00Z','Grocery Store'),
    trk('V-001',38.9080,-77.0350,'2026-04-03T11:00:00Z','Community Center'),
    trk('V-001',38.9020,-77.0380,'2026-04-03T13:00:00Z','Home \u2013 1423 Oak St'),
  ],
  'V-002': [
    trk('V-002',38.9120,-77.0480,'2026-04-03T07:00:00Z','Home \u2013 892 Pine Ave'),
    trk('V-002',38.9170,-77.0490,'2026-04-03T08:00:00Z','Workplace \u2013 Industrial Park'),
    trk('V-002',38.9180,-77.0500,'2026-04-03T12:00:00Z','Near Facility East Wall'),
    trk('V-002',38.9170,-77.0490,'2026-04-03T13:00:00Z','Workplace \u2013 Industrial Park'),
    trk('V-002',38.9120,-77.0480,'2026-04-03T18:00:00Z','Home \u2013 892 Pine Ave'),
  ],
  'V-003': [
    trk('V-003',38.9000,-77.0450,'2026-04-02T06:30:00Z','River Trail Entrance'),
    trk('V-003',38.9040,-77.0480,'2026-04-02T06:50:00Z','River Trail \u2013 Mile 1'),
    trk('V-003',38.9080,-77.0520,'2026-04-02T07:10:00Z','Near Spill Origin Point'),
    trk('V-003',38.9100,-77.0540,'2026-04-02T07:25:00Z','River Trail \u2013 Mile 2'),
    trk('V-003',38.9060,-77.0500,'2026-04-02T07:45:00Z','Trail Exit \u2013 Emergency'),
  ],
  'V-004': [
    trk('V-004',38.8950,-77.0250,'2026-04-04T10:00:00Z','Hotel Downtown'),
    trk('V-004',38.8980,-77.0300,'2026-04-04T12:00:00Z','Museum'),
    trk('V-004',38.8950,-77.0250,'2026-04-04T16:00:00Z','Hotel Downtown'),
  ],
  'V-005': [
    trk('V-005',38.9060,-77.0360,'2026-04-03T07:30:00Z','Home \u2013 567 Elm St'),
    trk('V-005',38.9100,-77.0400,'2026-04-03T08:15:00Z','Lincoln Elementary School'),
    trk('V-005',38.9110,-77.0410,'2026-04-03T12:30:00Z','School Playground (outdoors)'),
    trk('V-005',38.9100,-77.0400,'2026-04-03T15:30:00Z','Lincoln Elementary School'),
    trk('V-005',38.9060,-77.0360,'2026-04-03T16:30:00Z','Home \u2013 567 Elm St'),
  ],
  'V-006': [
    trk('V-006',38.9010,-77.0280,'2026-04-04T09:00:00Z','Home \u2013 234 Maple Dr'),
    trk('V-006',38.9030,-77.0310,'2026-04-04T10:30:00Z','Pharmacy'),
    trk('V-006',38.9010,-77.0280,'2026-04-04T11:30:00Z','Home \u2013 234 Maple Dr'),
  ],
  'V-007': [
    trk('V-007',38.9090,-77.0450,'2026-04-02T09:00:00Z','EMS Station 4'),
    trk('V-007',38.9150,-77.0480,'2026-04-02T09:30:00Z','Incident Perimeter'),
    trk('V-007',38.9180,-77.0500,'2026-04-02T10:00:00Z','Inside Exclusion Zone'),
    trk('V-007',38.9150,-77.0480,'2026-04-02T11:00:00Z','Decontamination Point'),
    trk('V-007',38.9090,-77.0450,'2026-04-02T12:00:00Z','EMS Station 4'),
  ],
  'V-008': [
    trk('V-008',38.9080,-77.0350,'2026-04-04T08:00:00Z','Press Staging Area'),
    trk('V-008',38.9090,-77.0370,'2026-04-04T10:00:00Z','Public Briefing Tent'),
    trk('V-008',38.9070,-77.0340,'2026-04-04T14:00:00Z','Press Staging Area'),
  ],
};

// ── Body Measurements (mock) ───────────────────────────────
export const bodyMeasurementsMap: Record<string, BodyMeasurement[]> = {
  'V-001': [
    { id: 'BM-001-1', visitor_id: 'V-001', timestamp: '2026-04-03T08:30:00Z', type: 'Hands', value: 0.02, unit: '\u03bcSv/h' },
    { id: 'BM-001-2', visitor_id: 'V-001', timestamp: '2026-04-03T08:30:00Z', type: 'Face', value: 0.03, unit: '\u03bcSv/h' },
    { id: 'BM-001-3', visitor_id: 'V-001', timestamp: '2026-04-03T08:30:00Z', type: 'Chest', value: 0.01, unit: '\u03bcSv/h' },
  ],
  'V-002': [
    { id: 'BM-002-1', visitor_id: 'V-002', timestamp: '2026-04-03T08:30:00Z', type: 'Hands', value: 0.15, unit: '\u03bcSv/h' },
    { id: 'BM-002-2', visitor_id: 'V-002', timestamp: '2026-04-03T08:30:00Z', type: 'Legs', value: 0.12, unit: '\u03bcSv/h' },
    { id: 'BM-002-3', visitor_id: 'V-002', timestamp: '2026-04-03T08:30:00Z', type: 'Face', value: 0.18, unit: '\u03bcSv/h' },
  ],
  'V-003': [
    { id: 'BM-003-1', visitor_id: 'V-003', timestamp: '2026-04-02T08:00:00Z', type: 'Hands', value: 0.52, unit: '\u03bcSv/h' },
    { id: 'BM-003-2', visitor_id: 'V-003', timestamp: '2026-04-02T08:00:00Z', type: 'Legs', value: 0.44, unit: '\u03bcSv/h' },
    { id: 'BM-003-3', visitor_id: 'V-003', timestamp: '2026-04-02T08:00:00Z', type: 'Face', value: 0.61, unit: '\u03bcSv/h' },
    { id: 'BM-003-4', visitor_id: 'V-003', timestamp: '2026-04-02T08:00:00Z', type: 'Back', value: 0.38, unit: '\u03bcSv/h' },
  ],
};

// ── Alerts (local only) ────────────────────────────────────
export const alerts: Alert[] = [
  { id: 'A-001', type: 'threshold_breach', message: 'Radiation reading 5.2 \u03bcSv/h at storm drain (M-019) exceeds 2.0 threshold', severity: 'critical', timestamp: '2026-04-05T13:02:00Z', read: false },
  { id: 'A-002', type: 'threshold_breach', message: 'Water contamination 9.4 ppm at creek site (M-009) exceeds safe limit', severity: 'critical', timestamp: '2026-04-05T09:32:00Z', read: false },
  { id: 'A-003', type: 'new_hazard', message: 'New danger zone identified in Sector 4 \u2013 AQI 245', severity: 'warning', timestamp: '2026-04-05T08:47:00Z', read: true },
  { id: 'A-004', type: 'equipment_failure', message: 'Echo Team portable sensor #3 offline \u2013 last reading 4hrs ago', severity: 'warning', timestamp: '2026-04-05T07:15:00Z', read: true },
  { id: 'A-005', type: 'team_sos', message: 'Bravo Team reported exposure incident near facility east wall', severity: 'critical', timestamp: '2026-04-05T07:22:00Z', read: true },
  { id: 'A-006', type: 'threshold_breach', message: 'Soil contamination 820 Bq/kg (M-012) in agricultural zone', severity: 'warning', timestamp: '2026-04-04T16:05:00Z', read: true },
  { id: 'A-007', type: 'new_hazard', message: 'Wind direction shift detected \u2013 plume now heading NE toward residential area', severity: 'critical', timestamp: '2026-04-05T14:00:00Z', read: false },
];
