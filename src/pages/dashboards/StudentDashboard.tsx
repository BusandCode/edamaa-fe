import { useState, useEffect } from 'react';
import NewLogo from '../../components/NewLogo';
import RecordClasses from "../../components/RecordClasses";
import { useNavigate } from 'react-router-dom';
import StudentProfile from "../profiles/StudentProfile";
import BottomNavigation from '../../components/modules/students/BottomNavigation';
import {
  UserCircleIcon,
  PlusIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

// Import modular components
import UpcomingClasses from '../../components/modules/students/UpcomingClasses';
import RecentActivity from '../../components/modules/students/RecentActivity';
import PerformanceStats from '../../components/modules/students/PerformanceStats';
import Announcements from '../../components/modules/students/Announcements';
import QuickAccessGrid from "../../components/modules/students/QuickAccess";
import ProgressOverview from '../../components/modules/students/ProgressOverview';

interface StudentDashboardProps {
  unreadNotifications?: number;
}

const StudentDashboard = ({ unreadNotifications = 3 }: StudentDashboardProps) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileSrc] = useState(null);
  const [name, setName] = useState('Andrew');
  const [username, setUsername] = useState('andrew123');
  const [email, setEmail] = useState('andrew@example.com');
  const [description, setDescription] = useState(
    'I am here to learn, unlearn and relearn'
  );
  const [notificationCount, setNotificationCount] = useState(unreadNotifications);

  // Update notification count when prop changes
  useEffect(() => {
    setNotificationCount(unreadNotifications);
  }, [unreadNotifications]);

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

  const OnSubjectClick = () => {
    navigate('/mysubjects');
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

  const handleJoinClass = (classId: string) => {
    navigate(`/class/${classId}`);
  };

  const handleJoinClassClick = () => {
    navigate('/join-class');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Top Row - Logo and Settings */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3">
            {/* Logo */}
            <div className='shrink-0'>
              <NewLogo logoWidth={30} logoHeight={30} textSize="text-[14px]" gap="gap-1.5" centered={false} />
            </div>

            {/* Settings/Menu Icon - Desktop & Mobile */}
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Cog6ToothIcon className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Welcome Section */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Profile and Name */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
              {/* Profile Avatar with Plus Button */}
              <div className="relative shrink-0 group">
                <button
                  type="button"
                  aria-label="View profile"
                  title="View profile"
                  onClick={() => setShowProfile(true)}
                  className="
                    relative
                    w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20
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
                    <UserCircleIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-gray-400" />
                  )}

                  {/* Hover Overlay */}
                  <div
                    className="
                      absolute inset-0
                      bg-black/40
                      hidden sm:flex
                      items-center justify-center
                      text-white text-[9px] md:text-[10px] font-medium
                      opacity-0 group-hover:opacity-100
                      transition-opacity
                    "
                  >
                    View Profile
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
                    w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7
                    rounded-full
                    bg-[#3D08BA]
                    flex items-center justify-center
                    shadow-md
                    hover:bg-[#2c0691]
                    transition
                  "
                >
                  <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </button>
              </div>

              {/* Name and Welcome */}
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 leading-tight">Welcome back</p>
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-800 truncate leading-tight mt-0.5">
                  {name}
                </h1>
                <p className="hidden sm:block text-xs text-gray-600 mt-0.5 truncate">{description}</p>
              </div>
            </div>

            {/* Right: Notification Bell */}
            <button 
              onClick={handleNotificationClick} 
              className="relative shrink-0 p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <div className="relative">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 bg-[#3D08BA] rounded-full flex items-center justify-center">
                  <BellSolidIcon className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                </div>
                {notificationCount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 min-w-5 h-5 px-1 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-xs font-bold">{notificationCount}</span>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Stats */}
            <PerformanceStats />

            {/* Quick Access Grid */}
            <QuickAccessGrid
              onSubjectClick={OnSubjectClick}
              onAssignmentsClick={handleAssignmentsClick}
              onPerformanceClick={handlePerformanceClick}
              onJoinClass={handleJoinClassClick}
            />

            {/* Upcoming Classes */}
            <UpcomingClasses onJoinClass={handleJoinClass} />

            {/* Progress Overview */}
            <ProgressOverview />

            {/* Recent Activity */}
            <RecentActivity />
          </div>

          {/* RIGHT COLUMN - Sidebar */}
          <div className="space-y-6">
            {/* Announcements */}
            <Announcements />

            {/* Record Classes Component */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Class Recording
              </h3>
              <RecordClasses />
            </div>
          </div>
        </div>
      </main>

      {/* Settings Menu Overlay */}
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
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Settings</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
                  <p className="font-semibold text-gray-900 truncate">{name}</p>
                  <p className="text-sm text-gray-600 truncate">{email}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="p-4">
              <div className="space-y-1">
                <button 
                  onClick={() => {
                    setShowProfile(true);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition-colors flex items-center gap-3"
                >
                  <UserCircleIcon className="w-5 h-5 text-gray-500" />
                  My Profile
                </button>
                
                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition-colors flex items-center gap-3">
                  <Cog6ToothIcon className="w-5 h-5 text-gray-500" />
                  Account Settings
                </button>
                
                <button 
                  onClick={handleNotificationClick}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition-colors flex items-center gap-3"
                >
                  <BellSolidIcon className="w-5 h-5 text-gray-500" />
                  Notifications
                  {notificationCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {notificationCount}
                    </span>
                  )}
                </button>
                
                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition-colors flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Help & Support
                </button>

                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition-colors flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Preferences
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 font-medium transition-colors flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
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
        onSubjectsClick={OnSubjectClick}
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