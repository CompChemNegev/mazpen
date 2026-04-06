import { Link } from 'react-router-dom';
import { Measurement, getSeverity, getMeasurementStatus, TYPE_LABELS } from '../data/domain';
import { api, Paginated } from '../api/client';
import { useApi } from '../api/useApi';
import { useScenario } from '../context/ScenarioContext';
import StatusBadge from '../components/StatusBadge';
import { Plus, ClipboardList, Activity, Clock, CheckCircle, AlertTriangle, Wifi } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function FieldReports() {
  const { t } = useLang();
  const { scenarioName } = useScenario();
  const { data: apiData } = useApi<Paginated<Measurement>>(() => api.getMeasurements(scenarioName), [scenarioName]);
  const measurements = apiData?.items ?? [];

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const today = measurements.filter(m => m.timestamp.startsWith(todayPrefix));
  const pending = today.filter(m => getMeasurementStatus(m) === 'pending').length;
  const verified = today.filter(m => getMeasurementStatus(m) === 'verified').length;
  const flagged = today.filter(m => getMeasurementStatus(m) === 'flagged').length;
  const recent = [...measurements].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('fieldReports.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('fieldReports.subtitle')}</p>
      </div>

      {/* Offline indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
        <Wifi className="w-4 h-4" />
        <span>{t('fieldReports.online')}</span>
        <span className="ml-auto text-xs text-green-500">{t('fieldReports.lastSync')}</span>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/field-reports/new"
          className="flex items-center gap-4 p-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-lg">{t('fieldReports.newReport')}</div>
            <div className="text-blue-100 text-sm">{t('fieldReports.newReportDesc')}</div>
          </div>
        </Link>
        <Link
          to="/field-reports/my-reports"
          className="flex items-center gap-4 p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <div className="font-bold text-lg">{t('fieldReports.myReports')}</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">{t('fieldReports.myReportsDesc')}</div>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">
            <Clock className="w-3.5 h-3.5" /> {t('fieldReports.pending')}
          </div>
          <div className="text-2xl font-bold mt-1 text-blue-600">{pending}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">
            <CheckCircle className="w-3.5 h-3.5" /> {t('fieldReports.verified')}
          </div>
          <div className="text-2xl font-bold mt-1 text-green-600">{verified}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">
            <AlertTriangle className="w-3.5 h-3.5" /> {t('fieldReports.flagged')}
          </div>
          <div className="text-2xl font-bold mt-1 text-red-600">{flagged}</div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-sm">{t('fieldReports.recentActivity')}</h2>
          <Activity className="w-4 h-4 text-gray-400" />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {recent.map(m => {
            const severity = getSeverity(m);
            const typeName = m.measurement_type?.name ?? '';
            return (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  severity === 'danger' ? 'bg-red-500' : severity === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {TYPE_LABELS[typeName] ?? typeName} – {m.value} {m.unit}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {m.instrument?.name} · {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <StatusBadge value={getMeasurementStatus(m)} type="status" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
