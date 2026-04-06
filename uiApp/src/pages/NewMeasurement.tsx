import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MapView from '../components/MapView';
import { Instrument, Measurement, UNIT_MAP, TYPE_LABELS } from '../data/domain';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { useScenario } from '../context/ScenarioContext';
import {
  ArrowLeft, MapPin, Clock, Users, Beaker, Hash, StickyNote,
  Camera, Send, Wifi, ChevronDown
} from 'lucide-react';
import { useLang } from '../context/LangContext';

const typeKeys = ['radiation', 'air_quality', 'water', 'soil', 'noise'];

export default function NewMeasurement() {
  const { t } = useLang();
  const { scenarioName } = useScenario();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const { data: apiInstruments } = useApi<Instrument[]>(() => api.getInstruments(scenarioName), [scenarioName]);
  const { data: apiMeasurementTypes } = useApi<any[]>(() => api.getMeasurementTypes(scenarioName), [scenarioName]);
  const {
    data: apiMeasurement,
    loading: measurementLoading,
    error: measurementError,
  } = useApi<Measurement | null>(() => id ? api.getMeasurement(scenarioName, id) : Promise.resolve(null), [scenarioName, id]);

  const instruments = apiInstruments ?? [];
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [typeKey, setTypeKey] = useState('radiation');
  const [value, setValue] = useState('');
  const [instrumentId, setInstrumentId] = useState('');
  const [notes, setNotes] = useState('');
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));
  const [gpsLat, setGpsLat] = useState(38.9072 + (Math.random() - 0.5) * 0.01);
  const [gpsLng, setGpsLng] = useState(-77.0369 + (Math.random() - 0.5) * 0.01);

  useEffect(() => {
    if (!instrumentId && instruments.length > 0) {
      setInstrumentId(instruments[0].id);
    }
  }, [instrumentId, instruments]);

  useEffect(() => {
    if (!apiMeasurement) {
      return;
    }

    setTypeKey(apiMeasurement.measurement_type?.name ?? 'radiation');
    setValue(String(apiMeasurement.value));
    setInstrumentId(apiMeasurement.instrument_id);
    setNotes(String(apiMeasurement.metadata?.notes ?? ''));
    setTimestamp(apiMeasurement.timestamp.slice(0, 16));
    setGpsLat(apiMeasurement.location?.coordinates?.[1] ?? 38.9072);
    setGpsLng(apiMeasurement.location?.coordinates?.[0] ?? -77.0369);
  }, [apiMeasurement]);

  const mt = useMemo(() => {
    if (!apiMeasurementTypes || apiMeasurementTypes.length === 0) {
      return null;
    }
    return apiMeasurementTypes.find((measurementType: any) => measurementType.name === typeKey) ?? null;
  }, [apiMeasurementTypes, typeKey]);

  const handleSubmit = async () => {
    const numericValue = Number(value);

    setSubmitError(null);
    setSubmitting(true);
    try {
      if (!mt?.id) {
        throw new Error('Measurement type is not configured on the server yet');
      }
      if (!instrumentId) {
        throw new Error('No instrument available for this scenario');
      }
      if (!Number.isFinite(numericValue)) {
        throw new Error('Measurement value must be a valid number');
      }

      const payload = {
        measurement_type_id: mt.id,
        value: numericValue,
        unit: UNIT_MAP[typeKey],
        instrument_id: instrumentId,
        location: { type: 'Point' as const, coordinates: [gpsLng, gpsLat] as [number, number] },
        timestamp: new Date(timestamp).toISOString(),
        metadata: { notes },
      };

      if (isEditing && id) {
        await api.updateMeasurement(scenarioName, id, payload);
      } else {
        await api.createMeasurement(scenarioName, payload);
      }

      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e?.message || `Failed to ${isEditing ? 'update' : 'submit'} measurement`);
    } finally {
      setSubmitting(false);
    }
  };

  if (measurementLoading && isEditing) {
    return <div className="max-w-lg mx-auto py-12 text-sm text-gray-500 dark:text-gray-400">Loading report...</div>;
  }

  if (measurementError && isEditing) {
    return <div className="max-w-lg mx-auto py-12 text-sm text-red-500">{measurementError}</div>;
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <Send className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">{isEditing ? 'Report updated' : t('newMeasurement.submitted')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{isEditing ? 'Your report changes were saved.' : t('newMeasurement.submittedDesc')}</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSubmitted(false);
              if (!isEditing) {
                setValue('');
                setNotes('');
                setTimestamp(new Date().toISOString().slice(0, 16));
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {isEditing ? 'Continue editing' : t('newMeasurement.submitAnother')}
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
      <div className="flex items-center gap-3 mb-6">
        <Link to="/field-reports" className="p-2 -ml-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{isEditing ? 'Edit report' : t('newMeasurement.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{isEditing ? 'Update an existing field report' : t('newMeasurement.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm mb-5">
        <Wifi className="w-4 h-4" />
        <span>{t('newMeasurement.online')}</span>
      </div>

      <div className="space-y-5">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4" /> {t('newMeasurement.gpsLocation')}
          </div>
          <div className="h-48">
            <MapView center={[gpsLat, gpsLng]} zoom={15} markers={[{ lat: gpsLat, lng: gpsLng, color: '#3b82f6', size: 16 }]} />
          </div>
          <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Latitude
              <input
                type="number"
                step="0.000001"
                value={gpsLat}
                onChange={event => setGpsLat(Number(event.target.value))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Longitude
              <input
                type="number"
                step="0.000001"
                value={gpsLng}
                onChange={event => setGpsLng(Number(event.target.value))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Clock className="w-4 h-4" /> {t('newMeasurement.timestamp')}
          </label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={event => setTimestamp(event.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Users className="w-4 h-4" /> {t('newMeasurement.team')}
          </label>
          <div className="relative">
            <select value={instrumentId} onChange={event => setInstrumentId(event.target.value)} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              {instruments.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name} ({inst.type})</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Beaker className="w-4 h-4" /> {t('newMeasurement.type')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {typeKeys.map(tk => (
              <button
                key={tk}
                type="button"
                onClick={() => setTypeKey(tk)}
                className={`px-3 py-3 rounded-xl text-sm font-medium border transition-colors ${
                  typeKey === tk
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                {TYPE_LABELS[tk] ?? tk}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Hash className="w-4 h-4" /> {t('newMeasurement.value')}
          </label>
          <div className="flex gap-2">
            <input type="number" value={value} onChange={event => setValue(event.target.value)} placeholder="0.00" step="0.01" className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
            <div className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-medium flex items-center min-w-[70px] justify-center">
              {UNIT_MAP[typeKey] ?? mt?.unit ?? ''}
            </div>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <StickyNote className="w-4 h-4" /> {t('newMeasurement.notes')}
          </label>
          <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder={t('newMeasurement.notesPlaceholder')} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
        </div>

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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 z-40 lg:left-64">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!value || submitting}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              value
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25 active:scale-[0.98]'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5 inline-block mr-2 -mt-0.5" />
            {submitting ? t('newMeasurement.submitting') : isEditing ? 'Save changes' : t('newMeasurement.submit')}
          </button>
          {submitError && <p className="mt-2 text-sm text-red-500">{submitError}</p>}
        </div>
      </div>
    </div>
  );
}
