import { useState } from 'react';
import { Link } from 'react-router-dom';
import MapView from '../components/MapView';
import { MeasurementType, UNIT_MAP, TYPE_LABELS, teams as mockTeams, Team } from '../data/mockData';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import {
  ArrowLeft, MapPin, Clock, Users, Beaker, Hash, StickyNote,
  Camera, Send, WifiOff, Wifi, ChevronDown
} from 'lucide-react';
import { useLang } from '../context/LangContext';

const measurementTypes: MeasurementType[] = ['radiation', 'air_quality', 'water', 'soil', 'noise'];

export default function NewMeasurement() {
  const { t } = useLang();
  const { data: apiTeams } = useApi<Team[]>(() => api.getTeams(), []);
  const teams = apiTeams ?? mockTeams;

  const [type, setType] = useState<MeasurementType>('radiation');
  const [value, setValue] = useState('');
  const [teamId, setTeamId] = useState('ALPHA');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Simulated GPS
  const gpsLat = 38.9072 + (Math.random() - 0.5) * 0.01;
  const gpsLng = -77.0369 + (Math.random() - 0.5) * 0.01;
  const now = new Date().toISOString();

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <Send className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">{t('newMeasurement.submitted')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{t('newMeasurement.submittedDesc')}</p>
        <div className="flex gap-3">
          <button onClick={() => { setSubmitted(false); setValue(''); setNotes(''); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            {t('newMeasurement.submitAnother')}
          </button>
          <Link to="/field-reports" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            {t('newMeasurement.backToHub')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/field-reports" className="p-2 -ml-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{t('newMeasurement.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('newMeasurement.subtitle')}</p>
        </div>
      </div>

      {/* Online status */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm mb-5">
        <Wifi className="w-4 h-4" />
        <span>{t('newMeasurement.online')}</span>
      </div>

      <div className="space-y-5">
        {/* GPS Location */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4" /> {t('newMeasurement.gpsLocation')}
          </div>
          <div className="h-48">
            <MapView
              center={[gpsLat, gpsLng]}
              zoom={15}
              markers={[{ lat: gpsLat, lng: gpsLng, color: '#3b82f6', size: 16 }]}
            />
          </div>
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-900">
            {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)} · Accuracy: ±3m
          </div>
        </div>

        {/* Timestamp */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Clock className="w-4 h-4" /> {t('newMeasurement.timestamp')}
          </label>
          <input
            type="datetime-local"
            defaultValue={now.slice(0, 16)}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Team */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Users className="w-4 h-4" /> {t('newMeasurement.team')}
          </label>
          <div className="relative">
            <select
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {teams.map(tm => (
                <option key={tm.id} value={tm.id}>{tm.name} ({tm.members} members)</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Measurement Type */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Beaker className="w-4 h-4" /> {t('newMeasurement.type')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {measurementTypes.map(mt => (
              <button
                key={mt}
                onClick={() => setType(mt)}
                className={`px-3 py-3 rounded-xl text-sm font-medium border transition-colors ${
                  type === mt
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                {TYPE_LABELS[mt]}
              </button>
            ))}
          </div>
        </div>

        {/* Value + Unit */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Hash className="w-4 h-4" /> {t('newMeasurement.value')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <div className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-medium flex items-center min-w-[70px] justify-center">
              {UNIT_MAP[type]}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <StickyNote className="w-4 h-4" /> {t('newMeasurement.notes')}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder={t('newMeasurement.notesPlaceholder')}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        {/* Photo upload */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Camera className="w-4 h-4" /> {t('newMeasurement.photo')}
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer">
            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('newMeasurement.photoPrompt')}</p>
          </div>
        </div>
      </div>

      {/* Sticky submit button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 z-40 lg:left-64">
        <div className="max-w-lg mx-auto">
          <button
            onClick={async () => {
              setSubmitting(true);
              try {
                await api.createMeasurement({
                  type, value: parseFloat(value), unit: UNIT_MAP[type],
                  lat: gpsLat, lng: gpsLng, timestamp: now, notes, teamId,
                });
              } catch { /* falls back to offline stub */ }
              setSubmitting(false);
              setSubmitted(true);
            }}
            disabled={!value || submitting}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              value
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25 active:scale-[0.98]'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5 inline-block mr-2 -mt-0.5" />
            {t('newMeasurement.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
