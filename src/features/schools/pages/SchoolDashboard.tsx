import { useEffect, useMemo, useState } from 'react';
import {
  FaBell,
  FaSearch,
  FaCheckCircle,
  FaChartLine,
  FaCalendarAlt,
  FaVideo,
  FaIdCard,
  FaUsers,
  FaFileAlt,
  FaCertificate,
  FaBook,
  FaCamera,
  FaMoneyBillWave,
  FaHome,
  FaSignOutAlt,
  FaUpload,
  FaUserShield,
} from 'react-icons/fa';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import type { IconType } from 'react-icons';
import NewLogo from '../../../components/common/NewLogo';
import QuickActionButton from '../components/QuickActionButton';
import RecentActivity from '../components/RecentActivity';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../../components/layout/school-layout/NavBar';
import {
  fetchTeachingSubscriptionState,
  type TeachingSubscriptionState,
} from '../../subscriptions/utils/teachingSubscriptionApi';
import {
  archiveSchoolExamNotification,
  fetchSchoolExamNotifications,
  markAllSchoolExamNotificationsAsRead,
  markSchoolExamNotificationAsRead,
  type SchoolExamNotification,
} from '../utils/examsApi';
import { fetchMyAccountRoles, switchDefaultAccountRole } from '../../auth/utils/accountRolesApi';
import { schoolManagementModules, type SchoolModule } from '../data/schoolManagementModules';
import { fetchSchoolScheduleSessions, type SchoolScheduleSession } from '../utils/schoolScheduleApi';
import {
  loadPersistedLocalDevAuthSession,
  loadPersistedAccountRoleState,
  persistAccountRoleState,
  persistLocalDevAuthSession,
} from '../../../utils/authSession';
import { loadSchoolProfileImage, persistSchoolProfileImage } from '../../../utils/schoolBranding';
import { signOutEverywhere } from '../../../utils/signOut';



