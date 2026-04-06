const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ── Incidents ──
  getIncidents: () => request<any[]>('/incidents'),
  getIncident: (id: string) => request<any>(`/incidents/${encodeURIComponent(id)}`),
  createIncident: (data: any) => request<any>('/incidents', { method: 'POST', body: JSON.stringify(data) }),
  updateIncident: (id: string, data: any) => request<any>(`/incidents/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Teams ──
  getTeams: () => request<any[]>('/teams'),
  getTeam: (id: string) => request<any>(`/teams/${encodeURIComponent(id)}`),
  createTeam: (data: any) => request<any>('/teams', { method: 'POST', body: JSON.stringify(data) }),
  updateTeam: (id: string, data: any) => request<any>(`/teams/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Measurements ──
  getMeasurements: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/measurements${qs}`);
  },
  getMeasurement: (id: string) => request<any>(`/measurements/${encodeURIComponent(id)}`),
  getMeasurementStats: () => request<any>('/measurements/stats/summary'),
  createMeasurement: (data: any) => request<any>('/measurements', { method: 'POST', body: JSON.stringify(data) }),
  updateMeasurement: (id: string, data: any) => request<any>(`/measurements/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Missions ──
  getMissions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/missions${qs}`);
  },
  getMission: (id: string) => request<any>(`/missions/${encodeURIComponent(id)}`),
  createMission: (data: any) => request<any>('/missions', { method: 'POST', body: JSON.stringify(data) }),
  updateMission: (id: string, data: any) => request<any>(`/missions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Visitors ──
  getVisitors: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/visitors${qs}`);
  },
  getVisitor: (id: string) => request<any>(`/visitors/${encodeURIComponent(id)}`),
  createVisitor: (data: any) => request<any>('/visitors', { method: 'POST', body: JSON.stringify(data) }),
  updateVisitor: (id: string, data: any) => request<any>(`/visitors/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addVisitorMovement: (id: string, data: any) => request<any>(`/visitors/${encodeURIComponent(id)}/movements`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Alerts ──
  getAlerts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/alerts${qs}`);
  },
  createAlert: (data: any) => request<any>('/alerts', { method: 'POST', body: JSON.stringify(data) }),
  markAlertRead: (id: string) => request<any>(`/alerts/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  markAllAlertsRead: () => request<any>('/alerts/read-all', { method: 'POST' }),
};
