import {
  MegaphoneIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface Announcement {
  id: string;
  type: 'urgent' | 'info' | 'event';
  title: string;
  message: string;
  date: string;
  icon: any;
  color: string;
  bgColor: string;
}

const Announcements = () => {
  const announcements: Announcement[] = [
    {
      id: '1',
      type: 'urgent',
      title: 'Exam Schedule Released',
      message: 'Mid-semester exams will begin from March 15th. Check your timetable for details.',
      date: 'Posted today',
      icon: ExclamationTriangleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      id: '2',
      type: 'event',
      title: 'Science Fair',
      message: 'Annual Science Fair on February 10th. Register your projects before Feb 5th.',
      date: 'Posted yesterday',
      icon: CalendarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: '3',
      type: 'info',
      title: 'Library Hours Extended',
      message: 'Library now open until 10 PM on weekdays to support your studies.',
      date: '2 days ago',
      icon: InformationCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MegaphoneIcon className="w-6 h-6 text-[#3D08BA]" />
          <h2 className="text-xl font-bold text-gray-900">Announcements</h2>
        </div>
        <button className="text-sm text-[#3D08BA] hover:text-[#2D0690] font-medium">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className={`border-l-4 ${announcement.type === 'urgent' ? 'border-red-500' : announcement.type === 'event' ? 'border-blue-500' : 'border-green-500'} ${announcement.bgColor} p-4 rounded-lg`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full ${announcement.bgColor} flex items-center justify-center flex-shrink-0`}>
                <announcement.icon className={`w-5 h-5 ${announcement.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold ${announcement.color} mb-1`}>
                  {announcement.title}
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  {announcement.message}
                </p>
                <span className="text-xs text-gray-500">{announcement.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Announcements;