import { useEffect, useState } from 'react';
import {
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
import { schoolManagementModules, type SchoolModule } from '../data/schoolManagementModules';
import { loadPersistedLocalDevAuthSession, loadPersistedAccountRoleState } from '../../../utils/authSession';
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
  const events = [
    { id: 1, title: 'Parent-Teacher Meeting', date: 'Jan 15, 2026', type: 'meeting' },
    { id: 2, title: 'Mid-Term Examination', date: 'Jan 20, 2026', type: 'exam' },
    { id: 3, title: 'Science Fair', date: 'Jan 25, 2026', type: 'event' },
  ];

  return (
    <div className='bg-white rounded-2xl p-5 shadow-sm'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-base font-bold text-gray-900'>Upcoming Events</h3>
        <button className='text-xs text-[#3D08BA] font-medium hover:underline'>Add Event</button>
      </div>
      <div className='space-y-3'>
        {events.map((event) => (
          <div key={event.id} className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'>
            <div className='w-12 h-12 bg-linear-to-br from-[#3D08BA] to-[#5010E0] rounded-lg flex items-center justify-center shrink-0'>
              <FaCalendarAlt className='text-white text-sm' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-semibold text-gray-900'>{event.title}</p>
              <p className='text-xs text-gray-600'>{event.date}</p>
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
};

const IconActionButton = ({ label, icon: Icon, onClick }: IconActionButtonProps) => (
  <button
    type='button'
    onClick={onClick}
    className='group relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 text-[#3D08BA] transition-colors hover:bg-[#3D08BA]/10'
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
  const [subscriptionState, setSubscriptionState] = useState<TeachingSubscriptionState | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [gateNotice, setGateNotice] = useState('');
  const [isModuleDetailsOpen, setIsModuleDetailsOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState(schoolManagementModules[0]?.id ?? '');
  const navigate = useNavigate();
  const isSubscriptionActive = Boolean(subscriptionState?.isActive);
  const canOpenInternalAdmin =
    import.meta.env.DEV || Boolean(loadPersistedAccountRoleState()?.activeRoles?.includes('admin'));
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
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleStudentListClick = () => {
    navigate('/student-list-school');
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
      description: 'Live class room managed by school administrators and tutors.',
      level: 'Intermediate' as const,
      duration: '90 mins',
    };

    navigate(`/live-class/${liveClassId}?role=teacher&actor=school`, { state: { classItem } });
  };

  const handleScheduleClick = () => {
    if (!isSubscriptionActive) {
      goToSubscription('Scheduling unlimited offline classes requires an active school subscription.');
      return;
    }

    setGateNotice('Schedule workspace is connected. Add your preferred scheduler flow next.');
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
                <FaCheckCircle className='text-blue-500 shrink-0' size={18} />
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
                      label='Internal Admin'
                      icon={FaUserShield}
                      onClick={() => navigate('/internal-admin/payouts')}
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
                      label='Internal Admin'
                      icon={FaUserShield}
                      onClick={() => navigate('/internal-admin/payouts')}
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
            <QuickActionButton icon={FaUsers} label="Tutors Lists" onClick={() => setGateNotice('Tutor directory workflow can be wired next.')} />
            <QuickActionButton icon={FaCertificate} label="WAEC Prep" badge="NEW" onClick={handleWaecPrepClick} />
            <QuickActionButton icon={FaChartLine} label="Revenue" onClick={handleFinanceClick} />
            <QuickActionButton icon={FaCalendarAlt} label="Schedule" onClick={handleScheduleClick} />
            <QuickActionButton icon={FaVideo} label="Live Classes" badge="8" onClick={handleLiveClassesClick} />
            <QuickActionButton icon={FaFileAlt} label="Upload Resources" onClick={handleResourceUploadClick} />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
          <RecentActivity />
          <PerformanceOverview />
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