// Performance Overview Component
const PerformanceOverview = () => {
  return (
    <div className='bg-white rounded-2xl p-5 shadow-sm'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-base font-bold text-gray-900'>Performance Overview</h3>
        <select className='text-xs border border-gray-200 rounded-lg px-2 py-1'>
          <option>This Month</option>
          <option>Last Month</option>
          <option>This Year</option>
        </select>
      </div>
      <div className='space-y-4'>
        <div>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm text-gray-700'>Student Attendance</span>
            <span className='text-sm font-bold text-gray-900'>85%</span>
          </div>
          <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
            <div className='h-full bg-linear-to-r from-blue-500 to-blue-600 rounded-full' style={{ width: '85%' }}></div>
          </div>
        </div>
        <div>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm text-gray-700'>Course Completion</span>
            <span className='text-sm font-bold text-gray-900'>72%</span>
          </div>
          <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
            <div className='h-full bg-linear-to-r from-green-500 to-green-600 rounded-full' style={{ width: '72%' }}></div>
          </div>
        </div>
        <div>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm text-gray-700'>Tutor Availability</span>
            <span className='text-sm font-bold text-gray-900'>92%</span>
          </div>
          <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
            <div className='h-full bg-linear-to-r from-purple-500 to-purple-600 rounded-full' style={{ width: '92%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Upcoming Events Component
const UpcomingEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<SchoolScheduleSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const payload = await fetchSchoolScheduleSessions();
        if (!active) {
          return;
        }
        setEvents(Array.isArray(payload.sessions) ? payload.sessions : []);
        setNotice('');
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Could not load upcoming schedule events.';
        setNotice(message);
        setEvents([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadEvents();
    return () => {
      active = false;
    };
  }, []);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    const withStatus = events
      .map((session) => {
        const startMs = new Date(session.startAt).getTime();
        const endMs = startMs + session.durationMinutes * 60 * 1000;
        let status: 'upcoming' | 'live' | 'completed' = 'upcoming';
        if (Number.isFinite(startMs)) {
          if (now >= startMs && now < endMs) {
            status = 'live';
          } else if (now >= endMs) {
            status = 'completed';
          }
        }
        return { session, status, startMs };
      })
      .filter((entry) => entry.status !== 'completed')
      .sort((a, b) => a.startMs - b.startMs);

    return withStatus.slice(0, 3);
  }, [events]);

  const formatEventDate = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatEventTime = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return '--:--';
    }
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className='bg-white rounded-2xl p-5 shadow-sm'>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <h3 className='text-base font-bold text-gray-900'>Upcoming classes</h3>
          <p className='text-[11px] text-gray-500'>Quick add creates a class; full schedule is for edits and management.</p>
        </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => navigate('/school-schedule')}
              className='text-xs text-gray-500 font-semibold hover:text-gray-700'
            >
              Full schedule
            </button>
            <button
              onClick={() => navigate('/school-schedule', { state: { openCreate: true } })}
              className='text-xs text-[#3D08BA] font-medium hover:underline'
            >
              Quick add class
            </button>
          </div>
      </div>
      {notice && (
        <p className='mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700'>
          {notice}
        </p>
      )}
      <div className='space-y-3'>
        {isLoading && (
          <div className='rounded-lg border border-gray-100 bg-gray-50 px-3 py-4 text-xs text-gray-500'>
            Fetching your next classes...
          </div>
        )}
        {!isLoading && upcomingEvents.length === 0 && (
          <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-600'>
            No classes scheduled yet. Use Quick add to create your first class.
          </div>
        )}
        {!isLoading &&
          upcomingEvents.map(({ session, status }) => (
            <div
              key={session.id}
              className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'
            >
              <div className='w-12 h-12 bg-linear-to-br from-[#3D08BA] to-[#5010E0] rounded-lg flex items-center justify-center shrink-0'>
                <FaCalendarAlt className='text-white text-sm' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <p className='text-sm font-semibold text-gray-900'>{session.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      status === 'live' ? 'bg-red-100 text-red-700' : 'bg-[#3D08BA]/10 text-[#3D08BA]'
                    }`}
                  >
                    {status === 'live' ? 'Live now' : 'Upcoming'}
                  </span>
                </div>
                <p className='text-xs text-gray-600'>
                  {formatEventDate(session.startAt)} • {formatEventTime(session.startAt)} •{' '}
                  {session.subject}
                </p>
                <p className='text-[11px] text-gray-500'>Instructor: {session.instructor}</p>
              </div>
              <button
                onClick={() =>
                  navigate('/school-schedule', { state: { highlightSessionId: session.id } })
                }
                className='text-[11px] font-semibold text-[#3D08BA] hover:underline'
              >
                Open
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};

const ReleaseInbox = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<SchoolExamNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [busyId, setBusyId] = useState<string | 'all' | null>(null);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        const payload = await fetchSchoolExamNotifications();
        if (!active) {
          return;
        }
        setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
        setNotice('');
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Could not load release updates right now.';
        setNotice(message);
        setNotifications([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadNotifications();
    return () => {
      active = false;
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    const scoped =
      filter === 'unread'
        ? notifications.filter((notification) => !notification.isRead)
        : notifications;
    return scoped.slice(0, 4);
  }, [filter, notifications]);

  const formatRelativeTime = (isoDate: string) => {
    const timestamp = new Date(isoDate).getTime();
    if (!Number.isFinite(timestamp)) {
      return 'Recently';
    }
    const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (diffMinutes < 1) {
      return 'Just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hr ago`;
    }
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  const handleMarkAsRead = async (notificationId: string) => {
    setNotice('');
    setBusyId(notificationId);
    try {
      await markSchoolExamNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification
        )
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark this update as read.');
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (notificationId: string) => {
    setNotice('');
    setBusyId(notificationId);
    try {
      await archiveSchoolExamNotification(notificationId);
      setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not remove this update.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    setNotice('');
    setBusyId('all');
    try {
      await markAllSchoolExamNotificationsAsRead();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark all updates as read.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className='bg-white rounded-2xl p-5 shadow-sm'>
      <div className='flex items-start justify-between gap-3 mb-4'>
        <div>
          <div className='flex items-center gap-2'>
            <FaBell className='text-[#3D08BA]' size={13} />
            <h3 className='text-base font-bold text-gray-900'>Release inbox</h3>
          </div>
          <p className='mt-1 text-[11px] text-gray-500'>
            Published exam result updates stay here until you clear them.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <span className='rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700'>
            {unreadCount} unread
          </span>
          <button
            type='button'
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || busyId === 'all'}
            className='rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className='mb-3 flex flex-wrap gap-2'>
        {([
          { value: 'all', label: 'All updates' },
          { value: 'unread', label: 'Unread only' },
        ] as const).map((option) => (
          <button
            key={option.value}
            type='button'
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              filter === option.value
                ? 'bg-[#3D08BA] text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {notice && (
        <p className='mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700'>
          {notice}
        </p>
      )}

      <div className='space-y-3'>
        {isLoading && (
          <div className='rounded-lg border border-gray-100 bg-gray-50 px-3 py-4 text-xs text-gray-500'>
            Loading release updates...
          </div>
        )}
        {!isLoading && notifications.length === 0 && (
          <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-600'>
            No release updates yet. Published exam results will appear here.
          </div>
        )}
        {!isLoading && notifications.length > 0 && visibleNotifications.length === 0 && (
          <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-600'>
            No release updates match this filter.
          </div>
        )}
        {!isLoading &&
          visibleNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-xl border p-3 ${
                notification.isRead
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-amber-200 bg-amber-50/70'
              }`}
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    {!notification.isRead && <span className='h-2 w-2 rounded-full bg-amber-500' />}
                    <p className='text-sm font-semibold text-gray-900'>{notification.title}</p>
                  </div>
                  <p className='mt-1 text-xs leading-5 text-gray-600'>{notification.message}</p>
                  <p className='mt-2 text-[11px] text-gray-400'>{formatRelativeTime(notification.createdAt)}</p>
                </div>
                <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700'>
                  <FaCheckCircle size={12} />
                </span>
              </div>

              <div className='mt-3 flex flex-wrap justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => navigate('/school-exams')}
                  className='rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50'
                >
                  Open exams
                </button>
                {!notification.isRead && (
                  <button
                    type='button'
                    onClick={() => void handleMarkAsRead(notification.id)}
                    disabled={busyId === notification.id}
                    className='rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60'
                  >
                    Mark as read
                  </button>
                )}
                <button
                  type='button'
                  onClick={() => void handleArchive(notification.id)}
                  disabled={busyId === notification.id}
                  className='rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60'
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

const schoolModuleIcons: Record<SchoolModule['iconKey'], IconType> = {
  fees: FaMoneyBillWave,
  timetable: FaCalendarAlt,
  exams: FaFileAlt,
  homework: FaBook,
  certificates: FaCertificate,
  onlineCourses: FaVideo,
  branches: FaUsers,
  library: FaBook,
  attendance: FaCheckCircle,
  hostel: FaHome,
};

const deriveNameFromEmail = (emailValue: string) => {
  const normalizedEmail = String(emailValue || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return '';
  }

  const prefix = normalizedEmail.split('@')[0] || '';
  return prefix
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
};

const deriveInitials = (value: string) => {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return 'SC';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

type IconActionButtonProps = {
  label: string;
  icon: IconType;
  onClick: () => void;
  disabled?: boolean;
};

const IconActionButton = ({ label, icon: Icon, onClick, disabled = false }: IconActionButtonProps) => (
  <button
    type='button'
    onClick={onClick}
    disabled={disabled}
    className='group relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 text-[#3D08BA] transition-colors hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-60'
    aria-label={label}
    title={label}
  >
    <Icon size={14} />
    <span className='pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'>
      {label}
    </span>
  </button>
);

const SchoolDashboard = () => {
  const [profileImage, setProfileImage] = useState<string>('');
  const [schoolDisplayName, setSchoolDisplayName] = useState<string>('School');
  const [adminDisplayName, setAdminDisplayName] = useState<string>('School Admin');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOpeningInternalAdmin, setIsOpeningInternalAdmin] = useState(false);
  const [subscriptionState, setSubscriptionState] = useState<TeachingSubscriptionState | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [gateNotice, setGateNotice] = useState('');
  const [isModuleDetailsOpen, setIsModuleDetailsOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState(schoolManagementModules[0]?.id ?? '');
  const navigate = useNavigate();
  const isSubscriptionActive = Boolean(subscriptionState?.isActive);
  const canOpenInternalAdmin = Boolean(
    loadPersistedAccountRoleState()?.activeRoles?.includes('admin')
  );
  const activeSchoolModule =
    schoolManagementModules.find((module) => module.id === activeModuleId) || schoolManagementModules[0];

  const loadSubscription = async () => {
    setIsSubscriptionLoading(true);
    try {
      const payload = await fetchTeachingSubscriptionState('school');
      setSubscriptionState(payload);
    } catch {
      setSubscriptionState(null);
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    void loadSubscription();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const localStorageSchoolName = (window.localStorage.getItem('edamaa_school_display_name') || '').trim();
    const localStorageAdminName = (window.localStorage.getItem('edamaa_school_admin_name') || '').trim();
    const localDevSession = loadPersistedLocalDevAuthSession();
    const fallbackFromEmail = deriveNameFromEmail(localDevSession?.email || '');
    setSchoolDisplayName(localStorageSchoolName || fallbackFromEmail || 'School');
    setAdminDisplayName(localStorageAdminName || fallbackFromEmail || 'School Admin');
    setProfileImage(loadSchoolProfileImage(localDevSession?.email || ''));
  }, []);

  useEffect(() => {
    let active = true;

    const syncRoleState = async () => {
      try {
        const payload = await fetchMyAccountRoles();
        if (!active) {
          return;
        }

        persistAccountRoleState({
          defaultRole: payload.user.defaultRole,
          activeRoles: payload.activeRoles,
          source: 'backend',
        });

        const localDevSession = loadPersistedLocalDevAuthSession();
        if (localDevSession?.email) {
          persistLocalDevAuthSession(localDevSession.email, payload.user.defaultRole, {
            defaultRole: payload.user.defaultRole,
            activeRoles: payload.activeRoles,
          });
        }
      } catch {
        // Keep existing role cache when backend sync is unavailable.
      }
    };

    void syncRoleState();

    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      await signOutEverywhere();
      navigate('/signin', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const goToSubscription = (message: string) => {
    setGateNotice(message);
    navigate('/subscription?actor=school');
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageDataUrl = String(reader.result || '');
        setProfileImage(imageDataUrl);
        persistSchoolProfileImage(imageDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleStudentListClick = () => {
    navigate('/student-list-school');
  };

  const handleTutorListClick = () => {
    navigate('/tutor-list-school');
  };

  const handleLiveClassesClick = () => {
    if (!isSubscriptionActive) {
      goToSubscription('Live classes are unlocked when your school activates Edamaa Pro.');
      return;
    }

    const liveClassId = `school-live-${Date.now().toString().slice(-6)}`;
    const liveInstructorName = schoolDisplayName || 'School';
    const classItem = {
      id: liveClassId,
      code: 'SCH101',
      name: `${liveInstructorName} Live Class`,
      subject: 'School Session',
      instructor: liveInstructorName,
      schedule: 'Live now',
      students: 40,
      description: 'Live class room managed by school administrators and teachers.',
      level: 'Intermediate' as const,
      duration: '90 mins',
    };

    navigate(`/live-class/${liveClassId}?role=teacher&actor=school`, { state: { classItem } });
  };

  const handleScheduleClick = () => {
    navigate('/school-schedule');
  };

  const handleExamManagementClick = () => {
    navigate('/school-exams');
  };

  const handleWaecPrepClick = () => {
    if (!isSubscriptionActive) {
      goToSubscription('Premium WAEC prep delivery is available on Edamaa Pro.');
      return;
    }

    setGateNotice('WAEC premium module is enabled for your school account.');
  };

  const handleResourceUploadClick = () => {
    navigate('/resources?actor=school&mode=upload');
  };

  const handleOpenInternalAdmin = async () => {
    if (isOpeningInternalAdmin) {
      return;
    }

    setIsOpeningInternalAdmin(true);
    setGateNotice('');
    try {
      const payload = await switchDefaultAccountRole('admin');
      persistAccountRoleState({
        defaultRole: payload.roleState.user.defaultRole,
        activeRoles: payload.roleState.activeRoles,
        source: 'backend',
      });

      const localDevSession = loadPersistedLocalDevAuthSession();
      if (localDevSession?.email) {
        persistLocalDevAuthSession(localDevSession.email, payload.roleState.user.defaultRole, {
          defaultRole: payload.roleState.user.defaultRole,
          activeRoles: payload.roleState.activeRoles,
        });
      }

      navigate('/internal-admin/payouts');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not open internal admin. Please switch role from Account Roles.';
      setGateNotice(message);
      navigate('/account-roles');
    } finally {
      setIsOpeningInternalAdmin(false);
    }
  };

  const handleFinanceClick = () => {
    navigate('/school-finance');
  };

  const openModuleDetails = (moduleId?: string) => {
    if (moduleId) {
      setActiveModuleId(moduleId);
    }
    setIsModuleDetailsOpen(true);
  };

  const closeModuleDetails = () => {
    setIsModuleDetailsOpen(false);
  };

  return (
    <div className='min-h-screen bg-gray-50 pb-20'>
      {/* Header */}
      <header className='bg-white shadow-sm sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 py-4'>
          <div className='flex items-center justify-between gap-3'>
            {/* Logo */}
            <div className='shrink-0'>
              <NewLogo logoWidth={50} logoHeight={50} textSize="text-[13px]" gap="gap-2" centered={false} />
            </div>
            
            {/* Search Bar */}
            <div className='flex-1 min-w-0 max-w-md'>
              <div className='relative'>
                <FaSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={14} />
                <input
                  type='text'
                  placeholder='Search students, tutors, courses...'
                  className='w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] text-sm'
                />
              </div>
            </div>

            <button
              type='button'
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              className='inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
            >
              <FaSignOutAlt size={12} />
              {isSigningOut ? 'Signing out...' : 'Log out'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 py-6'>
        {/* Welcome Section */}
        <div className='bg-white rounded-2xl p-5 mb-6 shadow-sm'>
          <div className='flex items-start gap-4'>
            <div className='relative shrink-0'>
              <div className='w-16 h-16 rounded-full overflow-hidden bg-linear-to-br from-purple-400 to-purple-600'>
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt='School Profile' 
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center text-white text-2xl font-bold'>
                    {deriveInitials(schoolDisplayName)}
                  </div>
                )}
              </div>
              <div className='absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white'></div>
              
              {/* Camera Icon for Upload */}
              <label className='absolute -bottom-1 -right-1 w-6 h-6 bg-[#3D08BA] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#5010E0] transition-colors'>
                <FaCamera className='text-white text-xs' />
                <input 
                  type='file' 
                  accept='image/*' 
                  onChange={handleImageChange}
                  className='hidden'
                />
              </label>
            </div>
            
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h2 className='text-lg sm:text-xl font-bold text-gray-900'>Welcome, {schoolDisplayName}</h2>
                <CheckBadgeIcon className='h-[18px] w-[18px] shrink-0 text-orange-500' />
              </div>
              <p className='text-sm text-gray-600 mt-1'>
                Admin: {adminDisplayName}
              </p>
              <p className='text-xs text-gray-500 mt-0.5'>
                Manage classes, students, and finances from one connected school workspace.
              </p>
            </div>
          </div>
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3'>
            {isSubscriptionLoading ? (
              <p className='text-xs text-gray-600'>Checking school subscription access...</p>
            ) : isSubscriptionActive ? (
              <>
                <p className='text-xs text-emerald-700 font-semibold'>
                  Edamaa Pro active: live teaching and unlimited offline classes are enabled.
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                  <IconActionButton
                    label='Upload Resources'
                    icon={FaUpload}
                    onClick={handleResourceUploadClick}
                  />
                  {canOpenInternalAdmin && (
                    <IconActionButton
                      label={isOpeningInternalAdmin ? 'Opening Internal Admin...' : 'Internal Admin'}
                      icon={FaUserShield}
                      onClick={() => void handleOpenInternalAdmin()}
                      disabled={isOpeningInternalAdmin}
                    />
                  )}
                  <button
                    onClick={() => navigate('/edamaa3d-verified?actor=school')}
                    className='rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100'
                  >
                    View Edamaa3D Verify
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className='text-xs text-[#3D08BA] font-semibold'>
                  Free mode active: live classes are locked until subscription is active.
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                  <IconActionButton
                    label='Upload Resources'
                    icon={FaUpload}
                    onClick={handleResourceUploadClick}
                  />
                  {canOpenInternalAdmin && (
                    <IconActionButton
                      label={isOpeningInternalAdmin ? 'Opening Internal Admin...' : 'Internal Admin'}
                      icon={FaUserShield}
                      onClick={() => void handleOpenInternalAdmin()}
                      disabled={isOpeningInternalAdmin}
                    />
                  )}
                  <button
                    onClick={() => navigate('/subscription?actor=school')}
                    className='rounded-lg bg-[#3D08BA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2c0691]'
                  >
                    Upgrade School Plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {!isSubscriptionLoading && (
          <section className='mb-6'>
            {isSubscriptionActive ? (
              <div className='bg-white rounded-2xl p-5 shadow-sm'>
                <div className='mb-4 flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <h3 className='text-base font-bold text-gray-900'>School Management Platform</h3>
                    <p className='mt-1 text-xs text-gray-600'>
                      Run your entire school from one connected system. Clear. Fast. Organized.
                    </p>
                  </div>
                  <button
                    onClick={() => openModuleDetails(activeSchoolModule?.id)}
                    className='rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                  >
                    View Module Details
                  </button>
                </div>

                <p className='mb-3 text-xs font-semibold text-gray-700'>Core Modules</p>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  {schoolManagementModules.map((module) => {
                    const ModuleIcon = schoolModuleIcons[module.iconKey];
                    return (
                      <button
                        type='button'
                        key={module.id}
                        onClick={() => openModuleDetails(module.id)}
                        className='rounded-xl border border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100'
                      >
                        <div className='flex items-start gap-3'>
                          <div className='mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#3D08BA]/10'>
                            <ModuleIcon className='text-[#3D08BA]' size={16} />
                          </div>
                          <div className='min-w-0'>
                            <p className='text-sm font-semibold text-gray-900'>{module.title}</p>
                            <p className='mt-1 text-xs leading-relaxed text-gray-600'>{module.summary}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className='bg-white rounded-2xl border border-gray-200 p-4 shadow-sm'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <h3 className='text-sm font-semibold text-gray-900'>School Management Platform</h3>
                    <p className='mt-1 text-xs text-gray-600'>
                      Activate your school plan to access the complete module workspace.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/subscription?actor=school')}
                    className='rounded-lg bg-[#3D08BA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2c0691]'
                  >
                    Upgrade School Plan
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {gateNotice && (
          <p className='mb-6 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700'>
            {gateNotice}
          </p>
        )}

        {/* Quick Actions */}
        <div className='mb-6'>
          <h3 className='text-base font-bold text-gray-900 mb-4'>Quick Actions</h3>
          <div className='grid grid-cols-3 gap-3'>
            <QuickActionButton icon={FaIdCard} label="Student Lists" onClick={handleStudentListClick}/>
            <QuickActionButton icon={FaUsers} label="Find Tutors" onClick={handleTutorListClick} />
            <QuickActionButton icon={FaCertificate} label="WAEC Prep" badge="NEW" onClick={handleWaecPrepClick} />
            <QuickActionButton icon={FaChartLine} label="Revenue" onClick={handleFinanceClick} />
            <QuickActionButton icon={FaCalendarAlt} label="Schedule" onClick={handleScheduleClick} />
            <QuickActionButton icon={FaFileAlt} label="Exams" onClick={handleExamManagementClick} />
            <QuickActionButton icon={FaVideo} label="Live Classes" badge="8" onClick={handleLiveClassesClick} />
            <QuickActionButton icon={FaFileAlt} label="Upload Resources" onClick={handleResourceUploadClick} />
          </div>
          <div className='mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700'>
            Use <span className='font-semibold'>Schedule</span> for your internal school teachers. Use{' '}
            <span className='font-semibold'>Find Tutors</span> only when you want to hire external independent tutors.
          </div>
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
          <RecentActivity />
          <PerformanceOverview />
        </div>

        <div className='mb-6'>
          <ReleaseInbox />
        </div>

        {/* Upcoming Events */}
        <div className='mb-6'>
          <UpcomingEvents />
        </div>

        {/* WAEC & International Module */}
        <div className='bg-white rounded-2xl shadow-sm overflow-hidden mb-6'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <h3 className='text-sm font-semibold text-gray-900'>WAEC & International Module</h3>
            <button className='text-xs text-[#3D08BA] font-medium hover:underline'>See more</button>
          </div>
          <div className='p-4'>
            <div className='bg-linear-to-r from-[#3D08BA] to-[#5010E0] rounded-2xl p-5 text-white relative overflow-hidden'>
              <h4 className='text-base font-bold mb-2'>Past Questions & Mock Exams</h4>
              <p className='text-xs mb-4 max-w-md'>Access official WAEC past questions, marking schemes and mock examinations to help students prepare effectively</p>
              <button
                onClick={handleWaecPrepClick}
                className='bg-white text-[#3D08BA] px-5 py-2 rounded-lg font-semibold text-xs hover:bg-gray-100 transition-colors'
              >
                Start Mock Test
              </button>
            </div>
          </div>
        </div>

        {/* Resource Library */}
        <div>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-sm font-semibold text-gray-900'>Resource Library</h3>
            <button className='text-xs text-[#3D08BA] font-medium hover:underline'>View All</button>
          </div>
          <div className='grid grid-cols-3 gap-3'>
            <div className='bg-linear-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center'>
              <FaBook className='text-blue-600 text-2xl mx-auto mb-2' />
              <p className='text-xs font-semibold text-gray-900'>Textbooks</p>
              <p className='text-xs text-gray-600'>125 items</p>
            </div>
            <div className='bg-linear-to-br from-green-50 to-green-100 rounded-xl p-4 text-center'>
              <FaVideo className='text-green-600 text-2xl mx-auto mb-2' />
              <p className='text-xs font-semibold text-gray-900'>Video Lessons</p>
              <p className='text-xs text-gray-600'>87 items</p>
            </div>
            <div className='bg-linear-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center'>
              <FaFileAlt className='text-purple-600 text-2xl mx-auto mb-2' />
              <p className='text-xs font-semibold text-gray-900'>Documents</p>
              <p className='text-xs text-gray-600'>256 items</p>
            </div>
          </div>
        </div>
      </main>

      {isModuleDetailsOpen && activeSchoolModule && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6'>
          <div className='w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-xl'>
            <div className='flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3'>
              <div>
                <h3 className='text-sm font-semibold text-gray-900'>School Module Details</h3>
                <p className='mt-1 text-xs text-gray-600'>
                  Explore how each module supports your school&apos;s day-to-day operations.
                </p>
              </div>
              <button
                type='button'
                onClick={closeModuleDetails}
                className='rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50'
              >
                Close
              </button>
            </div>

            <div className='grid grid-cols-1 gap-4 p-4 md:grid-cols-[230px_minmax(0,1fr)]'>
              <div className='max-h-[360px] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2'>
                <div className='space-y-1.5'>
                  {schoolManagementModules.map((module) => {
                    const ModuleIcon = schoolModuleIcons[module.iconKey];
                    const isActive = activeSchoolModule.id === module.id;
                    return (
                      <button
                        key={module.id}
                        type='button'
                        onClick={() => setActiveModuleId(module.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                          isActive
                            ? 'bg-[#3D08BA] text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <ModuleIcon size={14} />
                        <span className='font-medium'>{module.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className='rounded-xl border border-gray-200 p-4'>
                <h4 className='text-base font-bold text-gray-900'>{activeSchoolModule.title}</h4>
                <p className='mt-2 text-sm leading-relaxed text-gray-600'>{activeSchoolModule.summary}</p>

                <div className='mt-4 space-y-3'>
                  <div className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
                    <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>What it solves</p>
                    <p className='mt-1 text-sm leading-relaxed text-gray-700'>{activeSchoolModule.solves}</p>
                  </div>
                  <div className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
                    <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>What you can do</p>
                    <p className='mt-1 text-sm leading-relaxed text-gray-700'>{activeSchoolModule.action}</p>
                  </div>
                </div>

                <div className='mt-4 flex flex-wrap justify-end gap-2'>
                  {activeSchoolModule.id === 'fees-management' && (
                    <button
                      type='button'
                      onClick={() => navigate('/school-finance')}
                      className='rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                    >
                      Open
                    </button>
                  )}
                  {activeSchoolModule.id === 'exam-result-management' && (
                    <button
                      type='button'
                      onClick={() => navigate('/school-exams')}
                      className='rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                    >
                      Open
                    </button>
                  )}
                  <button
                    type='button'
                    onClick={closeModuleDetails}
                    className='rounded-lg bg-[#3D08BA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2c0691]'
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <NavBar />
    </div>
  );
};

export default SchoolDashboard;
