import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MapView from '../components/MapView';
import { BodyMeasurement, MAP_CENTER, Visitor } from '../data/domain';
import { ArrowLeft, User, Phone, CreditCard, Activity, Thermometer, Heart, StickyNote, Save, Plus, MapPin, Trash2, Ruler } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useScenario } from '../context/ScenarioContext';
import { api, GeocodingSuggestion } from '../api/client';
import { useApi } from '../api/useApi';

type IntakeLocation = {
  location: string;
  timestamp: string;
  lat?: number;
  lon?: number;
};

export default function VisitorIntake() {
  const { t } = useLang();
  const { scenarioName } = useScenario();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { data: apiVisitor, loading: visitorLoading, error: visitorError } = useApi<Visitor | null>(() => id ? api.getVisitor(scenarioName, id) : Promise.resolve(null), [scenarioName, id]);
  const { data: apiBodyMeasurements } = useApi<BodyMeasurement[]>(() => id ? api.getBodyMeasurements(scenarioName, id) : Promise.resolve([]), [scenarioName, id]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [age, setAge] = useState('');
  const [contact, setContact] = useState('');
  const [exposureReading, setExposureReading] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [locations, setLocations] = useState<IntakeLocation[]>([
    { location: '', timestamp: '' },
  ]);
  const [bodyMeasurements, setBodyMeasurements] = useState<{ zone: string; value: string }[]>([
    { zone: 'Hands', value: '' },
    { zone: 'Legs', value: '' },
    { zone: 'Face', value: '' },
  ]);
  const [locationSuggestions, setLocationSuggestions] = useState<Record<number, GeocodingSuggestion[]>>({});
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchTimersRef = useRef<Record<number, number>>({});

  const trackPoints = useMemo(
    () => locations.filter((loc): loc is IntakeLocation & { lat: number; lon: number } => typeof loc.lat === 'number' && typeof loc.lon === 'number'),
    [locations],
  );

  const mapCenter = trackPoints.length > 0 ? [trackPoints[0].lat, trackPoints[0].lon] as [number, number] : MAP_CENTER;

  useEffect(() => {
    if (!apiVisitor) {
      return;
    }

    const demographics = apiVisitor.demographics ?? {};
    const vitalSigns = demographics.vital_signs ?? {};
    const movementHistory = Array.isArray(demographics.movement_history) ? demographics.movement_history : [];

    setName(String(demographics.name ?? ''));
    setIdNumber(String(demographics.id_number ?? ''));
    setAge(demographics.age != null ? String(demographics.age) : '');
    setContact(String(demographics.contact ?? ''));
    setExposureReading(demographics.exposure_reading != null ? String(demographics.exposure_reading) : '');
    setBloodPressure(String(demographics.blood_pressure ?? vitalSigns.bp ?? ''));
    setHeartRate(demographics.heart_rate != null ? String(demographics.heart_rate) : vitalSigns.hr != null ? String(vitalSigns.hr) : '');
    setTemperature(demographics.temperature != null ? String(demographics.temperature) : vitalSigns.temp != null ? String(vitalSigns.temp) : '');
    setNotes(String(demographics.notes ?? ''));
    setLocations(
      movementHistory.length > 0
        ? movementHistory.map((location: any) => ({
            location: String(location.location ?? ''),
            timestamp: location.timestamp ? String(location.timestamp).slice(0, 16) : '',
            lat: typeof location.lat === 'number' ? location.lat : undefined,
            lon: typeof location.lon === 'number' ? location.lon : undefined,
          }))
        : [{ location: '', timestamp: '' }],
    );
  }, [apiVisitor]);

  useEffect(() => {
    if (!apiBodyMeasurements) {
      return;
    }

    setBodyMeasurements(
      apiBodyMeasurements.length > 0
        ? apiBodyMeasurements.map(measurement => ({
            zone: measurement.type,
            value: String(measurement.value),
          }))
        : [{ zone: 'Hands', value: '' }, { zone: 'Legs', value: '' }, { zone: 'Face', value: '' }],
    );
  }, [apiBodyMeasurements]);

  const handleLocationChange = (index: number, value: string) => {
    setLocations(prev => {
      const next = [...prev];
      next[index] = { ...next[index], location: value, lat: undefined, lon: undefined };
      return next;
    });
    setActiveSuggestionIndex(index);

    const timers = searchTimersRef.current;
    if (timers[index]) {
      window.clearTimeout(timers[index]);
    }

    if (value.trim().length < 2) {
      setLocationSuggestions(prev => ({ ...prev, [index]: [] }));
      return;
    }

    timers[index] = window.setTimeout(async () => {
      try {
        const suggestions = await api.searchPlaces(value.trim(), 5);
        setLocationSuggestions(prev => ({ ...prev, [index]: suggestions }));
      } catch {
        setLocationSuggestions(prev => ({ ...prev, [index]: [] }));
      }
    }, 300);
  };

  const selectSuggestion = (index: number, suggestion: GeocodingSuggestion) => {
    setLocations(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        location: suggestion.display_name,
        lat: suggestion.lat,
        lon: suggestion.lon,
      };
      return next;
    });
    setLocationSuggestions(prev => ({ ...prev, [index]: [] }));
    setActiveSuggestionIndex(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const movementHistory = trackPoints.map(loc => ({
        location: loc.location,
        timestamp: loc.timestamp ? new Date(loc.timestamp).toISOString() : new Date().toISOString(),
        lat: loc.lat,
        lon: loc.lon,
      }));

      const demographics = {
        name: name || undefined,
        id_number: idNumber || undefined,
        age: age ? Number(age) : undefined,
        contact: contact || undefined,
        exposure_reading: exposureReading ? Number(exposureReading) : undefined,
        blood_pressure: bloodPressure || undefined,
        heart_rate: heartRate ? Number(heartRate) : undefined,
        temperature: temperature ? Number(temperature) : undefined,
        vital_signs: {
          bp: bloodPressure || undefined,
          hr: heartRate ? Number(heartRate) : undefined,
          temp: temperature ? Number(temperature) : undefined,
        },
        notes: notes || undefined,
        movement_history: movementHistory,
      };

      const normalizedBodyMeasurements = bodyMeasurements
        .filter(bm => bm.zone && bm.value)
        .map(bm => ({
          timestamp: new Date().toISOString(),
          type: bm.zone,
          value: Number(bm.value),
          unit: 'n/a',
        }));

      const sortedTrackPoints = [...trackPoints]
        .filter(loc => loc.timestamp)
        .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

      const trackGeom = sortedTrackPoints.length >= 2
        ? {
            type: 'LineString',
            coordinates: sortedTrackPoints.map(loc => [loc.lon, loc.lat]),
          }
        : null;

      if (isEditing && id) {
        await api.updateVisitor(scenarioName, id, {
          demographics,
          tags: apiVisitor?.tags ?? [],
          body_measurements: normalizedBodyMeasurements,
          track_geom: trackGeom,
        });
      } else {
        const visitor = await api.createVisitor(scenarioName, {
          demographics,
          tags: [],
        });

        const visitorId = visitor?.id;
        if (visitorId) {
          for (const bm of normalizedBodyMeasurements) {
            await api.createBodyMeasurement(scenarioName, visitorId, bm);
          }

          if (trackGeom) {
            await api.createVisitorTrack(scenarioName, visitorId, {
              geom: trackGeom,
            });
          }
        }
      }

      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || `Failed to ${isEditing ? 'update' : 'register'} visitor`);
      console.error(`Failed to ${isEditing ? 'update' : 'register'} visitor`, e);
    } finally {
      setSaving(false);
    }
  };

  if (visitorLoading && isEditing) {
    return <div className="max-w-lg mx-auto py-12 text-sm text-gray-500 dark:text-gray-400">Loading visitor intake...</div>;
  }

  if (visitorError && isEditing) {
    return <div className="max-w-lg mx-auto py-12 text-sm text-red-500">{visitorError}</div>;
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <Save className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">{isEditing ? 'Intake updated' : t('intake.registered')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{isEditing ? 'The visitor intake details were saved.' : t('intake.registeredDesc')}</p>
        <div className="flex gap-3">
          <button onClick={() => setSubmitted(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            {isEditing ? 'Continue editing' : t('intake.registerAnother')}
          </button>
          <Link to="/visitors" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            {t('intake.viewAll')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/visitors" className="p-2 -ml-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{isEditing ? 'Edit visitor intake' : t('intake.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{isEditing ? 'Update an existing visitor record' : t('intake.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Personal Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" /> {t('intake.personalDetails')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('intake.fullName')}</label>
              <input type="text" placeholder="John Smith" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1"><CreditCard className="w-3 h-3" /> {t('intake.idNumber')}</label>
              <input type="text" placeholder="DC-1234567" value={idNumber} onChange={e => setIdNumber(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('intake.age')}</label>
              <input type="number" placeholder="35" value={age} onChange={e => setAge(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> {t('intake.contact')}</label>
              <input type="tel" placeholder="+1-202-555-0123" value={contact} onChange={e => setContact(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Physical Measurements */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" /> {t('intake.physicalMeasurements')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
                <Thermometer className="w-3 h-3" /> {t('intake.exposureReading')}
              </label>
              <input type="number" step="0.01" placeholder="0.00" value={exposureReading} onChange={e => setExposureReading(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
                <Heart className="w-3 h-3" /> {t('intake.bloodPressure')}
              </label>
              <input type="text" placeholder="120/80" value={bloodPressure} onChange={e => setBloodPressure(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('intake.heartRate')}</label>
              <input type="number" placeholder="72" value={heartRate} onChange={e => setHeartRate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('intake.temperature')}</label>
              <input type="number" step="0.1" placeholder="36.6" value={temperature} onChange={e => setTemperature(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Body Measurements */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-gray-400" /> {t('intake.bodyMeasurements')}
          </h2>
          <div className="space-y-3">
            {bodyMeasurements.map((bm, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder={t('intake.zonePlaceholder')}
                  value={bm.zone}
                  onChange={e => {
                    const next = [...bodyMeasurements];
                    next[i] = { ...next[i], zone: e.target.value };
                    setBodyMeasurements(next);
                  }}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={bm.value}
                  onChange={e => {
                    const next = [...bodyMeasurements];
                    next[i] = { ...next[i], value: e.target.value };
                    setBodyMeasurements(next);
                  }}
                  className="w-28 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setBodyMeasurements(bodyMeasurements.filter((_, idx) => idx !== i))}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title={t('intake.removeZone')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setBodyMeasurements([...bodyMeasurements, { zone: '', value: '' }])}
              className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300"
            >
              <Plus className="w-4 h-4" /> {t('intake.addZone')}
            </button>
          </div>
        </div>

        {/* Visited Locations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" /> {t('intake.visitedLocations')}
          </h2>
          <div className="h-40 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
            <MapView
              center={mapCenter}
              zoom={12}
              markers={trackPoints.map((loc, index) => ({
                lat: loc.lat,
                lng: loc.lon,
                color: index === 0 ? '#16a34a' : '#2563eb',
                size: 12,
                popup: loc.location,
              }))}
              paths={trackPoints.length >= 2 ? [{
                points: trackPoints.map(loc => [loc.lat, loc.lon] as [number, number]),
                color: '#2563eb',
                weight: 3,
              }] : []}
            />
          </div>
          <div className="space-y-3">
            {locations.map((loc, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={t('intake.locationPlaceholder')}
                    value={loc.location}
                    onFocus={() => setActiveSuggestionIndex(i)}
                    onBlur={() => window.setTimeout(() => setActiveSuggestionIndex(current => (current === i ? null : current)), 150)}
                    onChange={e => handleLocationChange(i, e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {loc.lat != null && loc.lon != null && (
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                      {loc.lat.toFixed(5)}, {loc.lon.toFixed(5)}
                    </p>
                  )}
                  {activeSuggestionIndex === i && (locationSuggestions[i]?.length ?? 0) > 0 && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                      {locationSuggestions[i].map((suggestion, suggestionIndex) => (
                        <button
                          key={`${suggestion.display_name}-${suggestionIndex}`}
                          type="button"
                          onMouseDown={() => selectSuggestion(i, suggestion)}
                          className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                        >
                          {suggestion.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={loc.timestamp}
                  onChange={e => {
                    const next = [...locations];
                    next[i] = { ...next[i], timestamp: e.target.value };
                    setLocations(next);
                  }}
                  className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <button
              onClick={() => setLocations([...locations, { location: '', timestamp: '' }])}
              className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300"
            >
              <Plus className="w-4 h-4" /> {t('intake.addLocation')}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Type a place name in Hebrew or English and choose a suggestion to save its coordinates.
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-gray-400" /> {t('intake.notes')}
          </h2>
          <textarea
            rows={3}
            placeholder={t('intake.notesPlaceholder')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-[0.99] disabled:opacity-50"
        >
          <Save className="w-4 h-4 inline-block mr-2 -mt-0.5" />
          {saving ? t('intake.saving') ?? 'Saving…' : isEditing ? 'Save changes' : t('intake.register')}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
