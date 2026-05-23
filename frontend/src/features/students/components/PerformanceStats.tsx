import {
  AcademicCapIcon,
  ChartBarIcon,
  ClockIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType } from 'react';

export interface StatCard {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

type PerformanceStatsProps = {
  stats?: StatCard[];
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  notice?: string | null;
};

const defaultStats: StatCard[] = [
    {
      id: '1',
      label: 'Average score',
      value: '84%',
      change: 'Published assessments only',
      trend: 'up',
      icon: ChartBarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: '2',
      label: 'Published results',
      value: '6',
      change: 'Recent released exams',
      trend: 'up',
      icon: AcademicCapIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      id: '3',
      label: 'Best subject',
      value: 'Biology',
      change: 'Highest average so far',
      trend: 'up',
      icon: FireIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      id: '4',
      label: 'Awaiting release',
      value: '2',
      change: 'Still under review',
      trend: 'neutral',
      icon: ClockIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

const PerformanceStats = ({
  stats = defaultStats,
  title = 'Academic snapshot',
  subtitle = 'Recent result indicators from your published assessments.',
  isLoading = false,
  notice = null,
}: PerformanceStatsProps) => {
  if (notice) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
        {notice}
      </div>
    );
  }

  return (
    <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
      <div className="mb-4 sm:mb-5">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">{subtitle}</p>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-5 text-sm text-gray-500">
          Loading academic summary...
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {stat.trend === 'up' && (
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                    ↑
                  </span>
                )}
                {stat.trend === 'down' && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                    ↓
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.change}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerformanceStats;
