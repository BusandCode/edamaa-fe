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
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-5 md:mb-6">
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Upcoming Classes</h2>
        <button className="text-xs sm:text-sm text-[#3D08BA] hover:text-[#2D0690] font-medium shrink-0 transition-colors">
          View All →
        </button>
      </div>

      {/* Class List */}
      <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
        {classes.map((classItem) => (
          <div
            key={classItem.id}
            className="relative border border-gray-200 rounded-lg sm:rounded-xl overflow-visible hover:shadow-md hover:border-gray-300 transition-all duration-200"
          >
            {/* Live Badge */}
            {classItem.isLive && (
              <div className="absolute -top-2.5 left-3 sm:left-4 z-10">
                <span className="relative flex h-5 w-14 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full bg-red-500 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white tracking-wider uppercase">
                    LIVE
                  </span>
                </span>
              </div>
            )}

            {/* Mobile Layout */}
            <div className="p-3 sm:hidden">
              {/* Top Row: Icon + Subject + Button */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${classItem.isLive ? 'bg-red-500' : 'bg-[#3D08BA]'}`}>
                    <VideoCameraIcon className="w-5 h-5 text-white" />
                  </div>

                  {/* Subject & Teacher */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className="text-sm font-semibold text-gray-900 truncate leading-tight">
                      {classItem.subject}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{classItem.teacher}</p>
                  </div>
                </div>

                {/* Action Button - Mobile */}
                <button
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    classItem.isLive
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {classItem.isLive ? 'Join Now' : 'Remind'}
                </button>
              </div>

              {/* Topic */}
              <p className="text-xs text-gray-600 mt-2 mb-2.5 line-clamp-2 leading-relaxed pl-0">
                {classItem.topic}
              </p>

              {/* Meta Row - Mobile */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span>{classItem.time}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span>{classItem.duration}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <UserGroupIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span>{classItem.students}</span>
                </div>
                <span className="text-xs text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                  {classItem.roomId}
                </span>
              </div>
            </div>

            {/* Tablet & Desktop Layout */}
            <div className="hidden sm:flex sm:items-start gap-4 p-4 md:p-5">
              {/* Icon Badge */}
              <div className={`w-11 h-11 md:w-12 md:h-12 rounded-lg shrink-0 flex items-center justify-center ${classItem.isLive ? 'bg-red-500' : 'bg-[#3D08BA]'}`}>
                <VideoCameraIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Subject + Teacher Row */}
                <div className="flex items-baseline gap-3 mb-1">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                    {classItem.subject}
                  </h3>
                  <span className="text-xs text-gray-500 truncate shrink-0">{classItem.teacher}</span>
                </div>

                {/* Topic */}
                <p className="text-sm text-gray-600 mb-3 line-clamp-1 md:line-clamp-2 leading-relaxed">
                  {classItem.topic}
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <span>{classItem.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <span>{classItem.duration}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserGroupIcon className="w-4 h-4 text-gray-400" />
                    <span>{classItem.students} students</span>
                  </div>
                  <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded">
                    {classItem.roomId}
                  </span>
                </div>
              </div>

              {/* Action Button - Desktop */}
              <div className="shrink-0">
                <button
                  className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    classItem.isLive
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md'
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

      {/* Empty State */}
      {classes.length === 0 && (
        <div className="text-center py-8 sm:py-10 md:py-12">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <CalendarIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">No upcoming classes</h3>
          <p className="text-sm text-gray-500">Check back later for new classes</p>
        </div>
      )}
    </div>
  );
};

export default UpcomingClasses;