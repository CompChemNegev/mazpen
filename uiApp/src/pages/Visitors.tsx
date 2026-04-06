import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Visitor, getVisitorStatus } from '../data/domain';
import { api, Paginated } from '../api/client';
import { useApi } from '../api/useApi';
import { useScenario } from '../context/ScenarioContext';
import StatusBadge from '../components/StatusBadge';
import { Search, UserPlus, Eye } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function Visitors() {
  const { t } = useLang();
  const { scenarioName } = useScenario();
  const { data: apiVisitors } = useApi<Paginated<Visitor>>(() => api.getVisitors(scenarioName), [scenarioName]);
  const visitors = apiVisitors?.items ?? [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = visitors.filter(v => {
    const status = getVisitorStatus(v);
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const d = v.demographics ?? {};
      return (d.name ?? '').toLowerCase().includes(q) || (d.id_number ?? '').toLowerCase().includes(q) || (d.contact ?? '').includes(q);
    }
    return true;
  });

  const stats = {
    total: visitors.length,
    cleared: visitors.filter(v => getVisitorStatus(v) === 'cleared').length,
    observation: visitors.filter(v => getVisitorStatus(v) === 'under_observation').length,
    flagged: visitors.filter(v => getVisitorStatus(v) === 'flagged').length,
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('visitors.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('visitors.subtitle')}</p>
        </div>
        <Link to="/visitors/intake" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm self-start">
          <UserPlus className="w-4 h-4" /> {t('visitors.newIntake')}
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{t('visitors.total')}</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{t('visitors.cleared')}</div>
          <div className="text-2xl font-bold mt-1 text-green-600">{stats.cleared}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{t('visitors.observation')}</div>
          <div className="text-2xl font-bold mt-1 text-yellow-600">{stats.observation}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{t('visitors.flagged')}</div>
          <div className="text-2xl font-bold mt-1 text-red-600">{stats.flagged}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('visitors.search')} className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">{t('visitors.allStatus')}</option>
          <option value="cleared">{t('visitors.cleared')}</option>
          <option value="under_observation">{t('visitors.underObservation')}</option>
          <option value="flagged">{t('visitors.flagged')}</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">{t('visitors.name')}</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">{t('visitors.idNumber')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('visitors.exposure')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('visitors.status')}</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">{t('visitors.locations')}</th>
                <th className="text-right px-4 py-3 font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filtered.map(v => {
                const d = v.demographics ?? {};
                const exposure = d.exposure_reading ?? 0;
                const status = getVisitorStatus(v);
                const movementHistory = Array.isArray(v.demographics?.movement_history) ? v.demographics.movement_history : [];
                return (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{d.name ?? 'Unknown'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Age {d.age ?? '?'} · {d.contact ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-gray-600 dark:text-gray-400">{d.id_number ?? ''}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-semibold ${exposure >= 1 ? 'text-red-500' : exposure >= 0.3 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {exposure.toFixed(2)} μSv/h
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={status} type="visitor" /></td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">{movementHistory.length} {t('visitors.locations')}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={'/visitors/' + v.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <Eye className="w-3 h-3" /> {t('visitors.view')}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
