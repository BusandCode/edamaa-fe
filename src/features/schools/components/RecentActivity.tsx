import React from 'react';
import { FaUserGraduate, FaCheckCircle, FaCreditCard } from 'react-icons/fa';

type ActivityType = 'enrollment' | 'completion' | 'payment';

interface Activity {
  id: number;
  type: ActivityType;
  student: string;
  course?: string;
  amount?: string;
  time: string;
}

const RecentActivity: React.FC = () => {
  const activities: Activity[] = [
    { id: 1, type: 'enrollment', student: 'John Doe', course: 'Mathematics', time: '2 hours ago' },
    { id: 2, type: 'completion', student: 'Jane Smith', course: 'Physics', time: '5 hours ago' },
    { id: 3, type: 'payment', student: 'Mike Johnson', amount: '₦15,000', time: '1 day ago' },
  ];

  return (
    <div className='bg-white rounded-2xl p-5 shadow-sm'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-base font-bold text-gray-900'>Recent Activity</h3>
        <button className='text-xs text-[#3D08BA] font-medium hover:underline'>View All</button>
      </div>
      <div className='space-y-3'>
        {activities.map((activity) => (
          <div key={activity.id} className='flex items-start gap-3 p-3 bg-gray-50 rounded-lg'>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              activity.type === 'enrollment' ? 'bg-blue-100' :
              activity.type === 'completion' ? 'bg-green-100' : 'bg-orange-100'
            }`}>
              {activity.type === 'enrollment' && <FaUserGraduate className='text-blue-600 text-xs' />}
              {activity.type === 'completion' && <FaCheckCircle className='text-green-600 text-xs' />}
              {activity.type === 'payment' && <FaCreditCard className='text-orange-600 text-xs' />}
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-gray-900'>{activity.student}</p>
              <p className='text-xs text-gray-600'>
                {activity.type === 'enrollment' && `Enrolled in ${activity.course}`}
                {activity.type === 'completion' && `Completed ${activity.course}`}
                {activity.type === 'payment' && `Payment received: ${activity.amount}`}
              </p>
              <p className='text-xs text-gray-500 mt-1'>{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;