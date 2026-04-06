import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Bell, Shield, User, Globe, Monitor, Smartphone } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function Settings() {
  const { dark, toggle } = useTheme();
  const { t } = useLang();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('settings.subtitle')}</p>
      </div>

      <div className="space-y-4">
        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-gray-400" /> {t('settings.appearance')}
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{t('settings.theme')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.themeDesc')}</div>
            </div>
            <button
              onClick={toggle}
              className={`relative w-14 h-7 rounded-full transition-colors ${dark ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform ${dark ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {dark ? <Moon className="w-3.5 h-3.5 text-blue-600" /> : <Sun className="w-3.5 h-3.5 text-yellow-500" />}
              </div>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="font-medium text-sm mb-3">{t('settings.interfaceMode')}</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: t('settings.desktop'), icon: Monitor, desc: t('settings.desktopDesc') },
                { label: t('settings.tablet'), icon: Globe, desc: t('settings.tabletDesc') },
                { label: t('settings.mobile'), icon: Smartphone, desc: t('settings.mobileDesc') },
              ].map((mode, i) => (
                <button
                  key={mode.label}
                  className={`p-3 rounded-xl border text-center transition-colors ${
                    i === 0
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <mode.icon className={`w-5 h-5 mx-auto mb-1 ${i === 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="text-xs font-medium">{mode.label}</div>
                  <div className="text-[10px] text-gray-500">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-400" /> {t('settings.notifications')}
          </h2>
          <div className="space-y-4">
            {[
              { label: t('settings.thresholdBreach'), desc: t('settings.thresholdBreachDesc'), checked: true },
              { label: t('settings.teamSOS'), desc: t('settings.teamSOSDesc'), checked: true },
              { label: t('settings.newMeasurementReports'), desc: t('settings.newMeasurementReportsDesc'), checked: false },
              { label: t('settings.missionStatusChanges'), desc: t('settings.missionStatusChangesDesc'), checked: true },
              { label: t('settings.visitorFlagging'), desc: t('settings.visitorFlaggingDesc'), checked: true },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={item.checked}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
              </div>
            ))}
          </div>
        </div>

        {/* User profile */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" /> {t('settings.userProfile')}
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">JD</div>
            <div>
              <div className="font-bold">John Doe</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('user.role')}</div>
              <div className="text-xs text-gray-400">john.doe@ecms.gov · Level 3 Clearance</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('settings.fullName')}</label>
              <input type="text" defaultValue="John Doe" className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('settings.email')}</label>
              <input type="email" defaultValue="john.doe@ecms.gov" className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400" /> {t('settings.systemInfo')}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: t('settings.version'), value: 'ECMS v2.4.1' },
              { label: t('settings.serverStatus'), value: t('settings.operational') },
              { label: t('settings.lastUpdate'), value: 'Apr 4, 2026 22:30' },
              { label: t('settings.activeSessions'), value: '12' },
              { label: t('settings.dataRetention'), value: `90 ${t('settings.days')}` },
              { label: t('settings.mapProvider'), value: 'OpenStreetMap' },
            ].map(info => (
              <div key={info.label}>
                <div className="text-xs text-gray-500 dark:text-gray-400">{info.label}</div>
                <div className="font-medium">{info.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
