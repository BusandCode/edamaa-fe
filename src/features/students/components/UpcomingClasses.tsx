import { CalendarIcon, ClockIcon, VideoCameraIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface ClassItem {
  id: string;
  subject: string;
  teacher: string;
  time: string;
  duration: string;
  isLive: boolean;
  roomId: string;
  students: number;
  topic: string;
}

const UpcomingClasses = () => {
  const classes: ClassItem[] = [
    {
      id: '1',
      subject: 'Mathematics',
      teacher: 'Dr. Adetokunbo Andrew',
      time: 'Today, 2:00 PM',
      duration: '1 hour',
      isLive: true,
      roomId: 'MATH-101',
      students: 45,
      topic: 'Calculus: Derivatives and Applications'
    },
    {
      id: '2',
      subject: 'Physics',
      teacher: 'Prof. Sobowale Olamide',
      time: 'Today, 4:30 PM',
      duration: '1.5 hours',
      isLive: false,
      roomId: 'PHY-201',
      students: 38,
      topic: 'Quantum Mechanics: Wave Functions'
    },
    {
      id: '3',
      subject: 'Computer Science',
      teacher: 'Prof. Andrew',
      time: 'Tomorrow, 10:00 AM',
      duration: '2 hours',
      isLive: false,
      roomId: 'CS-301',
      students: 60,
      topic: 'Data Structures: Trees and Graphs'
    },
    {
      id: '4',
      subject: 'Chemistry',
      teacher: 'Mide Code',
      time: 'Tomorrow, 2:00 PM',
      duration: '1.5 hours',
      isLive: false,
      roomId: 'CHEM-202',
      students: 42,
      topic: 'Organic Chemistry: Reaction Mechanisms'
    },
    {
      id: '5',
      subject: 'English Literature',
      teacher: 'Dr. Ajayi Olubukunmi',
      time: 'Wed, 11:00 AM',
      duration: '1 hour',
      isLive: false,
      roomId: 'ENG-102',
      students: 52,
      topic: 'Modernist Poetry Analysis'
    },
  ];

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Upcoming Classes</h2>
        <button className="text-sm text-[#3D08BA] hover:text-[#2D0690] font-medium self-start sm:self-auto">
          View All →
        </button>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {classes.map((classItem) => (
          <div
            key={classItem.id}
            className="relative border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200"
          >
            {/* Live Badge */}
            {classItem.isLive && (
              <div className="absolute -top-2 -right-2 sm:-top-2 sm:-right-2">
                <span className="relative flex h-5 w-14 sm:h-6 sm:w-16 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full bg-red-400 px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white">
                    LIVE
                  </span>
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              {/* Icon Badge */}
              <div className="hidden sm:flex w-12 h-12 rounded-lg bg-[#3D08BA] items-center justify-center shrink-0">
                <VideoCameraIcon className="w-6 h-6 text-white" />
              </div>

              {/* Class Details */}
              <div className="flex-1 min-w-0">
                {/* Mobile Icon & Subject */}
                <div className="flex items-start gap-3 mb-2">
                  <div className="sm:hidden w-10 h-10 rounded-lg bg-[#3D08BA] flex items-center justify-center shrink-0">
                    <VideoCameraIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                      {classItem.subject}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">{classItem.teacher}</p>
                  </div>
                </div>

                {/* Topic */}
                <p className="text-sm text-gray-700 mb-2 sm:mb-3 line-clamp-1 sm:line-clamp-2">
                  {classItem.topic}
                </p>

                {/* Meta Information */}
                <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{classItem.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{classItem.duration}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                    <UserGroupIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{classItem.students} students</span>
                  </div>
                  <div className="text-gray-400 text-xs">
                    {classItem.roomId}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex sm:block mt-2 sm:mt-0">
                <button
                  className={`w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${
                    classItem.isLive
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {classItem.isLive ? 'Join Now' : 'Set Reminder'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State (if needed) */}
      {classes.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <CalendarIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">No upcoming classes</h3>
          <p className="text-sm text-gray-600">Check back later for new classes</p>
        </div>
      )}
    </div>
  );
};

export default UpcomingClasses;