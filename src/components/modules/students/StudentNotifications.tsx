import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  BookOpenIcon,
  ClockIcon,
  TrophyIcon,
  ArrowLeftIcon,
  TrashIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';

export interface Notification {
  id: string;
  type: 'assignment' | 'grade' | 'announcement' | 'reminder' | 'achievement';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
}

// Initial notifications data
export const initialNotifications: Notification[] = [
  {
    id: '1',
    type: 'assignment',
    title: 'New Assignment Posted',
    message: 'Mathematics: Calculus Problem Set Due in 2 days',
    time: '5 minutes ago',
    isRead: false,
    priority: 'high',
  },
  {
    id: '2',
    type: 'grade',
    title: 'Grade Published',
    message: 'Your Physics Lab Report score is now available: 95/100',
    time: '1 hour ago',
    isRead: false,
    priority: 'medium',
  },
  {
    id: '3',
    type: 'achievement',
    title: 'Achievement Unlocked! 🎉',
    message: 'You\'ve completed 10 assignments this month!',
    time: '3 hours ago',
    isRead: false,
    priority: 'low',
  },
  {
    id: '4',
    type: 'announcement',
    title: 'Class Rescheduled',
    message: 'Chemistry class moved to 3:00 PM tomorrow',
    time: '5 hours ago',
    isRead: true,
    priority: 'high',
  },
  {
    id: '5',
    type: 'reminder',
    title: 'Upcoming Deadline',
    message: 'English Essay submission deadline is tomorrow at 11:59 PM',
    time: '1 day ago',
    isRead: true,
    priority: 'high',
  },
  {
    id: '6',
    type: 'announcement',
    title: 'New Study Material',
    message: 'Professor Lee uploaded lecture notes for Chapter 5',
    time: '2 days ago',
    isRead: true,
    priority: 'medium',
  },
  {
    id: '7',
    type: 'grade',
    title: 'Quiz Results',
    message: 'Biology Quiz 3 results: 88/100 - Great job!',
    time: '3 days ago',
    isRead: true,
    priority: 'medium',
  },
];

// Helper function to get unread count from localStorage or initial data
export const getUnreadNotificationCount = (): number => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      const notifications: Notification[] = JSON.parse(stored);
      return notifications.filter(n => !n.isRead).length;
    }
  }
  return initialNotifications.filter(n => !n.isRead).length;
};

interface StudentNotificationsProps {
  onUnreadCountChange?: (count: number) => void;
}

const StudentNotifications = ({ onUnreadCountChange }: StudentNotificationsProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  
  // Initialize from localStorage or use initial data
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return initialNotifications;
  });

  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Update localStorage and notify parent when notifications change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
    onUnreadCountChange?.(unreadCount);
  }, [notifications, unreadCount, onUnreadCountChange]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'assignment':
        return <BookOpenIcon className="w-5 h-5" />;
      case 'grade':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'announcement':
        return <InformationCircleIcon className="w-5 h-5" />;
      case 'reminder':
        return <ClockIcon className="w-5 h-5" />;
      case 'achievement':
        return <TrophyIcon className="w-5 h-5" />;
      default:
        return <BellIcon className="w-5 h-5" />;
    }
  };

  const getIconColor = (type: Notification['type'], priority: string) => {
    if (priority === 'high') return 'text-red-500 bg-red-50';
    
    switch (type) {
      case 'assignment':
        return 'text-[#3D08BA] bg-[#3D08BA]/10';
      case 'grade':
        return 'text-green-600 bg-green-50';
      case 'announcement':
        return 'text-blue-600 bg-blue-50';
      case 'reminder':
        return 'text-orange-600 bg-orange-50';
      case 'achievement':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    setSelectedNotification(null);
  };

  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#3D08BA]">Notifications</h1>
                {unreadCount > 0 && (
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{unreadCount}</span>
                  </div>
                )}
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 text-sm font-medium text-[#3D08BA] hover:bg-gray-100 rounded-lg transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'all'
                  ? 'bg-[#3D08BA] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'unread'
                  ? 'bg-[#3D08BA] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </header>

      {/* Notifications List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BellIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600 text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => {
                  markAsRead(notification.id);
                  setSelectedNotification(selectedNotification === notification.id ? null : notification.id);
                }}
                className={`
                  bg-white rounded-xl border cursor-pointer
                  transition-all duration-200
                  ${notification.isRead 
                    ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm' 
                    : 'border-[#3D08BA]/30 hover:border-[#3D08BA]/50 shadow-sm'
                  }
                  ${selectedNotification === notification.id ? 'ring-2 ring-[#3D08BA] ring-offset-2' : ''}
                `}
              >
                <div className="p-4">
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getIconColor(notification.type, notification.priority)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                          {notification.title}
                        </h3>
                        
                        {/* Action menu */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNotification(selectedNotification === notification.id ? null : notification.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                        >
                          <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>

                      <p className="text-gray-600 text-sm mb-2 leading-relaxed">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {notification.time}
                        </span>
                        
                        {!notification.isRead && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#3D08BA] text-white rounded-full text-xs font-medium">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            New
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded actions */}
                  {selectedNotification === notification.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#3D08BA]/10 text-[#3D08BA] rounded-lg font-medium text-sm hover:bg-[#3D08BA]/20 transition-colors"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Mark as read
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentNotifications;