import { useParams, Link } from 'react-router-dom';
import MapView from '../components/MapView';
import StatusBadge from '../components/StatusBadge';
import { Visitor, BodyMeasurement, getVisitorName, getVisitorStatus } from '../data/domain';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { useScenario } from '../context/ScenarioContext';
import {
  ArrowLeft, User, Phone, CreditCard, Activity, Heart,
  Thermometer, MapPin, Clock, Download, Ruler
} from 'lucide-react';
import { useLang } from '../context/LangContext';

type MovementHistoryItem = {
  location?: string;
  timestamp?: string;
  lat?: number;
  lon?: number;
};

export default function VisitorProfile() {
  const { t } = useLang();
  const { id } = useParams<{ id: string }>();
  const { scenarioName } = useScenario();
  const { data: apiVisitor } = useApi<Visitor | null>(() => id ? api.getVisitor(scenarioName, id) : Promise.resolve(null), [scenarioName, id]);
  const { data: apiBodyMeasurements } = useApi<BodyMeasurement[]>(() => id ? api.getBodyMeasurements(scenarioName, id) : Promise.resolve([]), [scenarioName, id]);

  const visitor = apiVisitor ?? null;
  const bodyMeasurements = apiBodyMeasurements ?? [];

  if (!visitor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-bold mb-2">{t('profile.notFound')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('profile.notFoundDesc')}</p>
        <Link to="/visitors" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">{t('profile.backToVisitors')}</Link>
      </div>
    );
  }

  const d = visitor.demographics ?? {};
  const movementHistory = Array.isArray(d.movement_history) ? d.movement_history as MovementHistoryItem[] : [];
  const status = getVisitorStatus(visitor);
  const exposure = d.exposure_reading ?? 0;
  const vital = d.vital_signs ?? {};
  const exposureColor = exposure >= 1 ? 'text-red-500' : exposure >= 0.3 ? 'text-yellow-500' : 'text-green-500';

  const timelinePoints = movementHistory
    .filter((item): item is Required<Pick<MovementHistoryItem, 'lat' | 'lon'>> & MovementHistoryItem => typeof item.lat === 'number' && typeof item.lon === 'number')
    .map(item => ({
      lat: item.lat,
      lon: item.lon,
      label: item.location ?? 'Location',
      recorded_at: item.timestamp ?? visitor.created_at,
    }));

  const mapMarkers = timelinePoints.map((tk, i) => ({
    lat: tk.lat, lng: tk.lon,
    color: i === 0 ? '#22c55e' : i === timelinePoints.length - 1 ? '#ef4444' : '#8b5cf6',
    size: i === 0 || i === timelinePoints.length - 1 ? 16 : 12,
    popup: '<strong>' + tk.label + '</strong><br/>' + new Date(tk.recorded_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  }));

  const mapPath = timelinePoints.length > 0 ? [{
    points: timelinePoints.map(tk => [tk.lat, tk.lon] as [number, number]),
    color: '#8b5cf6', weight: 3,
  }] : [];

  const centerLat = timelinePoints.length > 0 ? timelinePoints.reduce((s, tk) => s + tk.lat, 0) / timelinePoints.length : 38.9072;
  const centerLng = timelinePoints.length > 0 ? timelinePoints.reduce((s, tk) => s + tk.lon, 0) / timelinePoints.length : -77.0369;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/visitors" className="p-2 -ml-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{getVisitorName(visitor)}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Visitor Profile · {visitor.id}</p>
        </div>
        <Link to={`/visitors/${visitor.id}/edit`} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Edit intake
        </Link>
        <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700">
          <Download className="w-4 h-4" /> {t('profile.exportReport')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="space-y-4">
          {/* Personal Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" /> {t('profile.personalInfo')}
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Name</div>
                <div className="font-medium">{d.name ?? 'Unknown'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Age</div>
                <div className="font-medium">{d.age ?? '?'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1"><CreditCard className="w-3 h-3" /> ID</div>
                <div className="font-mono text-xs">{d.id_number ?? ''}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> Contact</div>
                <div className="font-medium">{d.contact ?? ''}</div>
              </div>
            </div>
          </div>

          {/* Measurements Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" /> {t('profile.measurementsSummary')}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Thermometer className="w-3 h-3" /> Exposure</div>
                <div className={`text-xl font-bold font-mono ${exposureColor}`}>{exposure.toFixed(2)}</div>
                <div className="text-xs text-gray-500">μSv/h</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><Heart className="w-3 h-3" /> {t('profile.bloodPressure')}</div>
                <div className="text-xl font-bold font-mono">{vital.bp ?? '—'}</div>
                <div className="text-xs text-gray-500">mmHg</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('profile.heartRate')}</div>
                <div className="text-xl font-bold font-mono">{vital.hr ?? '—'}</div>
                <div className="text-xs text-gray-500">bpm</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('profile.temperature')}</div>
                <div className="text-xl font-bold font-mono">{vital.temp != null ? vital.temp.toFixed(1) : '—'}</div>
                <div className="text-xs text-gray-500">°C</div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Status</h2>
              <StatusBadge value={status} type="visitor" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{d.notes ?? ''}</p>
          </div>

          {/* Body Measurements */}
          {bodyMeasurements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-gray-400" /> {t('profile.bodyMeasurements')}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {bodyMeasurements.map((bm, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{bm.type}</div>
                    <div className="text-lg font-bold font-mono">{bm.value.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden h-[480px] lg:h-auto">
          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" /> {t('profile.movementPath')}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-auto">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />{t('profile.start')}
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-3 mr-1" />{t('profile.end')}
            </span>
          </div>
          <div className="h-[calc(100%-2.75rem)]">
            <MapView center={[centerLat, centerLng]} zoom={14} markers={mapMarkers} paths={mapPath} />
          </div>
        </div>
      </div>

      {/* Movement timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" /> {t('profile.movementHistory')}
        </h2>
        <div className="relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-0">
            {timelinePoints.map((tk, i) => {
              const isFirst = i === 0;
              const isLast = i === timelinePoints.length - 1;
              const dotColor = isFirst ? 'bg-green-500' : isLast ? 'bg-red-500' : 'bg-purple-500';
              return (
                <div key={i} className="flex gap-4 py-3 relative">
                  <div className={`w-[10px] h-[10px] rounded-full ${dotColor} mt-1.5 shrink-0 z-10 ring-4 ring-white dark:ring-gray-800 ml-[14px]`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{tk.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 font-mono">
                        {new Date(tk.recorded_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {tk.lat.toFixed(4)}, {tk.lon.toFixed(4)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
