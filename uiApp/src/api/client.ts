const BASE = import.meta.env.VITE_API_URL || '/api/v1';

let _token: string | null = localStorage.getItem('ecms-token');

export function setToken(token: string | null) {
  _token = token;
  if (token) localStorage.setItem('ecms-token', token);
  else localStorage.removeItem('ecms-token');
}

export function getToken() {
  return _token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function qs(params?: Record<string, string>): string {
  if (!params) return '';
  const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  return Object.keys(filtered).length ? '?' + new URLSearchParams(filtered).toString() : '';
}

function s(scenario: string, path: string) {
  return `/${encodeURIComponent(scenario)}${path}`;
}

export const api = {
  // ── Auth ──
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }),
    }),

  // ── Scenarios ──
  getScenarios: () => request<any[]>('/scenarios'),
  getScenario: (name: string) => request<any>(`/scenarios/${encodeURIComponent(name)}`),
  createScenario: (data: any) => request<any>('/scenarios', { method: 'POST', body: JSON.stringify(data) }),

  // ── Users ──
  getUsers: (params?: Record<string, string>) => request<Paginated<any>>(`/users${qs(params)}`),
  createUser: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),

  // ── Measurement Types ──
  getMeasurementTypes: (scenario: string) => request<any[]>(s(scenario, '/measurement-types')),
  createMeasurementType: (scenario: string, data: any) =>
    request<any>(s(scenario, '/measurement-types'), { method: 'POST', body: JSON.stringify(data) }),

  // ── Instruments ──
  getInstruments: (scenario: string) => request<any[]>(s(scenario, '/instruments')),
  createInstrument: (scenario: string, data: any) =>
    request<any>(s(scenario, '/instruments'), { method: 'POST', body: JSON.stringify(data) }),
  updateInstrument: (scenario: string, id: string, data: any) =>
    request<any>(s(scenario, `/instruments/${encodeURIComponent(id)}`), { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Measurements ──
  getMeasurements: (scenario: string, params?: Record<string, string>) =>
    request<Paginated<any>>(s(scenario, `/measurements${qs(params)}`)),
  getMeasurement: (scenario: string, id: string) =>
    request<any>(s(scenario, `/measurements/${encodeURIComponent(id)}`)),
  createMeasurement: (scenario: string, data: any) =>
    request<any>(s(scenario, '/measurements'), { method: 'POST', body: JSON.stringify(data) }),
  updateMeasurement: (scenario: string, id: string, data: any) =>
    request<any>(s(scenario, `/measurements/${encodeURIComponent(id)}`), { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMeasurement: (scenario: string, id: string) =>
    request<void>(s(scenario, `/measurements/${encodeURIComponent(id)}`), { method: 'DELETE' }),

  // ── Labels ──
  getLabels: (scenario: string) => request<any[]>(s(scenario, '/labels')),
  createLabel: (scenario: string, data: any) =>
    request<any>(s(scenario, '/labels'), { method: 'POST', body: JSON.stringify(data) }),
  assignLabel: (scenario: string, measurementId: string, data: any) =>
    request<any>(s(scenario, `/measurements/${encodeURIComponent(measurementId)}/labels`), { method: 'POST', body: JSON.stringify(data) }),

  // ── Visitors ──
  getVisitors: (scenario: string, params?: Record<string, string>) =>
    request<Paginated<any>>(s(scenario, `/visitors${qs(params)}`)),
  getVisitor: (scenario: string, id: string) =>
    request<any>(s(scenario, `/visitors/${encodeURIComponent(id)}`)),
  createVisitor: (scenario: string, data: any) =>
    request<any>(s(scenario, '/visitors'), { method: 'POST', body: JSON.stringify(data) }),
  getBodyMeasurements: (scenario: string, visitorId: string) =>
    request<any[]>(s(scenario, `/visitors/${encodeURIComponent(visitorId)}/body-measurements`)),
  createBodyMeasurement: (scenario: string, visitorId: string, data: any) =>
    request<any>(s(scenario, `/visitors/${encodeURIComponent(visitorId)}/body-measurements`), { method: 'POST', body: JSON.stringify(data) }),
  getVisitorTracks: (scenario: string, visitorId: string) =>
    request<any[]>(s(scenario, `/visitors/${encodeURIComponent(visitorId)}/tracks`)),
  createVisitorTrack: (scenario: string, visitorId: string, data: any) =>
    request<any>(s(scenario, `/visitors/${encodeURIComponent(visitorId)}/tracks`), { method: 'POST', body: JSON.stringify(data) }),

  // ── Missions ──
  getMissions: (scenario: string, params?: Record<string, string>) =>
    request<Paginated<any>>(s(scenario, `/missions${qs(params)}`)),
  getMission: (scenario: string, id: string) =>
    request<any>(s(scenario, `/missions/${encodeURIComponent(id)}`)),
  createMission: (scenario: string, data: any) =>
    request<any>(s(scenario, '/missions'), { method: 'POST', body: JSON.stringify(data) }),
  updateMission: (scenario: string, id: string, data: any) =>
    request<any>(s(scenario, `/missions/${encodeURIComponent(id)}`), { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMission: (scenario: string, id: string) =>
    request<void>(s(scenario, `/missions/${encodeURIComponent(id)}`), { method: 'DELETE' }),

  // ── Aggregation ──
  getMapData: (scenario: string, params?: Record<string, string>) =>
    request<any>(s(scenario, `/aggregation/map-data${qs(params)}`)),
  getAggregation: (scenario: string, params?: Record<string, string>) =>
    request<any>(s(scenario, `/aggregation/measurements/aggregate${qs(params)}`)),
  getVisitorDensity: (scenario: string, params?: Record<string, string>) =>
    request<any>(s(scenario, `/aggregation/visitors/density${qs(params)}`)),
};