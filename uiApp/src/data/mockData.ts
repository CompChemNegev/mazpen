// ── Types ──────────────────────────────────────────────
export interface Incident {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'monitoring' | 'resolved';
  location: string;
  startDate: string;
}

export interface Team {
  id: string;
  name: string;
  members: number;
  status: 'deployed' | 'standby' | 'offline';
}

export type MeasurementType = 'radiation' | 'air_quality' | 'water' | 'soil' | 'noise';
export type Severity = 'safe' | 'warning' | 'danger';
export type ReportStatus = 'pending' | 'verified' | 'flagged';

export interface Measurement {
  id: string;
  teamId: string;
  type: MeasurementType;
  value: number;
  unit: string;
  lat: number;
  lng: number;
  timestamp: string;
  notes: string;
  photo?: string;
  status: ReportStatus;
  severity: Severity;
}

export interface Mission {
  id: string;
  name: string;
  teamId: string;
  status: 'planned' | 'active' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  objectives: string;
  area: [number, number][];
  startDate: string;
  endDate?: string;
}

export interface Visitor {
  id: string;
  name: string;
  age: number;
  contact: string;
  idNumber: string;
  exposureReading: number;
  vitalSigns: { bp: string; hr: number; temp: number };
  bodyMeasurements?: { zone: string; value: number }[];
  status: 'cleared' | 'under_observation' | 'flagged';
  notes: string;
  movements: { lat: number; lng: number; timestamp: string; location: string }[];
}

export interface Alert {
  id: string;
  type: 'threshold_breach' | 'equipment_failure' | 'team_sos' | 'new_hazard';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  read: boolean;
}

// ── Unit maps ──────────────────────────────────────────
export const UNIT_MAP: Record<MeasurementType, string> = {
  radiation: 'μSv/h',
  air_quality: 'AQI',
  water: 'ppm',
  soil: 'Bq/kg',
  noise: 'dB',
};

export const TYPE_LABELS: Record<MeasurementType, string> = {
  radiation: 'Radiation',
  air_quality: 'Air Quality',
  water: 'Water Contamination',
  soil: 'Soil Contamination',
  noise: 'Noise Level',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  safe: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

// ── Center point (Washington DC area) ──────────────────
export const MAP_CENTER: [number, number] = [38.9072, -77.0369];

// ── Incidents ──────────────────────────────────────────
export const incidents: Incident[] = [
  { id: 'INC-001', name: 'Operation Clearwater', type: 'Chemical Spill', status: 'active', location: 'Potomac River Basin', startDate: '2026-04-02T08:30:00Z' },
  { id: 'INC-002', name: 'Station 7 Containment', type: 'Radiation Leak', status: 'active', location: 'Bethesda Research Facility', startDate: '2026-04-03T14:15:00Z' },
  { id: 'INC-003', name: 'Hurricane Delta Response', type: 'Hurricane Aftermath', status: 'monitoring', location: 'Chesapeake Bay Area', startDate: '2026-03-28T06:00:00Z' },
];

// ── Teams ──────────────────────────────────────────────
export const teams: Team[] = [
  { id: 'ALPHA', name: 'Alpha Team', members: 4, status: 'deployed' },
  { id: 'BRAVO', name: 'Bravo Team', members: 3, status: 'deployed' },
  { id: 'CHARLIE', name: 'Charlie Team', members: 5, status: 'standby' },
  { id: 'DELTA', name: 'Delta Team', members: 3, status: 'deployed' },
  { id: 'ECHO', name: 'Echo Team', members: 4, status: 'offline' },
];

// ── Measurements ───────────────────────────────────────
export const measurements: Measurement[] = [
  { id: 'M-001', teamId: 'ALPHA', type: 'radiation', value: 0.15, unit: 'μSv/h', lat: 38.9120, lng: -77.0420, timestamp: '2026-04-05T06:12:00Z', notes: 'Background levels normal at perimeter checkpoint A.', status: 'verified', severity: 'safe' },
  { id: 'M-002', teamId: 'ALPHA', type: 'radiation', value: 1.2, unit: 'μSv/h', lat: 38.9050, lng: -77.0300, timestamp: '2026-04-05T06:45:00Z', notes: 'Elevated readings near drainage outlet. Recommend follow-up.', status: 'verified', severity: 'warning' },
  { id: 'M-003', teamId: 'BRAVO', type: 'radiation', value: 4.8, unit: 'μSv/h', lat: 38.9180, lng: -77.0500, timestamp: '2026-04-05T07:20:00Z', notes: 'HIGH READING – 50m from facility east wall. Area cordoned.', status: 'flagged', severity: 'danger' },
  { id: 'M-004', teamId: 'ALPHA', type: 'air_quality', value: 42, unit: 'AQI', lat: 38.8950, lng: -77.0250, timestamp: '2026-04-05T07:00:00Z', notes: 'Air quality good in residential zone.', status: 'verified', severity: 'safe' },
  { id: 'M-005', teamId: 'BRAVO', type: 'air_quality', value: 128, unit: 'AQI', lat: 38.9100, lng: -77.0600, timestamp: '2026-04-05T08:15:00Z', notes: 'Unhealthy for sensitive groups. Downwind from site.', status: 'verified', severity: 'warning' },
  { id: 'M-006', teamId: 'DELTA', type: 'air_quality', value: 245, unit: 'AQI', lat: 38.9200, lng: -77.0350, timestamp: '2026-04-05T08:45:00Z', notes: 'Very unhealthy. Evacuation advisory issued for sector 4.', status: 'verified', severity: 'danger' },
  { id: 'M-007', teamId: 'CHARLIE', type: 'water', value: 0.3, unit: 'ppm', lat: 38.9000, lng: -77.0450, timestamp: '2026-04-05T06:30:00Z', notes: 'Water sample from municipal supply – within limits.', status: 'verified', severity: 'safe' },
  { id: 'M-008', teamId: 'DELTA', type: 'water', value: 3.7, unit: 'ppm', lat: 38.9080, lng: -77.0550, timestamp: '2026-04-05T09:00:00Z', notes: 'Elevated contaminants in creek downstream of spill site.', status: 'pending', severity: 'warning' },
  { id: 'M-009', teamId: 'BRAVO', type: 'water', value: 9.4, unit: 'ppm', lat: 38.9150, lng: -77.0400, timestamp: '2026-04-05T09:30:00Z', notes: 'CRITICAL – Direct runoff sample. Do not consume advisory.', status: 'flagged', severity: 'danger' },
  { id: 'M-010', teamId: 'ALPHA', type: 'soil', value: 45, unit: 'Bq/kg', lat: 38.9030, lng: -77.0200, timestamp: '2026-04-04T14:00:00Z', notes: 'Soil sample from park – background levels.', status: 'verified', severity: 'safe' },
  { id: 'M-011', teamId: 'DELTA', type: 'soil', value: 380, unit: 'Bq/kg', lat: 38.9120, lng: -77.0480, timestamp: '2026-04-04T15:30:00Z', notes: 'Moderately contaminated. Flagged for remediation assessment.', status: 'pending', severity: 'warning' },
  { id: 'M-012', teamId: 'BRAVO', type: 'soil', value: 820, unit: 'Bq/kg', lat: 38.9250, lng: -77.0380, timestamp: '2026-04-04T16:00:00Z', notes: 'Heavy contamination in agricultural plot. Immediate action needed.', status: 'flagged', severity: 'danger' },
  { id: 'M-013', teamId: 'CHARLIE', type: 'noise', value: 52, unit: 'dB', lat: 38.8980, lng: -77.0330, timestamp: '2026-04-05T10:00:00Z', notes: 'Normal ambient noise at residential area.', status: 'verified', severity: 'safe' },
  { id: 'M-014', teamId: 'ECHO', type: 'noise', value: 81, unit: 'dB', lat: 38.9070, lng: -77.0520, timestamp: '2026-04-05T10:30:00Z', notes: 'Elevated noise from cleanup equipment operations.', status: 'pending', severity: 'warning' },
  { id: 'M-015', teamId: 'DELTA', type: 'noise', value: 98, unit: 'dB', lat: 38.9220, lng: -77.0280, timestamp: '2026-04-05T11:00:00Z', notes: 'Hazardous noise level near demolition site. PPE required.', status: 'verified', severity: 'danger' },
  { id: 'M-016', teamId: 'ALPHA', type: 'radiation', value: 0.85, unit: 'μSv/h', lat: 38.9100, lng: -77.0420, timestamp: '2026-04-05T11:30:00Z', notes: 'Slightly elevated. Monitoring point #7.', status: 'pending', severity: 'warning' },
  { id: 'M-017', teamId: 'CHARLIE', type: 'air_quality', value: 38, unit: 'AQI', lat: 38.9020, lng: -77.0380, timestamp: '2026-04-05T12:00:00Z', notes: 'Upwind sector clear.', status: 'verified', severity: 'safe' },
  { id: 'M-018', teamId: 'DELTA', type: 'water', value: 2.4, unit: 'ppm', lat: 38.9160, lng: -77.0450, timestamp: '2026-04-05T12:30:00Z', notes: 'Secondary water source showing mild contamination.', status: 'pending', severity: 'warning' },
  { id: 'M-019', teamId: 'BRAVO', type: 'radiation', value: 5.2, unit: 'μSv/h', lat: 38.8990, lng: -77.0550, timestamp: '2026-04-05T13:00:00Z', notes: 'HOT SPOT identified at storm drain. Decon team requested.', status: 'flagged', severity: 'danger' },
  { id: 'M-020', teamId: 'ALPHA', type: 'soil', value: 210, unit: 'Bq/kg', lat: 38.9130, lng: -77.0320, timestamp: '2026-04-05T13:30:00Z', notes: 'Moderate contamination spreading east from primary site.', status: 'pending', severity: 'warning' },
];

// ── Missions ───────────────────────────────────────────
export const missions: Mission[] = [
  {
    id: 'MSN-001', name: 'Riverside Survey', teamId: 'ALPHA', status: 'active', priority: 'high',
    objectives: 'Complete water and soil sampling along 3km stretch of Potomac riverbank. Document any visible contamination.',
    area: [[38.905, -77.050], [38.905, -77.030], [38.915, -77.030], [38.915, -77.050]],
    startDate: '2026-04-05T06:00:00Z',
  },
  {
    id: 'MSN-002', name: 'Zone 3 Perimeter Scan', teamId: 'BRAVO', status: 'active', priority: 'critical',
    objectives: 'Radiation survey of 500m exclusion zone perimeter. Mark any readings above 2 μSv/h for decontamination.',
    area: [[38.916, -77.055], [38.916, -77.045], [38.926, -77.045], [38.926, -77.055]],
    startDate: '2026-04-05T07:00:00Z',
  },
  {
    id: 'MSN-003', name: 'Water Treatment Assessment', teamId: 'CHARLIE', status: 'planned', priority: 'medium',
    objectives: 'Inspect municipal water treatment facility. Test intake, processing, and output water samples.',
    area: [[38.895, -77.040], [38.895, -77.025], [38.902, -77.025], [38.902, -77.040]],
    startDate: '2026-04-06T08:00:00Z',
  },
  {
    id: 'MSN-004', name: 'Residential Clearance', teamId: 'DELTA', status: 'completed', priority: 'high',
    objectives: 'Door-to-door radiation screening in Sector 2 residential area. Issue clearance certificates.',
    area: [[38.900, -77.025], [38.900, -77.015], [38.908, -77.015], [38.908, -77.025]],
    startDate: '2026-04-03T09:00:00Z', endDate: '2026-04-04T17:00:00Z',
  },
  {
    id: 'MSN-005', name: 'Air Quality Grid Mapping', teamId: 'ECHO', status: 'planned', priority: 'low',
    objectives: 'Deploy portable AQI sensors at 12 grid points across the monitoring zone. Collect 24hr baseline data.',
    area: [[38.910, -77.065], [38.910, -77.050], [38.925, -77.050], [38.925, -77.065]],
    startDate: '2026-04-07T06:00:00Z',
  },
];

// ── Visitors ───────────────────────────────────────────
export const visitors: Visitor[] = [
  {
    id: 'V-001', name: 'Maria Chen', age: 34, contact: '+1-202-555-0147', idNumber: 'DC-8834721',
    exposureReading: 0.08, vitalSigns: { bp: '120/80', hr: 72, temp: 36.6 },
    bodyMeasurements: [{ zone: 'Hands', value: 0.02 }, { zone: 'Face', value: 0.03 }, { zone: 'Chest', value: 0.01 }],
    status: 'cleared', notes: 'Resident of Sector 1. No direct exposure. Cleared after screening.',
    movements: [
      { lat: 38.9020, lng: -77.0380, timestamp: '2026-04-03T08:00:00Z', location: 'Home – 1423 Oak St' },
      { lat: 38.9050, lng: -77.0320, timestamp: '2026-04-03T09:30:00Z', location: 'Grocery Store' },
      { lat: 38.9080, lng: -77.0350, timestamp: '2026-04-03T11:00:00Z', location: 'Community Center' },
      { lat: 38.9020, lng: -77.0380, timestamp: '2026-04-03T13:00:00Z', location: 'Home – 1423 Oak St' },
    ],
  },
  {
    id: 'V-002', name: 'James Okafor', age: 45, contact: '+1-202-555-0298', idNumber: 'DC-5521034',
    exposureReading: 0.32, vitalSigns: { bp: '135/88', hr: 84, temp: 36.8 },
    bodyMeasurements: [{ zone: 'Hands', value: 0.15 }, { zone: 'Legs', value: 0.12 }, { zone: 'Face', value: 0.18 }],
    status: 'under_observation', notes: 'Works near facility perimeter. Mild exposure detected. 48hr monitoring.',
    movements: [
      { lat: 38.9120, lng: -77.0480, timestamp: '2026-04-03T07:00:00Z', location: 'Home – 892 Pine Ave' },
      { lat: 38.9170, lng: -77.0490, timestamp: '2026-04-03T08:00:00Z', location: 'Workplace – Industrial Park' },
      { lat: 38.9180, lng: -77.0500, timestamp: '2026-04-03T12:00:00Z', location: 'Near Facility East Wall' },
      { lat: 38.9170, lng: -77.0490, timestamp: '2026-04-03T13:00:00Z', location: 'Workplace – Industrial Park' },
      { lat: 38.9120, lng: -77.0480, timestamp: '2026-04-03T18:00:00Z', location: 'Home – 892 Pine Ave' },
    ],
  },
  {
    id: 'V-003', name: 'Sarah Mitchell', age: 28, contact: '+1-202-555-0412', idNumber: 'DC-7712905',
    exposureReading: 1.15, vitalSigns: { bp: '142/92', hr: 96, temp: 37.2 },
    bodyMeasurements: [{ zone: 'Hands', value: 0.52 }, { zone: 'Legs', value: 0.44 }, { zone: 'Face', value: 0.61 }, { zone: 'Back', value: 0.38 }],
    status: 'flagged', notes: 'Was jogging along river trail during initial spill. Significant exposure. Referred to medical.',
    movements: [
      { lat: 38.9000, lng: -77.0450, timestamp: '2026-04-02T06:30:00Z', location: 'River Trail Entrance' },
      { lat: 38.9040, lng: -77.0480, timestamp: '2026-04-02T06:50:00Z', location: 'River Trail – Mile 1' },
      { lat: 38.9080, lng: -77.0520, timestamp: '2026-04-02T07:10:00Z', location: 'Near Spill Origin Point' },
      { lat: 38.9100, lng: -77.0540, timestamp: '2026-04-02T07:25:00Z', location: 'River Trail – Mile 2' },
      { lat: 38.9060, lng: -77.0500, timestamp: '2026-04-02T07:45:00Z', location: 'Trail Exit – Emergency' },
    ],
  },
  {
    id: 'V-004', name: 'Robert Pham', age: 52, contact: '+1-202-555-0633', idNumber: 'DC-3348291',
    exposureReading: 0.05, vitalSigns: { bp: '118/76', hr: 68, temp: 36.5 },
    status: 'cleared', notes: 'Visiting from out of state. Was in safe zone entire time.',
    movements: [
      { lat: 38.8950, lng: -77.0250, timestamp: '2026-04-04T10:00:00Z', location: 'Hotel Downtown' },
      { lat: 38.8980, lng: -77.0300, timestamp: '2026-04-04T12:00:00Z', location: 'Museum' },
      { lat: 38.8950, lng: -77.0250, timestamp: '2026-04-04T16:00:00Z', location: 'Hotel Downtown' },
    ],
  },
  {
    id: 'V-005', name: 'Elena Vasquez', age: 41, contact: '+1-202-555-0891', idNumber: 'DC-6639482',
    exposureReading: 0.45, vitalSigns: { bp: '128/82', hr: 78, temp: 36.7 },
    status: 'under_observation', notes: 'School teacher. Was outdoors during plume passage. Monitoring for 24hrs.',
    movements: [
      { lat: 38.9060, lng: -77.0360, timestamp: '2026-04-03T07:30:00Z', location: 'Home – 567 Elm St' },
      { lat: 38.9100, lng: -77.0400, timestamp: '2026-04-03T08:15:00Z', location: 'Lincoln Elementary School' },
      { lat: 38.9110, lng: -77.0410, timestamp: '2026-04-03T12:30:00Z', location: 'School Playground (outdoors)' },
      { lat: 38.9100, lng: -77.0400, timestamp: '2026-04-03T15:30:00Z', location: 'Lincoln Elementary School' },
      { lat: 38.9060, lng: -77.0360, timestamp: '2026-04-03T16:30:00Z', location: 'Home – 567 Elm St' },
    ],
  },
  {
    id: 'V-006', name: 'David Kim', age: 67, contact: '+1-202-555-0155', idNumber: 'DC-1192847',
    exposureReading: 0.12, vitalSigns: { bp: '148/94', hr: 88, temp: 36.4 },
    status: 'cleared', notes: 'Elderly resident. Pre-existing hypertension. Cleared but referred for follow-up.',
    movements: [
      { lat: 38.9010, lng: -77.0280, timestamp: '2026-04-04T09:00:00Z', location: 'Home – 234 Maple Dr' },
      { lat: 38.9030, lng: -77.0310, timestamp: '2026-04-04T10:30:00Z', location: 'Pharmacy' },
      { lat: 38.9010, lng: -77.0280, timestamp: '2026-04-04T11:30:00Z', location: 'Home – 234 Maple Dr' },
    ],
  },
  {
    id: 'V-007', name: 'Aisha Rahman', age: 31, contact: '+1-202-555-0774', idNumber: 'DC-4457190',
    exposureReading: 0.62, vitalSigns: { bp: '130/85', hr: 82, temp: 37.0 },
    status: 'under_observation', notes: 'First responder – paramedic. Entered zone without full PPE initially.',
    movements: [
      { lat: 38.9090, lng: -77.0450, timestamp: '2026-04-02T09:00:00Z', location: 'EMS Station 4' },
      { lat: 38.9150, lng: -77.0480, timestamp: '2026-04-02T09:30:00Z', location: 'Incident Perimeter' },
      { lat: 38.9180, lng: -77.0500, timestamp: '2026-04-02T10:00:00Z', location: 'Inside Exclusion Zone' },
      { lat: 38.9150, lng: -77.0480, timestamp: '2026-04-02T11:00:00Z', location: 'Decontamination Point' },
      { lat: 38.9090, lng: -77.0450, timestamp: '2026-04-02T12:00:00Z', location: 'EMS Station 4' },
    ],
  },
  {
    id: 'V-008', name: 'Thomas Wright', age: 39, contact: '+1-202-555-0521', idNumber: 'DC-8823156',
    exposureReading: 0.21, vitalSigns: { bp: '122/78', hr: 74, temp: 36.6 },
    status: 'cleared', notes: 'Journalist covering the incident. Was at press area only.',
    movements: [
      { lat: 38.9080, lng: -77.0350, timestamp: '2026-04-04T08:00:00Z', location: 'Press Staging Area' },
      { lat: 38.9090, lng: -77.0370, timestamp: '2026-04-04T10:00:00Z', location: 'Public Briefing Tent' },
      { lat: 38.9070, lng: -77.0340, timestamp: '2026-04-04T14:00:00Z', location: 'Press Staging Area' },
    ],
  },
];

// ── Alerts ─────────────────────────────────────────────
export const alerts: Alert[] = [
  { id: 'A-001', type: 'threshold_breach', message: 'Radiation reading 5.2 μSv/h at storm drain (M-019) exceeds 2.0 threshold', severity: 'critical', timestamp: '2026-04-05T13:02:00Z', read: false },
  { id: 'A-002', type: 'threshold_breach', message: 'Water contamination 9.4 ppm at creek site (M-009) exceeds safe limit', severity: 'critical', timestamp: '2026-04-05T09:32:00Z', read: false },
  { id: 'A-003', type: 'new_hazard', message: 'New danger zone identified in Sector 4 – AQI 245', severity: 'warning', timestamp: '2026-04-05T08:47:00Z', read: true },
  { id: 'A-004', type: 'equipment_failure', message: 'Echo Team portable sensor #3 offline – last reading 4hrs ago', severity: 'warning', timestamp: '2026-04-05T07:15:00Z', read: true },
  { id: 'A-005', type: 'team_sos', message: 'Bravo Team reported exposure incident near facility east wall', severity: 'critical', timestamp: '2026-04-05T07:22:00Z', read: true },
  { id: 'A-006', type: 'threshold_breach', message: 'Soil contamination 820 Bq/kg (M-012) in agricultural zone', severity: 'warning', timestamp: '2026-04-04T16:05:00Z', read: true },
  { id: 'A-007', type: 'new_hazard', message: 'Wind direction shift detected – plume now heading NE toward residential area', severity: 'critical', timestamp: '2026-04-05T14:00:00Z', read: false },
];
