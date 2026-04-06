import { Severity, ReportStatus } from '../data/mockData';

const severityStyles: Record<Severity, string> = {
  safe: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusStyles: Record<ReportStatus, string> = {
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  flagged: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const missionStatusStyles: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const visitorStatusStyles: Record<string, string> = {
  cleared: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  under_observation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  flagged: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

type BadgeType = 'severity' | 'status' | 'mission' | 'priority' | 'visitor';

interface StatusBadgeProps {
  value: string;
  type?: BadgeType;
}

const styleMaps: Record<BadgeType, Record<string, string>> = {
  severity: severityStyles,
  status: statusStyles,
  mission: missionStatusStyles,
  priority: priorityStyles,
  visitor: visitorStatusStyles,
};

export default function StatusBadge({ value, type = 'severity' }: StatusBadgeProps) {
  const styles = styleMaps[type] || severityStyles;
  const cls = styles[value] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  const label = value.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}
