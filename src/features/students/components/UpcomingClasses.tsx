import { CalendarIcon, ClockIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

interface ClassItem {
  id: string;
  subject: string;
  teacher: string;
  time: string;
  duration: string;
  isLive: boolean;
  roomId: string;
  color: string;
}



const UpcomingClasses = () => {
  const classes: ClassItem[] = [
    {
      id: '1',
      subject: 'Mathematics',
      teacher: 'Dr. Sarah Johnson',
      time: 'Today, 2:00 PM',
      duration: '1 hour',
      isLive: true,
      roomId: 'MATH-101',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: '2',
      subject: 'Physics',
      teacher: 'Prof. Michael Chen',
      time: 'Today, 4:30 PM',
      duration: '1.5 hours',
      isLive: false,
      roomId: 'PHY-201',
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: '3',
      subject: 'Chemistry',
      teacher: 'Dr. Emily Brown',
      time: 'Tomorrow, 10:00 AM',
      duration: '2 hours',
      isLive: false,
      roomId: 'CHEM-301',
      color: 'from-green-500 to-green-600',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Upcoming Classes</h2>
        <button className="text-sm text-[#3D08BA] hover:text-[#2D0690] font-medium">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {classes.map((classItem) => (
          <div
            key={classItem.id}
            className="relative border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {classItem.isLive && (
              <div className="absolute -top-2 -right-2">
                <span className="relative flex h-6 w-16 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                    LIVE
                  </span>
                </span>
              </div>
            )}

            <div className="flex items-start gap-4">
              {/* Color Badge */}
              <div className={`w-12 h-12 rounded-lg bg-linear-to-br ${classItem.color} flex items-center justify-center shrink-0`}>
                <VideoCameraIcon className="w-6 h-6 text-white" />
              </div>

              {/* Class Details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {classItem.subject}
                </h3>
                <p className="text-sm text-gray-600 mb-2">{classItem.teacher}</p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{classItem.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>{classItem.duration}</span>
                  </div>
                  <div className="text-gray-400">
                    Room: {classItem.roomId}
                  </div>
                </div>
              </div>

              {/* Join Button */}
              <button
                // onClick={() => onJoinClass(classItem.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors shrink-0 ${
                  classItem.isLive
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {classItem.isLive ? 'Join Now' : 'Set Reminder'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingClasses;