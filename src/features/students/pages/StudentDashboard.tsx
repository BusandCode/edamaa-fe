import { useState} from 'react';
import NewLogo from '../../../components/common/NewLogo';
import RecordClasses from "../../tutors/components/RecordClasses";
import { useNavigate } from 'react-router-dom';
import StudentProfile from "./StudentProfile";
import BottomNavigation from '../../../components/layout/student-layout/StudentBottomNavigation';
import {
  UserCircleIcon,
  PlusIcon,
  Cog6ToothIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";

// Import the notification count hook
import { useNotificationCount } from '../../hooks/useNotificationCount';

// Import modular components
import UpcomingClasses from '../components/UpcomingClasses';
import RecentActivity from '../components/RecentActivity';
import PerformanceStats from '../components/PerformanceStats';
import Announcements from '../components/Announcements';
import QuickAccessGrid from "../components/QuickAccess";
import ProgressOverview from '../components/ProgressOverview';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileSrc] = useState(null);
  const [name, setName] = useState('Adetokunbo Andrew');
  const [username, setUsername] = useState('andrew123');
  const [email, setEmail] = useState('andrew@example.com');
  const [description, setDescription] = useState(
    'I am here to learn, unlearn and relearn'
  );

  // Use the notification count hook for real-time sync
  const notificationCount = useNotificationCount();

  const handleProfileUpdate = (updatedProfile: {
    name: string;
    username: string;
    email: string;
    bio: string;
    profileImage: string | null;
  }) => {
    setName(updatedProfile.name);
    setUsername(updatedProfile.username);
    setEmail(updatedProfile.email);
    setDescription(updatedProfile.bio);
    // setProfileSrc(updatedProfile.profileImage);
  };

  const OnCoursesClick = () => {
    navigate('/mycourses');
  };

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  const handleAssignmentsClick = () => {
    navigate('/assignments');
  };

  const handlePerformanceClick = () => {
    navigate('/performance');
  };

  const handleJoinClassClick = () => {
    navigate('/join-class');
  };

  const handleLogout = () => {
    // Add your logout logic here
    console.log('Logging out...');
    navigate('/login');
  };

  // Menu items configuration
  const menuItems = [
    { 
      icon: UserCircleIcon, 
      label: 'My Profile', 
      onClick: () => {
        setShowProfile(true);
        setMenuOpen(false);
      }
    },
    { 
      icon: BellSolidIcon, 
      label: 'Notifications', 
      onClick: handleNotificationClick,
      badge: notificationCount
    },
    { 
      icon: AcademicCapIcon, 
      label: 'My Courses', 
      onClick: OnCoursesClick
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
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          {/* Top Row - Logo and Menu */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            {/* Logo */}
            <div className='shrink-0'>
              <NewLogo logoWidth={28} logoHeight={28} textSize="text-[13px]" gap="gap-1.5" centered={false} />
            </div>

            {/* Menu Icon (replaced Settings icon) */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? (
                <HiOutlineX className="w-5 h-5 text-gray-600" />
              ) : (
                <HiOutlineMenu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {/* Welcome Section */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Profile and Name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {/* Profile Avatar with Plus Button */}
              <div className="relative shrink-0 group">
                <button
                  type="button"
                  aria-label="View profile"
                  title="View profile"
                  onClick={() => setShowProfile(true)}
                  className="
                    relative
                    w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14
                    rounded-full
                    overflow-hidden
                    border-2 border-[#F68C29]
                    bg-gray-100
                    flex items-center justify-center
                    focus:outline-none
                    focus:ring-2 focus:ring-[#3D08BA]
                    transition
                  "
                >
                  {profileSrc ? (
                    <img
                      src={profileSrc}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-400" />
                  )}

                  {/* Hover Overlay */}
                  <div
                    className="
                      absolute inset-0
                      bg-black/40
                      hidden sm:flex
                      items-center justify-center
                      text-white text-[9px]
                      font-medium
                      opacity-0 group-hover:opacity-100
                      transition-opacity
                    "
                  >
                    View
                  </div>
                </button>

                {/* Plus Button */}
                <button
                  type="button"
                  onClick={() => setShowProfile(true)}
                  aria-label="Edit profile"
                  title="Edit profile"
                  className="
                    absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1
                    w-4 h-4 sm:w-5 sm:h-5
                    rounded-full
                    bg-[#3D08BA]
                    flex items-center justify-center
                    shadow-md
                    hover:bg-[#2c0691]
                    transition
                  "
                >
                  <PlusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                </button>
              </div>

              {/* Name and Welcome */}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">Welcome back</p>
                <h1 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 truncate leading-tight mt-0.5">
                  {name}
                </h1>
                <p className="hidden sm:block text-[10px] sm:text-xs text-gray-600 mt-0.5 truncate">{description}</p>
              </div>
            </div>

            {/* Right: Notification Bell */}
            <button 
              onClick={handleNotificationClick} 
              className="relative shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <div className="relative">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#3D08BA] rounded-full flex items-center justify-center">
                  <BellSolidIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                {notificationCount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-[10px] font-bold">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-20 md:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* LEFT COLUMN - Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Performance Stats */}
            <PerformanceStats />

            {/* Quick Access Grid */}
            <QuickAccessGrid
              onCoursesClick={OnCoursesClick}
              onAssignmentsClick={handleAssignmentsClick}
              onPerformanceClick={handlePerformanceClick}
              onJoinClass={handleJoinClassClick}
            />

            {/* Upcoming Classes */}
            <UpcomingClasses />

            {/* Progress Overview */}
            <ProgressOverview />

            {/* Recent Activity */}
            <RecentActivity />
          </div>

          {/* RIGHT COLUMN - Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Announcements */}
            <Announcements />

            {/* Record Classes Component */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                Class Recording
              </h3>
              <RecordClasses />
            </div>
          </div>
        </div>
      </main>

      {/* Menu Sidebar Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute top-0 right-0 bg-white w-72 sm:w-80 h-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Menu</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <HiOutlineX className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              {/* User Info in Menu */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-[#F68C29] bg-gray-100 flex items-center justify-center">
                  {profileSrc ? (
                    <img src={profileSrc} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate text-sm">{name}</p>
                  <p className="text-xs text-gray-600 truncate">{email}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="p-3 sm:p-4">
              <div className="space-y-1">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      item.onClick();
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition-colors flex items-center gap-3 text-sm"
                  >
                    <item.icon className="w-5 h-5 text-gray-500" />
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </button>
                ))}
                
                <button 
                  onClick={() => navigate('/preferences')}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition-colors flex items-center gap-3 text-sm"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Preferences
                </button>
              </div>

              {/* Logout Section */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-red-50 text-red-600 font-medium transition-colors flex items-center gap-3 text-sm"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation
        activeTab="student-dashboard"
        onHomeClick={() => navigate('/student-dashboard')}
        onCoursesClick={OnCoursesClick}
        onAssignmentsClick={handleAssignmentsClick}
        onPerformanceClick={handlePerformanceClick}
      />

      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={() => setShowProfile(false)}
          />
          <div className="relative bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <StudentProfile
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

export default StudentDashboard;