import { useEffect, useState } from 'react';
import { FaSearch, FaBook, FaUserGraduate, FaMoneyBillWave, FaHome, FaClock, FaCalendar, FaCopy, FaVideo, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import NewLogo from '../../../components/common/NewLogo';
import { students } from './lists/students';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ScheduleClass, { type NewClassData } from '../components/ScheduleClass';
import { motion, AnimatePresence } from 'framer-motion';
import TutorProfile from './TutorProfile';
import {
  UserCircleIcon,
  PlusIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import { signOutEverywhere } from '../../../utils/signOut';
import {
  fetchTeachingSubscriptionState,
  type TeachingSubscriptionState,
} from '../../subscriptions/utils/teachingSubscriptionApi';

const TutorDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('classroom');
  const [showProfile, setShowProfile] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [profileSrc, setProfileSrc] = useState<string | null>(null);
  const [name, setName] = useState('Abdulrahman Farhan');
  const [username, setUsername] = useState('abdulrahman');
  const [email, setEmail] = useState('abdulrahman@example.com');
  const [description, setDescription] = useState('Experienced tutor specializing in mathematics and science. Passionate about helping students achieve their academic goals and fostering a love for learning.');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [subscriptionState, setSubscriptionState] = useState<TeachingSubscriptionState | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);

  const handleProfileUpdate = (updatedProfile: {
    name: string;
    username?: string;
    email: string;
    bio: string;
    subjects?: string;
    experience?: string;
    profileImage: string | null;
  }) => {
    setName(updatedProfile.name);
    if (typeof updatedProfile.username !== 'undefined') setUsername(updatedProfile.username);
    setEmail(updatedProfile.email);
    setDescription(updatedProfile.bio);
    setProfileSrc(updatedProfile.profileImage);
  };

  const [upcomingClasses, setUpcomingClasses] = useState([
    {
      id: 1,
      title: 'Introduction to Financial Accounting',
      date: '24 May 26',
      time: '12:00pm',
      students: 25,
      avatars: 3
    },
    {
      id: 2,
      title: 'Advanced Mathematics',
      date: '25 May 26',
      time: '2:30pm',
      students: 18,
      avatars: 3
    }
  ]);

  const classroomId = '224091556';
  const isSubscriptionActive = Boolean(subscriptionState?.isActive);
  const offlineScheduleLimit = subscriptionState?.features.maxScheduledOfflineClasses ?? 1;

  const openSubscriptionPage = (message: string) => {
    toast.info(message);
    navigate('/subscription?actor=tutor');
  };

  const loadSubscriptionState = async () => {
    setIsSubscriptionLoading(true);
    try {
      const payload = await fetchTeachingSubscriptionState('tutor');
      setSubscriptionState(payload);
    } catch {
      setSubscriptionState(null);
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    void loadSubscriptionState();
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(classroomId);
      toast.success('Classroom ID copied successfully');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error('Failed to copy classroom ID');
    }
  };

  const handleScheduleClass = (newClass: NewClassData) => {
    if (!isSubscriptionActive && upcomingClasses.length >= offlineScheduleLimit) {
      openSubscriptionPage(
        `Free mode allows up to ${offlineScheduleLimit} scheduled offline class. Upgrade to unlock unlimited scheduling.`
      );
      return;
    }

    setUpcomingClasses((previous) => [...previous, newClass]);
  };

  const handleOpenScheduleClass = () => {
    if (!isSubscriptionActive && upcomingClasses.length >= offlineScheduleLimit) {
      openSubscriptionPage(
        `Free mode allows up to ${offlineScheduleLimit} scheduled offline class. Upgrade to schedule more.`
      );
      return;
    }

    setShowScheduleModal(true);
  };

  const handleGoLive = () => {
    if (!isSubscriptionActive) {
      openSubscriptionPage('Live classes are unlocked when you activate Edamaa Pro.');
      return;
    }

    const liveClassId = `live-${Date.now().toString().slice(-6)}`;
    const classItem = {
      id: liveClassId,
      code: classroomId,
      name: `${name}'s Live Classroom`,
      subject: 'Interactive Session',
      instructor: name,
      instructorImage: profileSrc || undefined,
      schedule: 'Live now',
      students: students.length,
      description:
        'Real-time interactive classroom for live teaching, Q&A, and school-support gifting.',
      level: 'Intermediate' as const,
      duration: '90 mins',
    };

    toast.info('Opening live classroom...');
    navigate(`/live-class/${liveClassId}?role=teacher`, { state: { classItem } });
  };

  const handleStudentListClick = () => navigate('/student-list');
  const handleCourseClick = () => {
    if (!isSubscriptionActive) {
      openSubscriptionPage(
        'Offline class tools are limited in free mode. Upgrade to Edamaa Pro for full access.'
      );
      return;
    }

    navigate('/courses');
  };

  const handleStartClass = (classItem: NewClassData) => {
    if (!isSubscriptionActive) {
      openSubscriptionPage('Start Class is available after activating Edamaa Pro.');
      return;
    }

    const liveClassId = `live-${String(classItem.id)}`;
    const classState = {
      id: liveClassId,
      code: classroomId,
      name: classItem.title,
      subject: 'Scheduled Session',
      instructor: name,
      instructorImage: profileSrc || undefined,
      schedule: `${classItem.date} ${classItem.time}`,
      students: classItem.students,
      description: 'Scheduled tutor session with live instruction and interactive collaboration.',
      level: 'Intermediate' as const,
      duration: '60 mins',
    };

    navigate(`/live-class/${liveClassId}?role=teacher`, { state: { classItem: classState } });
  };

  const handleResourceUploadClick = () => {
    navigate('/resources?actor=tutor&mode=upload');
  };

  const handleLogout = async () => {
    await signOutEverywhere();
    navigate('/signin', { replace: true });
  };

  // Menu items
  const menuItems = [
    {
      icon: UserCircleIcon,
      label: 'My Profile',
      onClick: () => { setShowProfile(true); setMenuOpen(false); }
    },
    {
      icon: BellSolidIcon,
      label: 'Notifications',
      onClick: () => navigate('/notifications')
    },
    {
      icon: Cog6ToothIcon,
      label: 'Account Settings',
      onClick: () => navigate('/settings')
    },
    {
      icon: QuestionMarkCircleIcon,
      label: 'Help & Support',
      onClick: () => navigate('/help')
    },
    {
      icon: ShieldCheckIcon,
      label: 'Subscription',
      onClick: () => navigate('/subscription?actor=tutor'),
    },
    {
      icon: CheckBadgeIcon,
      label: 'Edamaa3D Verify',
      onClick: () => navigate('/edamaa3d-verified?actor=tutor'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      {/* STICKY TOP BAR */}
      <div className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between py-3 sm:py-3.5">
            {/* Logo */}
            <div className="shrink-0">
              <NewLogo logoWidth={32} logoHeight={32} textSize="text-sm sm:text-base" gap="gap-2" centered={false} />
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search course, tutorial..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#3D08BA] text-sm"
                />
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Search */}
              <button
                onClick={() => setShowMobileSearch(s => !s)}
                className="md:hidden p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Search"
              >
                <FaSearch className="text-gray-600 text-base" />
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => navigate('/notifications')}
                className="relative shrink-0 p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
              >
                <div className="relative">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#3D08BA] rounded-full flex items-center justify-center">
                    <BellSolidIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-[10px] font-bold">3</span>
                  </div>
                </div>
              </button>

              {/* Hamburger Menu */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Menu"
              >
                {menuOpen
                  ? <HiOutlineX className="w-6 h-6 text-gray-600" />
                  : <HiOutlineMenu className="w-6 h-6 text-gray-600" />
                }
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search Overlay */}
        {showMobileSearch && (
          <div className="md:hidden border-t border-gray-100 px-3 py-2 bg-white">
            <div className="relative max-w-7xl mx-auto">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input
                type="text"
                placeholder="Search course, tutorial..."
                className="w-full pl-9 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#3D08BA] text-sm"
              />
              <button
                onClick={() => setShowMobileSearch(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg"
                aria-label="Close search"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PROFILE SECTION */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Left: Avatar + Name */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
              {/* Profile Avatar */}
              <div className="relative shrink-0 group">
                <button
                  type="button"
                  aria-label="View profile"
                  onClick={() => setShowProfile(true)}
                  className="
                    relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20
                    rounded-full overflow-hidden
                    border-4 border-[#F68C29]
                    bg-gray-100
                    flex items-center justify-center
                    focus:outline-none focus:ring-2 focus:ring-[#3D08BA]
                    transition-all hover:shadow-lg
                  "
                >
                  {profileSrc ? (
                    <img src={profileSrc} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400" />
                  )}
                  <div className="absolute inset-0 bg-black/40 hidden sm:flex items-center justify-center text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setShowProfile(true)}
                  aria-label="Edit profile"
                  className="
                    absolute bottom-0 right-0
                    w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7
                    rounded-full bg-[#3D08BA]
                    flex items-center justify-center
                    shadow-lg hover:bg-[#2c0691]
                    transition-all hover:scale-110
                  "
                >
                  <PlusIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
                </button>
              </div>

              {/* Name + Bio */}
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 leading-tight mb-0.5">Welcome back</p>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight mb-1 truncate">
                  {name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-[400px]">{description}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">@{username}</p>
              </div>
            </div>

            {/* Share Classroom ID */}
            <div className="w-full sm:w-auto bg-[#F68C29] px-4 py-3 rounded-xl shadow-sm">
              <p className="text-xs text-white font-medium mb-1">Share Classroom ID</p>
              <div onClick={copyToClipboard} className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-bold text-white">ID: {classroomId}</span>
                <button className="text-white hover:scale-110 transition-transform">
                  <FaCopy className="text-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 md:pb-8">
        <div className="mb-5 sm:mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {isSubscriptionLoading ? (
            <p className="text-sm text-gray-600">Checking your Edamaa Pro access...</p>
          ) : isSubscriptionActive ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-700">Edamaa Pro active</p>
                <p className="text-xs text-gray-600">
                  Live classes and unlimited offline scheduling are enabled.
                  {subscriptionState?.currentPeriodEndLabel
                    ? ` Renewal date: ${subscriptionState.currentPeriodEndLabel}.`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleResourceUploadClick}
                  className="rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-2 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10"
                >
                  Upload Resources
                </button>
                <button
                  onClick={() => navigate('/edamaa3d-verified?actor=tutor')}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  View Edamaa3D Verify
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#3D08BA]">Free mode active</p>
                <p className="text-xs text-gray-600">
                  Live classes are locked. Offline class scheduling is limited to {offlineScheduleLimit}{' '}
                  class.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleResourceUploadClick}
                  className="rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-2 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10"
                >
                  Upload Resources
                </button>
                <button
                  onClick={() => navigate('/subscription?actor=tutor')}
                  className="rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2c0691]"
                >
                  Upgrade to Edamaa Pro
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
          {[
            { icon: FaBook, label: 'Total Courses', value: '12' },
            { icon: FaUserGraduate, label: 'Total Students', value: String(students.length) },
            { icon: FaMoneyBillWave, label: 'Total Earnings', value: '$45,280' },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="bg-white rounded-xl p-3 sm:p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
            >
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-[#3D08BA]/10 rounded-xl flex items-center justify-center mb-2 sm:mb-3">
                  <Icon className="text-[#3D08BA] text-sm sm:text-base md:text-lg" />
                </div>
                <h3 className="text-[11px] sm:text-xs md:text-sm text-gray-600 mb-1 text-center leading-tight">{label}</h3>
                <p className="text-sm sm:text-base md:text-lg font-bold text-gray-800">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 mb-5 sm:mb-6 inline-flex gap-1 sm:gap-2 overflow-x-auto w-full sm:w-auto">
          {(['group', 'classroom', 'live'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base whitespace-nowrap flex items-center gap-1.5 capitalize ${
                activeTab === tab
                  ? 'bg-[#3D08BA] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab === 'live' && <FaVideo className="text-xs sm:text-sm" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'classroom' && (
            <motion.div
              key="classroom"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Upcoming Classes</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {upcomingClasses.map((classItem, index) => (
                  <motion.div
                    key={classItem.id}
                    custom={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-br from-[#3D08BA] to-[#5a18f2] rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg hover:shadow-xl transition-shadow border border-[#5a18f2]/20"
                  >
                    {/* Avatars + Date */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex -space-x-2">
                        {[1, 2].map(n => (
                          <div key={n} className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 border-white overflow-hidden bg-white">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=student${n}`} alt="Student" className="w-full h-full" />
                          </div>
                        ))}
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 border-white bg-white flex items-center justify-center">
                          <span className="text-[10px] font-bold text-gray-700">+{classItem.students}</span>
                        </div>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                        <FaCalendar className="text-white text-[11px]" />
                        <span className="text-white text-[11px] font-medium">{classItem.date}</span>
                      </div>
                    </div>

                    <h4 className="text-sm sm:text-base md:text-lg font-bold text-white mb-3 sm:mb-4 line-clamp-2">
                      {classItem.title}
                    </h4>

                    <div className="flex items-center justify-between gap-2">
                      <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <FaClock className="text-white text-xs" />
                        <span className="text-white font-medium text-xs sm:text-sm">{classItem.time}</span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStartClass(classItem)}
                        className="bg-[#F68C29] text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-[#e07d20] transition-colors text-xs sm:text-sm shadow-md"
                      >
                        Start Class
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'live' && (
            <motion.div
              key="live"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6"
            >
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-4 sm:mb-6">Live Session</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

                {/* Go Live Card */}
                <div className="relative bg-gradient-to-br from-[#3D08BA] via-[#7B2FBE] to-[#F68C29] rounded-2xl p-6 sm:p-8 shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(61,8,186,0.5)] transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#F68C29]/20 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#3D08BA]/30 rounded-full blur-2xl" />
                  <div className="relative flex flex-col items-center text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 shadow-lg border border-white/20">
                      <FaVideo className="text-white text-2xl sm:text-3xl" />
                    </div>
                    <h4 className="text-xl sm:text-2xl font-bold text-white mb-2">Go Live Now</h4>
                    <p className="text-white/90 mb-6 text-sm sm:text-base">Start an instant live session with your students</p>
                    <button
                      onClick={handleGoLive}
                      className="bg-white text-[#3D08BA] px-6 sm:px-8 py-3 rounded-xl font-bold hover:shadow-lg active:scale-95 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto flex items-center justify-center gap-2 shadow-md"
                    >
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      Go Live
                    </button>
                  </div>
                </div>

                {/* Schedule Live Class Card */}
                <div className="relative bg-gradient-to-br from-[#F68C29] via-[#B8559E] to-[#3D08BA] rounded-2xl p-6 sm:p-8 shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(253,131,16,0.5)] transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#3D08BA]/20 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#F68C29]/30 rounded-full blur-2xl" />
                  <div className="relative flex flex-col items-center text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 shadow-lg border border-white/20">
                      <FaCalendar className="text-white text-2xl sm:text-3xl" />
                    </div>
                    <h4 className="text-xl sm:text-2xl font-bold text-white mb-2">Schedule Live Class</h4>
                    <p className="text-white/90 mb-6 text-sm sm:text-base">Plan and schedule a live session for later</p>
                    <button
                      onClick={handleOpenScheduleClass}
                      className="bg-white text-[#F68C29] px-6 sm:px-8 py-3 rounded-xl font-bold hover:shadow-lg active:scale-95 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto flex items-center justify-center gap-2 shadow-md"
                    >
                      <FaPlus className="text-sm" />
                      Schedule Class
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'group' && (
            <motion.div
              key="group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6"
            >
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-4">Group Sessions</h3>
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <p className="text-gray-600">Group content will be displayed here</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg md:hidden z-10 border-t border-gray-200">
        <div className="flex justify-around items-center py-2 sm:py-3 px-2">
          <button className="flex flex-col items-center gap-0.5 sm:gap-1 text-[#F68C29]">
            <div className="bg-orange-100 p-2 sm:p-2.5 rounded-lg">
              <FaHome size={16} />
            </div>
            <span className="text-[11px] font-medium">Home</span>
          </button>
          <button onClick={handleCourseClick} className="flex flex-col items-center gap-0.5 sm:gap-1 text-gray-500 hover:text-[#F68C29]">
            <div className="p-2 sm:p-2.5 rounded-lg hover:bg-orange-50">
              <FaBook size={16} />
            </div>
            <span className="text-[11px]">Courses</span>
          </button>
          <button onClick={handleStudentListClick} className="flex flex-col items-center gap-0.5 sm:gap-1 text-gray-500 hover:text-[#F68C29]">
            <div className="p-2 sm:p-2.5 rounded-lg hover:bg-orange-50">
              <FaUserGraduate size={16} />
            </div>
            <span className="text-[11px]">Students</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 sm:gap-1 text-gray-500 hover:text-[#F68C29]">
            <div className="p-2 sm:p-2.5 rounded-lg hover:bg-orange-50">
              <FaMoneyBillWave size={16} />
            </div>
            <span className="text-[11px]">Earnings</span>
          </button>
        </div>
      </div>

      {/* Menu Sidebar */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute top-0 right-0 bg-white w-80 sm:w-96 h-full shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="p-5 sm:p-6 border-b border-gray-200 bg-gradient-to-br from-[#3D08BA] to-[#2c0691]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Menu</h2>
                <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <HiOutlineX className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="w-14 h-14 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center shrink-0">
                  {profileSrc
                    ? <img src={profileSrc} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    : <UserCircleIcon className="w-9 h-9 text-gray-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{name}</p>
                  <p className="text-xs text-white/80 truncate">{email}</p>
                  <p className="text-xs text-white/60 mt-0.5">@{username}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="p-4 sm:p-5">
              <div className="space-y-1">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => { item.onClick(); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-medium transition-all flex items-center gap-3 group hover:shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-[#3D08BA] flex items-center justify-center transition-colors">
                      <item.icon className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                    <span className="flex-1">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Logout */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition-all flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
                    <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-600" />
                  </div>
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Schedule Class Modal */}
      <ScheduleClass
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleScheduleClass}
      />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {/* Tutor Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowProfile(false)} />
          <div className="relative z-10 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl">
            <TutorProfile
              onClose={() => setShowProfile(false)}
              onSave={handleProfileUpdate}
              initialName={name}
              initialUsername={username}
              initialEmail={email}
              initialBio={description}
              initialProfileImage={profileSrc}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorDashboard;
