import { useState, useMemo } from 'react';
import MapView, { MapMarker, MapPath, MapPolygon } from '../components/MapView';
import StatusBadge from '../components/StatusBadge';
import {
  measurements as mockMeasurements, missions as mockMissions, visitors as mockVisitors,
  instruments as mockInstruments, alerts as mockAlerts, visitorTracks as mockTracks,
  MAP_CENTER, SEVERITY_COLORS, TYPE_LABELS,
  Measurement, Mission, Visitor, Instrument, Alert,
  getSeverity, getLat, getLng, getMeasurementStatus, getVisitorStatus,
  missionAreaToLatLng, trackLat, trackLng,
} from '../data/mockData';
import { api, Paginated } from '../api/client';
import { useApi } from '../api/useApi';
import { useScenario } from '../context/ScenarioContext';
import {
  Layers, Filter, X, Eye, EyeOff, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle, Flag, MessageSquare, Clock,
  MapPin, Thermometer, Droplets, Wind, Radio, Volume2
} from 'lucide-react';
import { useLang } from '../context/LangContext';

const typeIcons: Record<string, typeof Radio> = {
  radiation: Radio,
  air_quality: Wind,
  water: Droplets,
  soil: Thermometer,
  noise: Volume2,
};

export default function GISDashboard() {
  const { t } = useLang();
  const { scenarioName } = useScenario();
  const { data: apiMeasurements } = useApi<Paginated<Measurement>>(() => api.getMeasurements(scenarioName), [scenarioName]);
  const { data: apiMissions } = useApi<Paginated<Mission>>(() => api.getMissions(scenarioName), [scenarioName]);
  const { data: apiVisitors } = useApi<Paginated<Visitor>>(() => api.getVisitors(scenarioName), [scenarioName]);
  const { data: apiInstruments } = useApi<Instrument[]>(() => api.getInstruments(scenarioName), [scenarioName]);
  const measurements = apiMeasurements?.items ?? mockMeasurements;
  const missions = apiMissions?.items ?? mockMissions;
  const visitors = apiVisitors?.items ?? mockVisitors;
  const instruments = apiInstruments ?? mockInstruments;
  const alerts = mockAlerts;

  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showMissions, setShowMissions] = useState(true);
  const [showVisitors, setShowVisitors] = useState(false);
  const [showHazardZones, setShowHazardZones] = useState(true);
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);

  const [filterOpen, setFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
  const [usableOnly, setUsableOnly] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailComment, setDetailComment] = useState('');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const unreadAlerts = alerts.filter(a => !a.read);

  const filteredMeasurements = useMemo(() => {
    return measurements.filter(m => {
      const typeName = m.measurement_type?.name ?? '';
      const severity = getSeverity(m);
      if (typeFilter !== 'all' && typeName !== typeFilter) return false;
      if (severityFilter !== 'all' && severity !== severityFilter) return false;
      if (instrumentFilter !== 'all' && m.instrument_id !== instrumentFilter) return false;
      if (usableOnly && getMeasurementStatus(m) !== 'verified') return false;
      return true;
    });
  }, [measurements, typeFilter, severityFilter, instrumentFilter, usableOnly]);

  const selectedMeasurement = measurements.find(m => m.id === selectedId);

  const markers: MapMarker[] = useMemo(() => {
    const result: MapMarker[] = [];
    if (showMeasurements) {
      filteredMeasurements.forEach(m => {
        const severity = getSeverity(m);
        result.push({
          lat: getLat(m), lng: getLng(m),
          color: SEVERITY_COLORS[severity],
          size: severity === 'danger' ? 18 : severity === 'warning' ? 14 : 12,
          id: m.id,
          popup: '<strong>' + (TYPE_LABELS[m.measurement_type?.name] ?? '') + '</strong><br/>' + m.value + ' ' + m.unit,
        });
      });
    }
    if (showVisitors) {
      visitors.forEach(v => {
        const tracks = mockTracks[v.id] ?? [];
        tracks.forEach(tk => {
          result.push({ lat: trackLat(tk), lng: trackLng(tk), color: '#8b5cf6', size: 8 });
        });
      });
    }
    return result;
  }, [showMeasurements, showVisitors, filteredMeasurements, visitors]);

  const paths: MapPath[] = useMemo(() => {
    if (!showVisitors) return [];
    return visitors.map(v => {
      const tracks = mockTracks[v.id] ?? [];
      return {
        points: tracks.map(tk => [trackLat(tk), trackLng(tk)] as [number, number]),
        color: '#8b5cf6', weight: 2, dashArray: '6 4',
      };
    }).filter(p => p.points.length > 0);
  }, [showVisitors, visitors]);

  const polygons: MapPolygon[] = useMemo(() => {
    const result: MapPolygon[] = [];
    if (showMissions) {
      missions.forEach(m => {
        const color = m.status === 'active' ? '#f97316' : m.status === 'completed' ? '#22c55e' : '#3b82f6';
        const pts = missionAreaToLatLng(m);
        if (pts.length >= 3) result.push({ points: pts, color, fillColor: color, fillOpacity: 0.12 });
      });
    }
    if (showHazardZones) {
      const dangerPoints = measurements.filter(m => getSeverity(m) === 'danger');
      dangerPoints.forEach(d => {
        const lat = getLat(d), lng = getLng(d), offset = 0.003;
        result.push({
          points: [[lat - offset, lng - offset],[lat - offset, lng + offset],[lat + offset, lng + offset],[lat + offset, lng - offset]],
          color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.08,
        });
      });
    }
    return result;
  }, [showMissions, showHazardZones, missions, measurements]);

  return (
    <div className="relative w-full h-full">
      <MapView center={MAP_CENTER} zoom={13} markers={markers} paths={paths} polygons={polygons} onMarkerClick={id => setSelectedId(id)} />

      {/* Filter bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterOpen(!filterOpen)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <Filter className="w-4 h-4" /> {t('gis.filters')}
            {(typeFilter !== 'all' || severityFilter !== 'all' || instrumentFilter !== 'all' || usableOnly) && <span className="w-2 h-2 rounded-full bg-blue-500" />}
          </button>
          {filterOpen && (
            <div className="flex items-center gap-2 flex-wrap">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-2 py-2 rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-xs">
                <option value="all">{t('gis.allTypes')}</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="px-2 py-2 rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-xs">
                <option value="all">{t('gis.allSeverities')}</option>
                <option value="safe">{t('gis.safe')}</option>
                <option value="warning">{t('gis.warning')}</option>
                <option value="danger">{t('gis.danger')}</option>
              </select>
              <select value={instrumentFilter} onChange={e => setInstrumentFilter(e.target.value)} className="px-2 py-2 rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-xs">
                <option value="all">{t('gis.allTeams')}</option>
                {instruments.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
              </select>
              <label className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-xs cursor-pointer">
                <input type="checkbox" checked={usableOnly} onChange={e => setUsableOnly(e.target.checked)} className="rounded" />
                Verified only
              </label>
            </div>
          )}
        </div>
        <div className="flex-1" />
        <button onClick={() => setAlertsOpen(!alertsOpen)} className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors relative">
          <AlertTriangle className="w-4 h-4 text-red-500" /> {t('gis.alerts')}
          {unreadAlerts.length > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">{unreadAlerts.length}</span>}
        </button>
      </div>

      {/* Layer controls */}
      <div className="absolute top-16 left-3 z-[1000]">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden w-56">
          <button onClick={() => setLayerPanelOpen(!layerPanelOpen)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
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
                <button key={layer.label} onClick={layer.toggle} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  {layer.active ? <Eye className="w-4 h-4 text-blue-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                  <span className={`w-3 h-3 rounded-sm ${layer.color} ${!layer.active ? 'opacity-30' : ''}`} />
                  <span className={!layer.active ? 'text-gray-400' : ''}>{layer.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 w-56">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Live Summary</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-green-500">{measurements.filter(m => getSeverity(m) === 'safe').length}</div>
              <div className="text-[10px] text-gray-500 uppercase">{t('gis.safe')}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-500">{measurements.filter(m => getSeverity(m) === 'warning').length}</div>
              <div className="text-[10px] text-gray-500 uppercase">{t('gis.warning')}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-500">{measurements.filter(m => getSeverity(m) === 'danger').length}</div>
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

      {/* Detail panel */}
      {selectedMeasurement && (() => {
        const severity = getSeverity(selectedMeasurement);
        const typeName = selectedMeasurement.measurement_type?.name ?? '';
        const Icon = typeIcons[typeName] || Radio;
        return (
          <div className="absolute top-3 right-3 bottom-3 z-[1000] w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-gray-500" />
                <span className="font-semibold text-sm">{TYPE_LABELS[typeName] ?? typeName}</span>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="text-center py-3">
                <div className={`text-4xl font-bold font-mono ${severity === 'danger' ? 'text-red-500' : severity === 'warning' ? 'text-yellow-500' : 'text-green-500'}`}>
                  {selectedMeasurement.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{selectedMeasurement.unit}</div>
                <div className="mt-2"><StatusBadge value={severity} type="severity" /></div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</span>
                  <span className="font-medium">{new Date(selectedMeasurement.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Instrument</span>
                  <span className="font-medium">{selectedMeasurement.instrument?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</span>
                  <span className="font-mono text-xs">{getLat(selectedMeasurement).toFixed(4)}, {getLng(selectedMeasurement).toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <StatusBadge value={getMeasurementStatus(selectedMeasurement)} type="status" />
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('common.notes')}</div>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">{selectedMeasurement.metadata?.notes}</p>
              </div>
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
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('gis.addComment')}</div>
                <div className="flex gap-2">
                  <input type="text" value={detailComment} onChange={e => setDetailComment(e.target.value)} placeholder={t('gis.comment')} className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  <button className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"><MessageSquare className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="text-xs text-gray-400 font-mono pt-2 border-t border-gray-200 dark:border-gray-700">ID: {selectedMeasurement.id}</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
