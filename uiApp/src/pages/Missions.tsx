import { useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import MapView, { MapPolygon, MapMarker } from '../components/MapView';
import StatusBadge from '../components/StatusBadge';
import { MAP_CENTER, Mission, Instrument, missionAreaToLatLng } from '../data/domain';
import { api, Paginated } from '../api/client';
import { useApi } from '../api/useApi';
import { useScenario } from '../context/ScenarioContext';
import { Plus, X, Target, Users as UsersIcon, Calendar, MapPin, Undo2, Trash2 } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function Missions() {
  const { t } = useLang();
  const { scenarioName } = useScenario();
  const { data: apiMissions } = useApi<Paginated<Mission>>(() => api.getMissions(scenarioName), [scenarioName]);
  const { data: apiInstruments } = useApi<Instrument[]>(() => api.getInstruments(scenarioName), [scenarioName]);
  const missions = apiMissions?.items ?? [];
  const instruments = apiInstruments ?? [];

  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [missionName, setMissionName] = useState('');
  const [missionDescription, setMissionDescription] = useState('');
  const [missionStatus, setMissionStatus] = useState<Mission['status']>('planned');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const drawMapRef = useRef<L.Map | null>(null);

  const handleDrawMapReady = useCallback((map: L.Map) => {
    drawMapRef.current = map;
    map.on('click', (e: L.LeafletMouseEvent) => {
      setDrawPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    });
  }, []);

  const resetModal = () => {
    setDrawPoints([]);
    setMissionName('');
    setMissionDescription('');
    setMissionStatus('planned');
    setCreateError(null);
    setEditingMissionId(null);
    drawMapRef.current = null;
    setShowCreateModal(false);
  };

  const openCreateModal = () => {
    resetModal();
    setShowCreateModal(true);
  };

  const openEditModal = (mission: Mission) => {
    const points = missionAreaToLatLng(mission);
    const normalizedPoints = points.length > 1 && points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1]
      ? points.slice(0, -1)
      : points;

    setMissionName(mission.name);
    setMissionDescription(mission.description ?? '');
    setMissionStatus(mission.status);
    setDrawPoints(normalizedPoints);
    setCreateError(null);
    setEditingMissionId(mission.id);
    setShowCreateModal(true);
  };

  const handleSaveMission = async () => {
    if (drawPoints.length < 3 || !missionName.trim()) return;

    const ring: [number, number][] = drawPoints.map(([lat, lng]) => [lng, lat]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push(first);
    }

    setCreating(true);
    setCreateError(null);
    try {
      const payload = {
        name: missionName.trim(),
        description: missionDescription.trim() || null,
        status: missionStatus,
        target_area: {
          type: 'Polygon',
          coordinates: [ring],
        },
      };

      if (editingMissionId) {
        await api.updateMission(scenarioName, editingMissionId, payload);
      } else {
        await api.createMission(scenarioName, payload);
      }

      resetModal();
      window.location.reload();
    } catch (e: any) {
      setCreateError(e?.message || `Failed to ${editingMissionId ? 'update' : 'create'} mission`);
    } finally {
      setCreating(false);
    }
  };

  const selected = missions.find(m => m.id === selectedMission);

  const polygons: MapPolygon[] = missions.map(m => {
    const color = m.status === 'active' ? '#f97316' : m.status === 'completed' ? '#22c55e' : '#3b82f6';
    const pts = missionAreaToLatLng(m);
    return { points: pts, color, fillColor: color, fillOpacity: m.id === selectedMission ? 0.3 : 0.12 };
  }).filter(p => p.points.length >= 3);

  const markers: MapMarker[] = missions.map(m => {
    const pts = missionAreaToLatLng(m);
    if (pts.length === 0) return null;
    const center = pts.reduce((acc, p) => [acc[0] + p[0] / pts.length, acc[1] + p[1] / pts.length], [0, 0]);
    return {
      lat: center[0], lng: center[1],
      color: m.status === 'active' ? '#f97316' : m.status === 'completed' ? '#22c55e' : '#3b82f6',
      size: 10, id: m.id,
    };
  }).filter(Boolean) as MapMarker[];

  return (
    <div className="h-[calc(100vh-7.5rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{t('missions.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('missions.subtitle')}</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
          <Plus className="w-4 h-4" /> {t('missions.newMission')}
        </button>
      </div>

      <div className="flex gap-4 h-[calc(100%-4rem)]">
        {/* Table */}
        <div className="w-1/2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">{t('missions.mission')}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t('missions.status')}</th>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {missions.map(m => (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedMission(m.id === selectedMission ? null : m.id)}
                    className={`cursor-pointer transition-colors ${m.id === selectedMission ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-750'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">{m.description}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={m.status} type="mission" /></td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{selected.name}</h3>
                <button onClick={() => setSelectedMission(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{selected.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(selected.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-gray-500" />
                  <StatusBadge value={selected.status} type="mission" />
                </div>
              </div>
              <button onClick={() => openEditModal(selected)} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                Edit mission
              </button>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="w-1/2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <MapView center={MAP_CENTER} zoom={13} polygons={polygons} markers={markers} onMarkerClick={id => setSelectedMission(id)} />
        </div>
      </div>

      {/* Create Mission Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" style={{ isolation: 'isolate' }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col relative z-[10000]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold">{editingMissionId ? 'Edit mission' : t('missions.createTitle')}</h2>
              <button onClick={resetModal} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('missions.name')}</label>
                <input
                  type="text"
                  value={missionName}
                  onChange={e => setMissionName(e.target.value)}
                  placeholder={t('missions.namePlaceholder')}
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('missions.objectives')}</label>
                <textarea
                  rows={3}
                  value={missionDescription}
                  onChange={e => setMissionDescription(e.target.value)}
                  placeholder={t('missions.objectivesPlaceholder')}
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Status</label>
                <select
                  value={missionStatus}
                  onChange={e => setMissionStatus(e.target.value as Mission['status'])}
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('missions.geoArea')}</label>
                  {drawPoints.length > 0 && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDrawPoints(prev => prev.slice(0, -1))} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Undo last point">
                        <Undo2 className="w-3 h-3" /> {t('missions.undo')}
                      </button>
                      <button onClick={() => setDrawPoints([])} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" title="Clear all points">
                        <Trash2 className="w-3 h-3" /> {t('missions.clear')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative">
                  <MapView
                    center={MAP_CENTER} zoom={12} onMapReady={handleDrawMapReady}
                    markers={drawPoints.map((p, i) => ({ lat: p[0], lng: p[1], color: i === 0 ? '#22c55e' : '#3b82f6', size: 12 }))}
                    polygons={drawPoints.length >= 3 ? [{ points: drawPoints, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15 }] : []}
                    paths={drawPoints.length >= 2 ? [{ points: drawPoints, color: '#3b82f6', weight: 2, dashArray: '6 4' }] : []}
                  />
                  <div className="absolute inset-0 pointer-events-none" style={{ cursor: 'crosshair' }} />
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {drawPoints.length === 0 ? t('missions.drawPromptEmpty') : drawPoints.length < 3 ? drawPoints.length + ' ' + t('missions.drawPromptFew') : drawPoints.length + ' ' + t('missions.drawPromptReady')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('missions.startDate')}</label>
                <input type="datetime-local" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
              {createError && <p className="text-sm text-red-500 mr-auto">{createError}</p>}
              <button onClick={resetModal} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">{t('missions.cancel')}</button>
              <button
                onClick={handleSaveMission}
                disabled={drawPoints.length < 3 || !missionName.trim() || creating}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${drawPoints.length >= 3 && missionName.trim() && !creating ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}
              >
                {creating ? (editingMissionId ? 'Saving...' : 'Creating...') : (editingMissionId ? 'Save changes' : t('missions.create'))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
