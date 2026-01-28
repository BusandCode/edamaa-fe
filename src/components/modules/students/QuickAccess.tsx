import {
  BookOpenIcon,
  ClipboardDocumentListIcon,
  VideoCameraIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

interface QuickAccessItem {
  label: string;
  icon: any;
  color: string;
  live?: boolean;
  onClick?: () => void;
}

interface QuickAccessGridProps {
  onSubjectClick: () => void;
  onAssignmentsClick: () => void;
  onPerformanceClick: () => void;
}

const QuickAccessGrid = ({
  onSubjectClick,
  onAssignmentsClick,
  onPerformanceClick,
}: QuickAccessGridProps) => {
  const quickAccessItems: QuickAccessItem[] = [
    {
      label: 'My Subjects',
      icon: BookOpenIcon,
      color: 'from-blue-500 to-blue-700',
      onClick: onSubjectClick,
    },
    {
      label: 'Assignments',
      icon: ClipboardDocumentListIcon,
      color: 'from-green-500 to-green-700',
      onClick: onAssignmentsClick,
    },
    {
      label: 'Join Class',
      icon: VideoCameraIcon,
      color: 'from-red-500 to-red-700',
      live: true,
    },
    {
      label: 'Performance Report',
      icon: ChartBarIcon,
      color: 'from-purple-500 to-purple-700',
      onClick: onPerformanceClick,
    },
    {
      label: 'Resource Library',
      icon: DocumentTextIcon,
      color: 'from-orange-500 to-orange-700',
    },
    {
      label: 'Payment & Subscriptions',
      icon: CreditCardIcon,
      color: 'from-yellow-500 to-yellow-700',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Access</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {quickAccessItems.map(({ label, icon: Icon, color, live, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="relative group bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-[#3D08BA] hover:shadow-lg transition-all duration-200"
          >
            {live && (
              <span className="absolute top-2 right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}

            <div
              className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200`}
            >
              <Icon className="w-8 h-8 text-white" />
            </div>

            <p className="text-sm font-semibold text-gray-900 text-center">
              {label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickAccessGrid;