import { useState, ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import { useScenario } from '../context/ScenarioContext';
import {
  FileText, Map, Globe, Users, BarChart3, Settings,
  Bell, Moon, Sun, Menu, X, ChevronDown, Shield, LogOut, User, Languages
} from 'lucide-react';

type Alert = {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  read: boolean;
};

const navKeys = [
  { to: '/field-reports', icon: FileText, key: 'nav.fieldReports' },
  { to: '/missions', icon: Map, key: 'nav.missions' },
  { to: '/gis-dashboard', icon: Globe, key: 'nav.gisDashboard' },
  { to: '/visitors', icon: Users, key: 'nav.visitors' },
  { to: '/analytics', icon: BarChart3, key: 'nav.analytics' },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
];

export default function GlobalLayout({ children }: { children: ReactNode }) {
  const { dark, toggle } = useTheme();
  const { lang, setLang, t, dir } = useLang();
  const { scenarios, active, setActive } = useScenario();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);

  const alerts: Alert[] = [];
  const unreadAlerts = alerts.filter(a => !a.read).length;

  const isGIS = location.pathname === '/gis-dashboard';
  const isRTL = dir === 'rtl';

  return (
    <div className={`flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`} dir={dir}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 z-50 w-64 bg-sidebar flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${isRTL ? 'right-0' : 'left-0'}
        ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Shield className="w-8 h-8 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-white text-sm tracking-wide truncate">{t('app.name')}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest truncate">{t('app.subtitle')}</div>
          </div>
          <button className="lg:hidden ml-auto text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navKeys.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-5 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-sidebar-hover hover:text-gray-200'
                }
              `}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span>{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">JD</div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-200 truncate">John Doe</div>
              <div className="text-xs text-gray-500 truncate">{t('user.role')}</div>
            </div>
            <LogOut className="w-4 h-4 text-gray-500 hover:text-gray-300 cursor-pointer ml-auto shrink-0" />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top nav */}
        <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3 shrink-0 z-30">
          {/* Hamburger */}
          <button className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Scenario selector */}
          <div className="relative">
            <button
              onClick={() => setScenarioOpen(!scenarioOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="hidden sm:inline font-medium truncate max-w-[200px]">{active?.description ?? active?.name ?? 'Select scenario'}</span>
              <span className="sm:hidden font-medium">{active?.name ?? '...'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {scenarioOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-1 z-50">
                {scenarios.map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => { setActive(sc); setScenarioOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${sc.id === active?.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-medium">{sc.description ?? sc.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 ml-4">{sc.type.replace(/_/g, ' ')} · {sc.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'he' : 'en')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 flex items-center gap-1"
              title={lang === 'en' ? 'עברית' : 'English'}
            >
              <Languages className="w-[18px] h-[18px]" />
              <span className="text-xs font-semibold">{lang === 'en' ? 'HE' : 'EN'}</span>
            </button>

            {/* Theme toggle */}
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
              {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 relative"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadAlerts > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                    {unreadAlerts}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-sm">{t('common.alerts')}</div>
                  {alerts.map(alert => (
                    <div key={alert.id} className={`px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50 text-sm ${!alert.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                          alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <p className="text-gray-700 dark:text-gray-300">{alert.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User avatar (desktop) */}
            <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">JD</div>
              <span className="text-sm font-medium hidden lg:inline">John Doe</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-auto ${isGIS ? '' : 'p-4 md:p-6'}`}>
          {children}
        </main>
      </div>

      {/* Close popovers */}
      {(notifOpen || scenarioOpen) && (
        <div className="fixed inset-0 z-20" onClick={() => { setNotifOpen(false); setScenarioOpen(false); }} />
      )}
    </div>
  );
}
