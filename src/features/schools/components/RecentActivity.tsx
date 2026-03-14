import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaCheckCircle, FaClipboardCheck, FaClock, FaUserPlus } from 'react-icons/fa';
import {
  fetchSchoolScheduleActivity,
  type SchoolScheduleActivityItem,
} from '../utils/schoolScheduleApi';

type Activity = {
  id: string;
  type: SchoolScheduleActivityItem['type'];
  title: string;
  detail: string;
  time: string;
};

const RecentActivity: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const loadActivity = async () => {
      setIsLoading(true);
      try {
        const payload = await fetchSchoolScheduleActivity({ limit: 8 });
        if (!active) {
          return;
        }
        const mapped = (payload.activities || []).map((activity) => ({
          id: activity.id,
          type: activity.type,
          title: activity.title,
          detail: activity.detail,
          time: activity.createdAtLabel,
        }));
        setActivities(mapped);
        setNotice('');
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Could not load recent activity right now.';
        setNotice(message);
        setActivities([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadActivity();
    return () => {
      active = false;
    };
  }, []);

  const emptyState = useMemo(
    () =>
      !isLoading && activities.length === 0
        ? 'No recent activity yet. Class events, teacher invites, and live sessions will appear here.'
        : '',
    [activities.length, isLoading]
  );

  const activityStyle = (type: SchoolScheduleActivityItem['type']) => {
    if (
      type === 'class_live' ||
      type === 'class_upcoming' ||
      type === 'class_created' ||
      type === 'class_updated'
    ) {
      return { icon: FaClipboardCheck, bg: 'bg-[#3D08BA]/10', text: 'text-[#3D08BA]' };
    }
    if (type === 'invite_sent') {
      return { icon: FaUserPlus, bg: 'bg-amber-100', text: 'text-amber-700' };
    }
    if (type === 'invite_accepted') {
      return { icon: FaCheckCircle, bg: 'bg-emerald-100', text: 'text-emerald-700' };
    }
    if (type === 'attendance_recorded') {
      return { icon: FaClipboardCheck, bg: 'bg-sky-100', text: 'text-sky-700' };
    }
    return { icon: FaBell, bg: 'bg-gray-100', text: 'text-gray-600' };
  };

  return (
    <div className='bg-white rounded-2xl p-5 shadow-sm'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-base font-bold text-gray-900'>Recent Activity</h3>
        <button
          onClick={() => navigate('/school-schedule')}
          className='text-xs text-[#3D08BA] font-medium hover:underline'
        >
          View All
        </button>
      </div>
      {notice && (
        <div className='mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'>
          {notice}
        </div>
      )}
      {isLoading && (
        <div className='rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 text-xs text-gray-500'>
          Loading activity feed...
        </div>
      )}
      {emptyState && (
        <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-600'>
          {emptyState}
        </div>
      )}
      <div className='space-y-3'>
        {activities.map((activity) => {
          const style = activityStyle(activity.type);
          const Icon = style.icon;
          return (
            <div key={activity.id} className='flex items-start gap-3 rounded-lg bg-gray-50 p-3'>
              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${style.bg}`}>
                <Icon className={`${style.text} text-xs`} />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-semibold text-gray-900'>{activity.title}</p>
                <p className='text-xs text-gray-600'>{activity.detail}</p>
                <p className='mt-1 flex items-center gap-1 text-xs text-gray-500'>
                  <FaClock className='text-[10px]' />
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentActivity;
