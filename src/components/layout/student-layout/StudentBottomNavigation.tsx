import {
  HomeIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface BottomNavigationProps {
  activeTab?: 'student-dashboard' | 'courses' | 'assignments' | 'performance';
  onHomeClick?: () => void;
  onCoursesClick?: () => void;
  onAssignmentsClick?: () => void;
  onPerformanceClick?: () => void;
}

const StudentBottomNavigation = ({
  activeTab = 'student-dashboard',
  onHomeClick,
  onCoursesClick,
  onAssignmentsClick,
  onPerformanceClick,
}: BottomNavigationProps) => {
  const getButtonClass = (tab: string) => {
    return `flex flex-col items-center gap-0.5 transition-colors ${
      activeTab === tab ? 'text-[#3D08BA]' : 'text-gray-600 hover:text-[#3D08BA]'
    }`;
  };

  const getTextClass = (tab: string) => {
    return `text-[10px] ${activeTab === tab ? 'font-medium' : ''}`;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-40 safe-area-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <button 
          onClick={onHomeClick}
          className={getButtonClass('student-dashboard')}
          aria-label="Home"
        >
          <HomeIcon className="w-5 h-5" />
          <span className={getTextClass('student-dashboard')}>Home</span>
        </button>
        
        <button
          onClick={onCoursesClick}
          className={getButtonClass('courses')}
          aria-label="Courses"
        >
          <BookOpenIcon className="w-5 h-5" />
          <span className={getTextClass('courses')}>Courses</span>
        </button>
        
        <button
          onClick={onAssignmentsClick}
          className={getButtonClass('assignments')}
          aria-label="Assignments"
        >
          <ClipboardDocumentListIcon className="w-5 h-5" />
          <span className={getTextClass('assignments')}>Tasks</span>
        </button>
        
        <button
          onClick={onPerformanceClick}
          className={getButtonClass('performance')}
          aria-label="Performance"
        >
          <ChartBarIcon className="w-5 h-5" />
          <span className={getTextClass('performance')}>Progress</span>
        </button>
      </div>
    </nav>
  );
};

export default StudentBottomNavigation;
