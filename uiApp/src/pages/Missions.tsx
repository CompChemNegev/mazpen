import { useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import MapView, { MapPolygon, MapMarker } from '../components/MapView';
import StatusBadge from '../components/StatusBadge';
import { missions as mockMissions, teams as mockTeams, MAP_CENTER, Mission, Team } from '../data/mockData';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { Plus, X, Target, Users as UsersIcon, Calendar, Flag, MapPin, Undo2, Trash2 } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function Missions() {
  const { t } = useLang();
  const { data: apiMissions } = useApi<Mission[]>(() => api.getMissions(), []);
  const { data: apiTeams } = useApi<Team[]>(() => api.getTeams(), []);
  const missions = apiMissions ?? mockMissions;
  const teams = apiTeams ?? mockTeams;

  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Polygon drawing state for the create modal
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const drawMapRef = useRef<L.Map | null>(null);

  const handleDrawMapReady = useCallback((map: L.Map) => {
    drawMapRef.current = map;
    map.on('click', (e: L.LeafletMouseEvent) => {
      setDrawPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    });
  }, []);

  const resetModal = () => {
    setDrawPoints([]);
    drawMapRef.current = null;
    setShowCreateModal(false);
  };

  const selected = missions.find(m => m.id === selectedMission);

  const polygons: MapPolygon[] = missions.map(m => {
    const color = m.status === 'active' ? '#f97316' : m.status === 'completed' ? '#22c55e' : '#3b82f6';
    return {
      points: m.area,
      color,
      fillColor: color,
      fillOpacity: m.id === selectedMission ? 0.3 : 0.12,
    };
  });

  // Center markers for missions
  const markers: MapMarker[] = missions.map(m => {
    const center = m.area.reduce(
      (acc, p) => [acc[0] + p[0] / m.area.length, acc[1] + p[1] / m.area.length],
      [0, 0]
    );
    return {
      lat: center[0],
      lng: center[1],
      color: m.status === 'active' ? '#f97316' : m.status === 'completed' ? '#22c55e' : '#3b82f6',
      size: 10,
      id: m.id,
    };
  });

  return (
    <div className="h-[calc(100vh-7.5rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{t('missions.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('missions.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
        >
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
                  <th className="text-left px-4 py-3 font-semibold">{t('missions.team')}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t('missions.status')}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t('missions.priority')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {missions.map(m => {
                  const team = teams.find(t => t.id === m.teamId);
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMission(m.id === selectedMission ? null : m.id)}
                      className={`cursor-pointer transition-colors ${
                        m.id === selectedMission
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">{m.objectives}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{team?.name}</td>
                      <td className="px-4 py-3"><StatusBadge value={m.status} type="mission" /></td>
                      <td className="px-4 py-3"><StatusBadge value={m.priority} type="priority" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Selected mission details */}
          {selected && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{selected.name}</h3>
                <button onClick={() => setSelectedMission(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{selected.objectives}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <UsersIcon className="w-3.5 h-3.5" />
                  {teams.find(t => t.id === selected.teamId)?.name}
                </div>
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(selected.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  {selected.endDate && ` – ${new Date(selected.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                </div>
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-gray-500" />
                  <StatusBadge value={selected.status} type="mission" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-gray-500" />
                  <StatusBadge value={selected.priority} type="priority" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="w-1/2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <MapView
            center={MAP_CENTER}
            zoom={13}
            polygons={polygons}
            markers={markers}
            onMarkerClick={id => setSelectedMission(id)}
          />
        </div>
      </div>

      {/* Create Mission Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" style={{ isolation: 'isolate' }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col relative z-[10000]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold">{t('missions.createTitle')}</h2>
              <button onClick={resetModal} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('missions.name')}</label>
                <input type="text" placeholder={t('missions.namePlaceholder')} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('missions.assignTeam')}</label>
                  <select className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Priority</label>
                  <select className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('missions.objectives')}</label>
                <textarea rows={3} placeholder={t('missions.objectivesPlaceholder')} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('missions.geoArea')}</label>
                  {drawPoints.length > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDrawPoints(prev => prev.slice(0, -1))}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Undo last point"
                      >
                        <Undo2 className="w-3 h-3" /> {t('missions.undo')}
                      </button>
                      <button
                        onClick={() => setDrawPoints([])}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        title="Clear all points"
                      >
                        <Trash2 className="w-3 h-3" /> {t('missions.clear')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative">
                  <MapView
                    center={MAP_CENTER}
                    zoom={12}
                    onMapReady={handleDrawMapReady}
                    markers={drawPoints.map((p, i) => ({
                      lat: p[0],
                      lng: p[1],
                      color: i === 0 ? '#22c55e' : '#3b82f6',
                      size: 12,
                    }))}
                    polygons={drawPoints.length >= 3 ? [{
                      points: drawPoints,
                      color: '#3b82f6',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.15,
                    }] : []}
                    paths={drawPoints.length >= 2 ? [{
                      points: drawPoints,
                      color: '#3b82f6',
                      weight: 2,
                      dashArray: '6 4',
                    }] : []}
                  />
                  {/* Crosshair cursor overlay */}
                  <div className="absolute inset-0 pointer-events-none" style={{ cursor: 'crosshair' }} />
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {drawPoints.length === 0
                    ? t('missions.drawPromptEmpty')
                    : drawPoints.length < 3
                    ? `${drawPoints.length} ${t('missions.drawPromptFew')}`
                    : `${drawPoints.length} ${t('missions.drawPromptReady')}`}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('missions.startDate')}</label>
                <input type="datetime-local" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
              <button onClick={resetModal} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">{t('missions.cancel')}</button>
              <button
                onClick={resetModal}
                disabled={drawPoints.length < 3}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  drawPoints.length >= 3
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {t('missions.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
