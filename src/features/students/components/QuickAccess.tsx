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
  live?: boolean;
  onClick?: () => void;
}

interface QuickAccessGridProps {
  onCoursesClick: () => void;
  onAssignmentsClick: () => void;
  onPerformanceClick: () => void;
  onJoinClass: () => void;
}

const QuickAccessGrid = ({
  onCoursesClick,
  onAssignmentsClick,
  onPerformanceClick,
  onJoinClass,
}: QuickAccessGridProps) => {
  const quickAccessItems: QuickAccessItem[] = [
    {
      label: 'My Courses',
      icon: BookOpenIcon,
      onClick: onCoursesClick,
    },
    {
      label: 'Assignments',
      icon: ClipboardDocumentListIcon,
      onClick: onAssignmentsClick,
    },
    {
      label: 'Join Class',
      icon: VideoCameraIcon,
      live: true,
      onClick: onJoinClass,
    },
    {
      label: 'Performance',
      icon: ChartBarIcon,
      onClick: onPerformanceClick,
    },
    {
      label: 'Resources',
      icon: DocumentTextIcon,
    },
    {
      label: 'Payments',
      icon: CreditCardIcon,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Quick Access</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {quickAccessItems.map(({ label, icon: Icon, live, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="relative group bg-white border border-gray-200 rounded-xl p-3 sm:p-4 hover:border-[#3D08BA] transition-all"
          >
            {live && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}

            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-3 rounded-xl bg-[#3D08BA] flex items-center justify-center">
              <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>

            <p className="text-xs sm:text-sm font-semibold text-gray-900 text-center">
              {label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickAccessGrid;