import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

interface StatCard {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
  color: string;
  bgColor: string;
}

const PerformanceStats = () => {
  const stats: StatCard[] = [
    {
      id: '1',
      label: 'Current GPA',
      value: '4.85',
      change: '+0.15 from last semester',
      trend: 'up',
      icon: AcademicCapIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: '2',
      label: 'Attendance Rate',
      value: '96%',
      change: '+2% this month',
      trend: 'up',
      icon: CalendarDaysIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      id: '3',
      label: 'Completed Tasks',
      value: '24/28',
      change: '4 pending',
      trend: 'neutral',
      icon: ClipboardDocumentCheckIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      id: '4',
      label: 'Study Streak',
      value: '12 days',
      change: 'Keep it up!',
      trend: 'up',
      icon: FireIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
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
  );
};

export default PerformanceStats;