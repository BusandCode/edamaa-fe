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
import {
  fetchSchoolScheduleNotifications,
  markAllSchoolScheduleNotificationsAsRead,
  markSchoolScheduleNotificationAsRead,
  verifySchoolTeacherAccess,
  type SchoolScheduleNotification,
} from '../../schools/utils/schoolScheduleApi';
import {
  archiveStudentExamNotification,
  fetchStudentExamNotifications,
  markAllStudentExamNotificationsAsRead,
  markStudentExamNotificationAsRead,
  type StudentExamNotification,
} from '../../schools/utils/examsApi';

export interface Notification {
  id: string;
  type: 'assignment' | 'grade' | 'announcement' | 'reminder' | 'achievement';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt?: string;
  source?: 'seed' | 'schedule' | 'local' | 'exam';
  scheduleKind?: SchoolScheduleNotification['kind'];
  scheduleSessionId?: string;
  scheduleAction?: SchoolScheduleNotification['action'];
  examId?: string;
  examDepartment?: string;
  examClassGroup?: string;
}

const SCHEDULE_NOTIFICATION_PREFIX = 'schedule:';
const EXAM_NOTIFICATION_PREFIX = 'exam:';

const toScheduleLocalId = (notificationId: string) =>
  `${SCHEDULE_NOTIFICATION_PREFIX}${String(notificationId || '').trim()}`;

const isScheduleLocalId = (notificationId: string) =>
  String(notificationId || '').startsWith(SCHEDULE_NOTIFICATION_PREFIX);

const fromScheduleLocalId = (notificationId: string) =>
  String(notificationId || '').slice(SCHEDULE_NOTIFICATION_PREFIX.length);

const toExamLocalId = (notificationId: string) =>
  `${EXAM_NOTIFICATION_PREFIX}${String(notificationId || '').trim()}`;

const isExamLocalId = (notificationId: string) =>
  String(notificationId || '').startsWith(EXAM_NOTIFICATION_PREFIX);

const fromExamLocalId = (notificationId: string) =>
  String(notificationId || '').slice(EXAM_NOTIFICATION_PREFIX.length);

const mergeNotifications = (existing: Notification[], incoming: Notification[]) => {
  const map = new Map<string, Notification>();
  existing.forEach((notification) => {
    map.set(notification.id, notification);
  });
  incoming.forEach((notification) => {
    map.set(notification.id, notification);
  });

  return Array.from(map.values()).sort((a, b) => {
    const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTs - aTs;
  });
};

const mapScheduleNotificationToLocal = (notification: SchoolScheduleNotification): Notification => ({
  id: toScheduleLocalId(notification.id),
  type: notification.kind === 'canceled' ? 'reminder' : 'announcement',
  title: notification.title,
  message: notification.message,
  time: notification.createdAtLabel,
  isRead: notification.isRead,
  priority: notification.priority,
  createdAt: notification.createdAt,
  source: 'schedule',
  scheduleKind: notification.kind,
  scheduleSessionId: notification.sessionId,
  scheduleAction: notification.action || null,
});

const formatRelativeLabel = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return 'Recently';
  }

  const diffMinutes = Math.round((Date.now() - timestamp) / 60000);
  if (diffMinutes <= 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} mins ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return new Date(value).toLocaleString();
};

const mapExamNotificationToLocal = (notification: StudentExamNotification): Notification => ({
  id: toExamLocalId(notification.id),
  type: 'grade',
  title: notification.title,
  message: notification.message,
  time: formatRelativeLabel(notification.createdAt),
  isRead: notification.isRead,
  priority: notification.isRead ? 'low' : 'medium',
  createdAt: notification.createdAt,
  source: 'exam',
  examId: notification.examId,
  examDepartment: notification.department,
  examClassGroup: notification.classGroup,
});

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
      try {
        const notifications = JSON.parse(stored) as Notification[];
        if (Array.isArray(notifications)) {
          return notifications.filter(n => !n.isRead).length;
        }
      } catch {
        // Fall through to initial notifications if local cache is invalid.
      }
    }
  }
  return initialNotifications.filter(n => !n.isRead).length;
};

