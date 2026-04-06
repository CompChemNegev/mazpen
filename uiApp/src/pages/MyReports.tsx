import { useState } from 'react';
import { Link } from 'react-router-dom';
import { measurements as mockMeasurements, TYPE_LABELS, Measurement, getSeverity, getMeasurementStatus, getLat, getLng } from '../data/mockData';
import { api, Paginated } from '../api/client';
import { useApi } from '../api/useApi';
import { useScenario } from '../context/ScenarioContext';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, Search, Edit, MapPin, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function MyReports() {
  const { t } = useLang();
  const { scenarioName } = useScenario();
  const { data: apiData } = useApi<Paginated<Measurement>>(() => api.getMeasurements(scenarioName), [scenarioName]);
  const measurements = apiData?.items ?? mockMeasurements;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = [...measurements].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const filtered = sorted.filter(m => {
    const status = getMeasurementStatus(m);
    const typeName = m.measurement_type?.name ?? '';
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    if (typeFilter !== 'all' && typeName !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (m.metadata?.notes ?? '').toLowerCase().includes(q) ||
        typeName.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.instrument?.name ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/field-reports" className="p-2 -ml-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{t('myReports.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} reports</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('myReports.search')} className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="all">{t('myReports.allStatus')}</option>
            <option value="pending">{t('fieldReports.pending')}</option>
            <option value="verified">{t('fieldReports.verified')}</option>
            <option value="flagged">{t('fieldReports.flagged')}</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="all">{t('myReports.allTypes')}</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">{t('myReports.noResults')}</div>
        )}
        {filtered.map(m => {
          const severity = getSeverity(m);
          const status = getMeasurementStatus(m);
          const typeName = m.measurement_type?.name ?? '';
          const isExpanded = expanded === m.id;
          const isRecent = Date.now() - new Date(m.timestamp).getTime() < 3600000 * 4;

          return (
            <div key={m.id}>
              <button
                onClick={() => setExpanded(isExpanded ? null : m.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  severity === 'danger' ? 'bg-red-500' : severity === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <span>{TYPE_LABELS[typeName] ?? typeName}</span>
                    <span className="text-gray-400">·</span>
                    <span className="font-mono">{m.value} {m.unit}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(m.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    {m.instrument?.name}
                  </div>
                </div>
                <StatusBadge value={status} type="status" />
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-gray-50/50 dark:bg-gray-900/30">
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('myReports.reportId')}</div>
                      <div className="font-mono">{m.id}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('myReports.severity')}</div>
                      <StatusBadge value={severity} type="severity" />
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('myReports.location')}</div>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <MapPin className="w-3 h-3" />
                        {getLat(m).toFixed(6)}, {getLng(m).toFixed(6)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{t('common.notes')}</div>
                      <div className="text-gray-700 dark:text-gray-300">{m.metadata?.notes}</div>
                    </div>
                  </div>
                  {isRecent && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                      <Edit className="w-3.5 h-3.5" /> {t('myReports.editReport')}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
