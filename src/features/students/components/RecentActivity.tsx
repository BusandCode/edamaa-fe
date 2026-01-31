import {
  CheckCircleIcon,
  DocumentTextIcon,
  TrophyIcon,
  ChatBubbleLeftIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

interface ActivityItem {
  id: string;
  type: 'assignment' | 'achievement' | 'comment' | 'reading';
  title: string;
  description: string;
  time: string;
  icon: any;
  color: string;
}

const RecentActivity = () => {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'assignment',
      title: 'Assignment Submitted',
      description: 'Calculus Problem Set #5 - Scored 95/100',
      time: '2 hours ago',
      icon: CheckCircleIcon,
      color: 'text-green-600 bg-green-50',
    },
    {
      id: '2',
      type: 'achievement',
      title: 'Achievement Unlocked',
      description: 'Completed 10 assignments this month',
      time: '5 hours ago',
      icon: TrophyIcon,
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      id: '3',
      type: 'comment',
      title: 'New Comment',
      description: 'Dr. Johnson commented on your Physics lab report',
      time: '1 day ago',
      icon: ChatBubbleLeftIcon,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      id: '4',
      type: 'reading',
      title: 'Reading Completed',
      description: 'Chapter 7: Thermodynamics - Chemistry',
      time: '2 days ago',
      icon: BookOpenIcon,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      id: '5',
      type: 'assignment',
      title: 'Assignment Graded',
      description: 'English Essay on Shakespeare - Scored 88/100',
      time: '3 days ago',
      icon: DocumentTextIcon,
      color: 'text-orange-600 bg-orange-50',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
        {/* <button className="text-sm text-[#3D08BA] hover:text-[#2D0690] font-medium">
          View All
        </button> */}
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex items-start gap-4">
            {/* Timeline Line */}
            <div className="relative flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full ${activity.color} flex items-center justify-center shrink-0`}>
                <activity.icon className="w-5 h-5" />
              </div>
              {index !== activities.length - 1 && (
                <div className="w-px h-full bg-gray-200 mt-2"></div>
              )}
            </div>

            {/* Activity Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {activity.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {activity.description}
                  </p>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;