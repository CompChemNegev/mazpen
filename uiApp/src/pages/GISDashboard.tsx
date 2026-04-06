import { useState, useMemo } from 'react';
import MapView, { MapMarker, MapPath, MapPolygon } from '../components/MapView';
import StatusBadge from '../components/StatusBadge';
import {
  measurements as mockMeasurements, missions as mockMissions, visitors as mockVisitors,
  teams as mockTeams, alerts as mockAlerts,
  MAP_CENTER, SEVERITY_COLORS, TYPE_LABELS, MeasurementType, Measurement, Mission, Visitor, Team, Alert
} from '../data/mockData';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import {
  Layers, Filter, X, Eye, EyeOff, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle, Flag, MessageSquare, Clock,
  MapPin, Thermometer, Droplets, Wind, Radio, Volume2
} from 'lucide-react';
import { useLang } from '../context/LangContext';

const typeIcons: Record<MeasurementType, typeof Radio> = {
  radiation: Radio,
  air_quality: Wind,
  water: Droplets,
  soil: Thermometer,
  noise: Volume2,
};

export default function GISDashboard() {
  const { t } = useLang();
  const { data: apiMeasurements } = useApi<Measurement[]>(() => api.getMeasurements(), []);
  const { data: apiMissions } = useApi<Mission[]>(() => api.getMissions(), []);
  const { data: apiVisitors } = useApi<Visitor[]>(() => api.getVisitors(), []);
  const { data: apiTeams } = useApi<Team[]>(() => api.getTeams(), []);
  const { data: apiAlerts } = useApi<Alert[]>(() => api.getAlerts(), []);
  const measurements = apiMeasurements ?? mockMeasurements;
  const missions = apiMissions ?? mockMissions;
  const visitors = apiVisitors ?? mockVisitors;
  const teams = apiTeams ?? mockTeams;
  const alerts = apiAlerts ?? mockAlerts;

  // Layer visibility
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showMissions, setShowMissions] = useState(true);
  const [showVisitors, setShowVisitors] = useState(false);
  const [showHazardZones, setShowHazardZones] = useState(true);
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [usableOnly, setUsableOnly] = useState(false);

  // Detail panel
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailComment, setDetailComment] = useState('');

  // Alerts panel
  const [alertsOpen, setAlertsOpen] = useState(false);
  const unreadAlerts = alerts.filter(a => !a.read);

  // Filter measurements
  const filteredMeasurements = useMemo(() => {
    return measurements.filter(m => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (severityFilter !== 'all' && m.severity !== severityFilter) return false;
      if (teamFilter !== 'all' && m.teamId !== teamFilter) return false;
      if (usableOnly && m.status !== 'verified') return false;
      return true;
    });
  }, [typeFilter, severityFilter, teamFilter, usableOnly]);

  const selectedMeasurement = measurements.find(m => m.id === selectedId);

  // Build map markers
  const markers: MapMarker[] = useMemo(() => {
    const result: MapMarker[] = [];
    if (showMeasurements) {
      filteredMeasurements.forEach(m => {
        result.push({
          lat: m.lat,
          lng: m.lng,
          color: SEVERITY_COLORS[m.severity],
          size: m.severity === 'danger' ? 18 : m.severity === 'warning' ? 14 : 12,
          id: m.id,
          popup: `<strong>${TYPE_LABELS[m.type]}</strong><br/>${m.value} ${m.unit}`,
        });
      });
    }
    if (showVisitors) {
      visitors.forEach(v => {
        v.movements.forEach(mv => {
          result.push({ lat: mv.lat, lng: mv.lng, color: '#8b5cf6', size: 8 });
        });
      });
    }
    return result;
  }, [showMeasurements, showVisitors, filteredMeasurements]);

  // Build paths (visitor movement)
  const paths: MapPath[] = useMemo(() => {
    if (!showVisitors) return [];
    return visitors.map(v => ({
      points: v.movements.map(mv => [mv.lat, mv.lng] as [number, number]),
      color: '#8b5cf6',
      weight: 2,
      dashArray: '6 4',
    }));
  }, [showVisitors]);

  // Build polygons (mission areas + hazard zones)
  const polygons: MapPolygon[] = useMemo(() => {
    const result: MapPolygon[] = [];
    if (showMissions) {
      missions.forEach(m => {
        const color = m.status === 'active' ? '#f97316' : m.status === 'completed' ? '#22c55e' : '#3b82f6';
        result.push({ points: m.area, color, fillColor: color, fillOpacity: 0.12 });
      });
    }
    if (showHazardZones) {
      // Simulate hazard zones around danger readings
      const dangerPoints = measurements.filter(m => m.severity === 'danger');
      dangerPoints.forEach(d => {
        const offset = 0.003;
        result.push({
          points: [
            [d.lat - offset, d.lng - offset],
            [d.lat - offset, d.lng + offset],
            [d.lat + offset, d.lng + offset],
            [d.lat + offset, d.lng - offset],
          ],
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.08,
        });
      });
    }
    return result;
  }, [showMissions, showHazardZones]);

  return (
    <div className="relative w-full h-full">
      {/* Full-screen map */}
      <MapView
        center={MAP_CENTER}
        zoom={13}
        markers={markers}
        paths={paths}
        polygons={polygons}
        onMarkerClick={id => setSelectedId(id)}
      />

      {/* Filter bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <Filter className="w-4 h-4" /> {t('gis.filters')}
            {(typeFilter !== 'all' || severityFilter !== 'all' || teamFilter !== 'all' || usableOnly) && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>

          {filterOpen && (
            <div className="flex items-center gap-2 flex-wrap">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-2 py-2 rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-xs">
                <option value="all">{t('gis.allTypes')}</option>
                {(Object.entries(TYPE_LABELS) as [MeasurementType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="px-2 py-2 rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-xs">
                <option value="all">{t('gis.allSeverities')}</option>
                <option value="safe">{t('gis.safe')}</option>
                <option value="warning">{t('gis.warning')}</option>
                <option value="danger">{t('gis.danger')}</option>
              </select>
              <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="px-2 py-2 rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-xs">
                <option value="all">{t('gis.allTeams')}</option>
                {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </select>
              <label className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-xs cursor-pointer">
                <input type="checkbox" checked={usableOnly} onChange={e => setUsableOnly(e.target.checked)} className="rounded" />
                Verified only
              </label>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Alerts button */}
        <button
          onClick={() => setAlertsOpen(!alertsOpen)}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors relative"
        >
          <AlertTriangle className="w-4 h-4 text-red-500" /> {t('gis.alerts')}
          {unreadAlerts.length > 0 && (
            <span className="w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">{unreadAlerts.length}</span>
          )}
        </button>
      </div>

      {/* Layer controls panel */}
      <div className="absolute top-16 left-3 z-[1000]">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden w-56">
          <button
            onClick={() => setLayerPanelOpen(!layerPanelOpen)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <Layers className="w-4 h-4" /> {t('gis.layers')}
            {layerPanelOpen ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
          </button>
          {layerPanelOpen && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-2 space-y-1">
              {[
                { label: t('gis.measurements'), active: showMeasurements, toggle: () => setShowMeasurements(!showMeasurements), color: 'bg-blue-500' },
                { label: t('gis.missions'), active: showMissions, toggle: () => setShowMissions(!showMissions), color: 'bg-orange-500' },
                { label: t('gis.visitors'), active: showVisitors, toggle: () => setShowVisitors(!showVisitors), color: 'bg-purple-500' },
                { label: t('gis.hazardZones'), active: showHazardZones, toggle: () => setShowHazardZones(!showHazardZones), color: 'bg-red-500' },
              ].map(layer => (
                <button
                  key={layer.label}
                  onClick={layer.toggle}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {layer.active ? <Eye className="w-4 h-4 text-blue-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                  <span className={`w-3 h-3 rounded-sm ${layer.color} ${!layer.active ? 'opacity-30' : ''}`} />
                  <span className={!layer.active ? 'text-gray-400' : ''}>{layer.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats overlay */}
        <div className="mt-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 w-56">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Live Summary</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-green-500">{measurements.filter(m => m.severity === 'safe').length}</div>
              <div className="text-[10px] text-gray-500 uppercase">{t('gis.safe')}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-500">{measurements.filter(m => m.severity === 'warning').length}</div>
              <div className="text-[10px] text-gray-500 uppercase">{t('gis.warning')}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-500">{measurements.filter(m => m.severity === 'danger').length}</div>
              <div className="text-[10px] text-gray-500 uppercase">{t('gis.danger')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts panel */}
      {alertsOpen && (
        <div className="absolute top-16 right-3 z-[1000] w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-[calc(100%-5rem)] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-red-500" /> {t('gis.alerts')}</span>
            <button onClick={() => setAlertsOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          {alerts.map(a => (
            <div key={a.id} className={`px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50 text-xs ${!a.read ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.severity === 'critical' ? 'bg-red-500 pulse-dot' : 'bg-yellow-500'}`} />
                <div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{a.message}</p>
                  <p className="text-gray-400 mt-1">{new Date(a.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel (right side) */}
      {selectedMeasurement && (
        <div className="absolute top-3 right-3 bottom-3 z-[1000] w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = typeIcons[selectedMeasurement.type];
                return <Icon className="w-5 h-5 text-gray-500" />;
              })()}
              <span className="font-semibold text-sm">{TYPE_LABELS[selectedMeasurement.type]}</span>
            </div>
            <button onClick={() => setSelectedId(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Value */}
            <div className="text-center py-3">
              <div className={`text-4xl font-bold font-mono ${
                selectedMeasurement.severity === 'danger' ? 'text-red-500' :
                selectedMeasurement.severity === 'warning' ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {selectedMeasurement.value}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{selectedMeasurement.unit}</div>
              <div className="mt-2">
                <StatusBadge value={selectedMeasurement.severity} type="severity" />
              </div>
            </div>

            {/* Meta info */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</span>
                <span className="font-medium">{new Date(selectedMeasurement.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Team</span>
                <span className="font-medium">{teams.find(t => t.id === selectedMeasurement.teamId)?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</span>
                <span className="font-mono text-xs">{selectedMeasurement.lat.toFixed(4)}, {selectedMeasurement.lng.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <StatusBadge value={selectedMeasurement.status} type="status" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('common.notes')}</div>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                {selectedMeasurement.notes}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('common.actions')}</div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                  <CheckCircle className="w-4 h-4" /> Usable
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                  <Flag className="w-4 h-4" /> Suspicious
                </button>
              </div>
            </div>

            {/* Comment */}
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('gis.addComment')}</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={detailComment}
                  onChange={e => setDetailComment(e.target.value)}
                  placeholder={t('gis.comment')}
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Report ID */}
            <div className="text-xs text-gray-400 font-mono pt-2 border-t border-gray-200 dark:border-gray-700">
              ID: {selectedMeasurement.id}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
