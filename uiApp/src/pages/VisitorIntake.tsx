import { useState } from 'react';
import { Link } from 'react-router-dom';
import MapView from '../components/MapView';
import { MAP_CENTER } from '../data/mockData';
import { ArrowLeft, User, Phone, CreditCard, Activity, Thermometer, Heart, StickyNote, Save, Plus, MapPin, Trash2, Ruler } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function VisitorIntake() {
  const { t } = useLang();
  const [submitted, setSubmitted] = useState(false);
  const [locations, setLocations] = useState<{ location: string; timestamp: string }[]>([
    { location: '', timestamp: '' },
  ]);
  const [bodyMeasurements, setBodyMeasurements] = useState<{ zone: string; value: string }[]>([
    { zone: 'Hands', value: '' },
    { zone: 'Legs', value: '' },
    { zone: 'Face', value: '' },
  ]);

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <Save className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">{t('intake.registered')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{t('intake.registeredDesc')}</p>
        <div className="flex gap-3">
          <button onClick={() => setSubmitted(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            {t('intake.registerAnother')}
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
          <h1 className="text-xl font-bold">{t('intake.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('intake.subtitle')}</p>
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
              <input type="text" placeholder="John Smith" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1"><CreditCard className="w-3 h-3" /> {t('intake.idNumber')}</label>
              <input type="text" placeholder="DC-1234567" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('intake.age')}</label>
              <input type="number" placeholder="35" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> {t('intake.contact')}</label>
              <input type="tel" placeholder="+1-202-555-0123" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
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
              <input type="number" step="0.01" placeholder="0.00" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
                <Heart className="w-3 h-3" /> {t('intake.bloodPressure')}
              </label>
              <input type="text" placeholder="120/80" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('intake.heartRate')}</label>
              <input type="number" placeholder="72" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('intake.temperature')}</label>
              <input type="number" step="0.1" placeholder="36.6" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
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
            <MapView center={MAP_CENTER} zoom={12} />
          </div>
          <div className="space-y-3">
            {locations.map((loc, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('intake.locationPlaceholder')}
                  value={loc.location}
                  onChange={e => {
                    const next = [...locations];
                    next[i] = { ...next[i], location: e.target.value };
                    setLocations(next);
                  }}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
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
            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={() => setSubmitted(true)}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-[0.99]"
        >
          <Save className="w-4 h-4 inline-block mr-2 -mt-0.5" />
          {t('intake.register')}
        </button>
      </div>
    </div>
  );
}
