import {
  TYPE_LABELS, Measurement, Mission, Visitor, Instrument,
  getSeverity,
} from '../data/domain';
import { api, Paginated } from '../api/client';
import { useApi } from '../api/useApi';
import { useScenario } from '../context/ScenarioContext';
import {
  BarChart3, Activity, Users, Map, AlertTriangle, TrendingUp,
  ArrowUpRight, Clock, Radio, Wind, Droplets, Thermometer, Volume2
} from 'lucide-react';
import { useLang } from '../context/LangContext';

type Alert = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
};

const typeIcons: Record<string, typeof Radio> = {
  radiation: Radio,
  air_quality: Wind,
  water: Droplets,
  soil: Thermometer,
  noise: Volume2,
};

export default function Analytics() {
  const { t } = useLang();
  const { scenarioName } = useScenario();
  const { data: apiMeasurements } = useApi<Paginated<Measurement>>(() => api.getMeasurements(scenarioName), [scenarioName]);
  const { data: apiMissions } = useApi<Paginated<Mission>>(() => api.getMissions(scenarioName), [scenarioName]);
  const { data: apiVisitors } = useApi<Paginated<Visitor>>(() => api.getVisitors(scenarioName), [scenarioName]);
  const { data: apiInstruments } = useApi<Instrument[]>(() => api.getInstruments(scenarioName), [scenarioName]);
  const measurements = apiMeasurements?.items ?? [];
  const missions = apiMissions?.items ?? [];
  const visitors = apiVisitors?.items ?? [];
  const instruments = apiInstruments ?? [];
  const alerts: Alert[] = [];

  const totalMeasurements = measurements.length;
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const todayMeasurements = measurements.filter(m => m.timestamp.startsWith(todayPrefix)).length;
  const activeMissions = missions.filter(m => m.status === 'active').length;
  const flaggedVisitors = visitors.filter(v => v.tags?.includes('flagged')).length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.read).length;

  const byType = Object.keys(TYPE_LABELS).map(type => {
    const items = measurements.filter(m => (m.measurement_type?.name ?? '') === type);
    const avg = items.length ? items.reduce((s, m) => s + m.value, 0) / items.length : 0;
    const max = items.length ? Math.max(...items.map(m => m.value)) : 0;
    const dangerCount = items.filter(m => getSeverity(m) === 'danger').length;
    return { type, label: TYPE_LABELS[type], count: items.length, avg, max, dangerCount };
  });

  const severityDist = {
    safe: measurements.filter(m => getSeverity(m) === 'safe').length,
    warning: measurements.filter(m => getSeverity(m) === 'warning').length,
    danger: measurements.filter(m => getSeverity(m) === 'danger').length,
  };
  const severityTotal = severityDist.safe + severityDist.warning + severityDist.danger || 1;

  const instrumentActivity = instruments.map(inst => ({
    ...inst,
    reports: measurements.filter(m => m.instrument_id === inst.id).length,
    lastReport: measurements
      .filter(m => m.instrument_id === inst.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]?.timestamp,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('analytics.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: t('analytics.totalMeasurements'), value: totalMeasurements, icon: Activity, color: 'text-blue-600', sub: todayMeasurements + ' ' + t('analytics.today'), trend: 'up' as const },
          { label: t('analytics.activeMissions'), value: activeMissions, icon: Map, color: 'text-orange-600', sub: missions.length + ' ' + t('analytics.total') },
          { label: t('analytics.visitorsTracked'), value: visitors.length, icon: Users, color: 'text-purple-600', sub: flaggedVisitors + ' ' + t('visitors.flagged').toLowerCase(), trend: flaggedVisitors > 0 ? 'up' as const : undefined },
          { label: t('analytics.teamsDeployed'), value: instruments.length, icon: Users, color: 'text-green-600', sub: instruments.length + ' instruments' },
          { label: t('analytics.criticalAlerts'), value: criticalAlerts, icon: AlertTriangle, color: 'text-red-600', sub: alerts.length + ' ' + t('analytics.total'), trend: criticalAlerts > 0 ? 'up' as const : undefined },
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              {card.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-red-500" />}
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</div>
            <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" /> {t('analytics.severityDistribution')}
          </h2>
          <div className="flex items-end gap-8 h-32 mb-4 justify-center">
            {[
              { label: 'Safe', count: severityDist.safe, color: 'bg-green-500' },
              { label: 'Warning', count: severityDist.warning, color: 'bg-yellow-500' },
              { label: 'Danger', count: severityDist.danger, color: 'bg-red-500' },
            ].map(bar => (
              <div key={bar.label} className="flex flex-col items-center gap-1">
                <span className="text-sm font-bold">{bar.count}</span>
                <div className={`w-16 rounded-t-lg ${bar.color} transition-all`} style={{ height: (bar.count / severityTotal) * 100 + '%', minHeight: '8px' }} />
                <span className="text-xs text-gray-500">{bar.label}</span>
              </div>
            ))}
          </div>
          <div className="flex rounded-full overflow-hidden h-3 bg-gray-100 dark:bg-gray-700">
            <div className="bg-green-500" style={{ width: (severityDist.safe / severityTotal) * 100 + '%' }} />
            <div className="bg-yellow-500" style={{ width: (severityDist.warning / severityTotal) * 100 + '%' }} />
            <div className="bg-red-500" style={{ width: (severityDist.danger / severityTotal) * 100 + '%' }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{((severityDist.safe / severityTotal) * 100).toFixed(0)}% safe</span>
            <span>{((severityDist.warning / severityTotal) * 100).toFixed(0)}% warning</span>
            <span>{((severityDist.danger / severityTotal) * 100).toFixed(0)}% danger</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" /> {t('analytics.measurementsByType')}
          </h2>
          <div className="space-y-3">
            {byType.map(bt => {
              const Icon = typeIcons[bt.type] || Radio;
              return (
                <div key={bt.type} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{bt.label}</span>
                      <span className="text-gray-500 dark:text-gray-400">{bt.count} {t('analytics.readings')}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: totalMeasurements > 0 ? (bt.count / totalMeasurements) * 100 + '%' : '0%' }} />
                      </div>
                      {bt.dangerCount > 0 && <span className="text-xs text-red-500 font-medium shrink-0">{bt.dangerCount} danger</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" /> {t('analytics.teamActivity')}
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Instrument</th>
              <th className="text-left px-5 py-3 font-semibold">Type</th>
              <th className="text-left px-5 py-3 font-semibold">{t('analytics.reports')}</th>
              <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">{t('analytics.lastReport')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {instrumentActivity.map(ia => (
              <tr key={ia.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <td className="px-5 py-3 font-medium">{ia.name}</td>
                <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{ia.type}</td>
                <td className="px-5 py-3 font-mono">{ia.reports}</td>
                <td className="px-5 py-3 hidden sm:table-cell text-gray-500 dark:text-gray-400 text-xs">
                  {ia.lastReport ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ia.lastReport).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