// Helper function to trigger storage event for cross-component sync
const triggerStorageUpdate = () => {
  window.dispatchEvent(new Event('notificationsUpdated'));
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
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch {
          // Fall through to seeded notifications.
        }
      }
    }
    return initialNotifications;
  });

  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [isSyncingSchedule, setIsSyncingSchedule] = useState(false);
  const [activeReadActionId, setActiveReadActionId] = useState<string | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [activeLaunchActionId, setActiveLaunchActionId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState('');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    let cancelled = false;

    const syncNotifications = async () => {
      setIsSyncingSchedule(true);
      try {
        const [schedulePayload, examPayload] = await Promise.all([
          fetchSchoolScheduleNotifications().catch(() => null),
          fetchStudentExamNotifications().catch(() => null),
        ]);

        if (cancelled) {
          return;
        }

        const scheduleNotifications = schedulePayload
          ? schedulePayload.notifications.map(mapScheduleNotificationToLocal)
          : [];
        const examNotifications = examPayload
          ? examPayload.notifications.map(mapExamNotificationToLocal)
          : [];

        setNotifications((previous) =>
          mergeNotifications(previous, [...scheduleNotifications, ...examNotifications])
        );
      } catch {
        // Leave existing local notifications as-is if remote feeds are unavailable.
      } finally {
        if (!cancelled) {
          setIsSyncingSchedule(false);
        }
      }
    };

    void syncNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  // Update localStorage and notify parent when notifications change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify(notifications));
      // Trigger custom event to sync with dashboard
      triggerStorageUpdate();
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

  const markAsRead = async (id: string) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );

    setActiveReadActionId(id);
    try {
      if (isScheduleLocalId(id)) {
        await markSchoolScheduleNotificationAsRead(fromScheduleLocalId(id));
      } else if (isExamLocalId(id)) {
        await markStudentExamNotificationAsRead(fromExamLocalId(id));
      }
    } catch {
      // Keep optimistic local read state to avoid a disruptive UX.
    } finally {
      setActiveReadActionId(null);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((previous) => previous.map((notification) => ({ ...notification, isRead: true })));

    const hasUnreadScheduleNotifications = notifications.some(
      (notification) => !notification.isRead && isScheduleLocalId(notification.id)
    );
    const hasUnreadExamNotifications = notifications.some(
      (notification) => !notification.isRead && isExamLocalId(notification.id)
    );

    if (!hasUnreadScheduleNotifications && !hasUnreadExamNotifications) {
      return;
    }

    setIsMarkingAllRead(true);
    try {
      await Promise.all([
        hasUnreadScheduleNotifications ? markAllSchoolScheduleNotificationsAsRead() : Promise.resolve(),
        hasUnreadExamNotifications ? markAllStudentExamNotificationsAsRead() : Promise.resolve(),
      ]);
    } catch {
      // Keep optimistic local read state to avoid a disruptive UX.
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const deleteNotification = (id: string) => {
    const nextNotifications = notifications.filter((notification) => notification.id !== id);
    setNotifications(nextNotifications);
    setSelectedNotification(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify(nextNotifications));
      triggerStorageUpdate();
    }
  };

  const copyInviteDetails = async (notification: Notification) => {
    if (!notification.scheduleAction || notification.scheduleAction.type !== 'verify_teacher_access') {
      return;
    }

    const lines = [
      notification.scheduleAction.joinLink ? `Teacher link: ${notification.scheduleAction.joinLink}` : '',
      notification.scheduleAction.code ? `Teacher code: ${notification.scheduleAction.code}` : '',
    ].filter(Boolean);

    if (lines.length === 0) {
      setActionNotice('No teacher access details are available for this class invite.');
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(lines.join('\n'));
      setActionNotice('Teacher link and access code copied.');
      return;
    }

    setActionNotice('Clipboard is unavailable. Please copy the details manually.');
  };

  const canAcceptTeacherClassInvite = (notification: Notification) =>
    notification.source === 'schedule' &&
    notification.scheduleKind === 'class_assignment' &&
    notification.scheduleAction?.type === 'verify_teacher_access';

  const canOpenPublishedResult = (notification: Notification) =>
    notification.source === 'exam' &&
    Boolean(notification.examId && notification.examDepartment && notification.examClassGroup);

  const acceptTeacherClassInvite = async (notification: Notification) => {
    if (!canAcceptTeacherClassInvite(notification) || !notification.scheduleAction) {
      return;
    }

    setActionNotice('');
    setActiveLaunchActionId(notification.id);
    try {
      const payload = await verifySchoolTeacherAccess({
        sessionId: notification.scheduleAction.sessionId,
        token: notification.scheduleAction.token,
        code: notification.scheduleAction.code,
      });

      setNotifications((previous) =>
        previous.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
      );
      setSelectedNotification(null);
      navigate(payload.launch.liveClassPath);
    } catch (error) {
      setActionNotice(
        error instanceof Error
          ? error.message
          : 'Could not verify your class invite right now. Please retry.'
      );
    } finally {
      setActiveLaunchActionId(null);
    }
  };

  const openPublishedResult = (notification: Notification) => {
    if (!canOpenPublishedResult(notification)) {
      return;
    }

    const params = new URLSearchParams({
      examId: notification.examId || '',
      department: notification.examDepartment || '',
      classGroup: notification.examClassGroup || '',
      view: 'result',
    });
    void markAsRead(notification.id);
    navigate(`/student-exams?${params.toString()}`);
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
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => void markAllAsRead()}
                disabled={isMarkingAllRead}
                className="px-4 py-2 text-sm font-medium text-[#3D08BA] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isMarkingAllRead ? 'Updating...' : 'Mark all read'}
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
        {isSyncingSchedule && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Syncing latest class updates...
          </div>
        )}
        {actionNotice && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {actionNotice}
          </div>
        )}

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
                  void markAsRead(notification.id);
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
                    <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
                      {canAcceptTeacherClassInvite(notification) && notification.scheduleAction && (
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                          <p className="font-semibold">Teacher access details</p>
                          <p className="mt-1">
                            Code:{' '}
                            <span className="font-semibold tracking-widest">
                              {notification.scheduleAction.code}
                            </span>
                          </p>
                          {notification.scheduleAction.joinLink && (
                            <p className="mt-1 break-all">
                              Link: {notification.scheduleAction.joinLink}
                            </p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void copyInviteDetails(notification);
                            }}
                            className="mt-2 inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100"
                          >
                            Copy link + code
                          </button>
                        </div>
                      )}

                      {canOpenPublishedResult(notification) && (
                        <div className="rounded-lg border border-[#3D08BA]/10 bg-[#3D08BA]/5 px-3 py-2 text-xs text-[#3D08BA]">
                          <p className="font-semibold">Published exam result</p>
                          <p className="mt-1">
                            Open your released result directly from this notification.
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (isExamLocalId(notification.id)) {
                            try {
                              await archiveStudentExamNotification(fromExamLocalId(notification.id));
                            } catch {
                              // Keep local deletion to avoid a disruptive UX.
                            }
                          }
                          deleteNotification(notification.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                      {canAcceptTeacherClassInvite(notification) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void acceptTeacherClassInvite(notification);
                          }}
                          disabled={activeLaunchActionId === notification.id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium text-sm hover:bg-green-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          {activeLaunchActionId === notification.id
                            ? 'Verifying...'
                            : 'Accept & start class'}
                        </button>
                      )}
                      {canOpenPublishedResult(notification) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPublishedResult(notification);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#3D08BA]/10 text-[#3D08BA] rounded-lg font-medium text-sm hover:bg-[#3D08BA]/20 transition-colors"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Open result
                        </button>
                      )}
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void markAsRead(notification.id);
                          }}
                          disabled={activeReadActionId === notification.id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#3D08BA]/10 text-[#3D08BA] rounded-lg font-medium text-sm hover:bg-[#3D08BA]/20 transition-colors"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          {activeReadActionId === notification.id ? 'Updating...' : 'Mark as read'}
                        </button>
                      )}
                      </div>
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
