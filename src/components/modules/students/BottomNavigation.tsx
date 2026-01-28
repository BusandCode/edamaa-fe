import {
  HomeIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface BottomNavigationProps {
  activeTab?: 'student-dashboard' | 'subjects' | 'assignments' | 'performance';
  onHomeClick?: () => void;
  onSubjectsClick?: () => void;
  onAssignmentsClick?: () => void;
  onPerformanceClick?: () => void;
}

const BottomNavigation = ({
  activeTab = 'student-dashboard',
  onHomeClick,
  onSubjectsClick,
  onAssignmentsClick,
  onPerformanceClick,
}: BottomNavigationProps) => {
  const getButtonClass = (tab: string) => {
    return `flex flex-col items-center gap-1 transition-colors ${
      activeTab === tab ? 'text-[#3D08BA]' : 'text-gray-600 hover:text-[#3D08BA]'
    }`;
  };

  const getTextClass = (tab: string) => {
    return `text-xs ${activeTab === tab ? 'font-medium' : ''}`;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 shadow-lg">
      <div className="flex items-center justify-around">
        <button 
          onClick={onHomeClick}
          className={getButtonClass('student-dashboard')}
          aria-label="Home"
        >
          <HomeIcon className="w-6 h-6" />
          <span className={getTextClass('student-dashboard')}>Home</span>
        </button>
        
        <button
          onClick={onSubjectsClick}
          className={getButtonClass('subjects')}
          aria-label="Subjects"
        >
          <BookOpenIcon className="w-6 h-6" />
          <span className={getTextClass('subjects')}>Subjects</span>
        </button>
        
        <button
          onClick={onAssignmentsClick}
          className={getButtonClass('assignments')}
          aria-label="Assignments"
        >
          <ClipboardDocumentListIcon className="w-6 h-6" />
          <span className={getTextClass('assignments')}>Tasks</span>
        </button>
        
        <button
          onClick={onPerformanceClick}
          className={getButtonClass('performance')}
          aria-label="Performance"
        >
          <ChartBarIcon className="w-6 h-6" />
          <span className={getTextClass('performance')}>Progress</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;