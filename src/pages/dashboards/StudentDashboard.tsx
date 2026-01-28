import { useState } from 'react';
import NewLogo from '../../components/NewLogo';
import RecordClasses from "../../components/RecordClasses";
import { useNavigate } from 'react-router-dom';
import StudentProfile from "../profiles/StudentProfile";
import {
  Bars3Icon,
  BellIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  HomeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

// Import modular components
import UpcomingClasses from '../../components/modules/students/UpcomingClasses';
import RecentActivity from '../../components/modules/students/RecentActivity';
import PerformanceStats from '../../components/modules/students/PerformanceStats';
import Announcements from '../../components/modules/students/Announcements';
import QuickAccessGrid from "../../components/modules/students/QuickAccess";
import ProgressOverview from '../../components/modules/students/ProgressOverview';

const StudentDashboard = () => {
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

  const handleAssignmentsClick = () => {
    navigate('/assignments');
  };

  const handlePerformanceClick = () => {
    navigate('/performance');
  };

  const handleJoinClass = (classId: string) => {
    navigate(`/class/${classId}`);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Row */}
          <div className="flex items-center justify-between py-4">
            <div className='shrink-0'>
              <NewLogo logoWidth={30} logoHeight={30} textSize="text-[14px]" gap="gap-1.5" centered={false} />
            </div>

            {/* Search - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses, subjects, assignments..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMenuOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              {/* Bell */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100">
                <BellIcon className="w-6 h-6 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setShowProfile(true)}
                  className="w-12 h-12 rounded-full border-2 border-[#F68C29] overflow-hidden bg-gray-100 flex items-center justify-center hover:scale-105 transition-transform"
                >
                  {profileSrc ? (
                    <img
                      src={profileSrc}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-8 h-8 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => setShowProfile(true)}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#3D08BA] rounded-full flex items-center justify-center hover:bg-[#2D0690] transition-colors"
                >
                  <PlusIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Welcome Section */}
          <div className="hidden md:block pb-4 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-3 md:gap-4">
              {/* Profile Avatar with Plus Button */}
              <div className="relative shrink-0 group">
                <button
                  type="button"
                  aria-label="View profile"
                  title="View profile"
                  onClick={() => setShowProfile(true)}
                  className="
                    relative
                    w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20
                    rounded-full
                    overflow-hidden
                    border-2 border-[#F68C29]
                    bg-gray-100
                    flex items-center justify-center
                    focus:outline-none
                    focus:ring-2 focus:ring-[#3D08BA]
                    transition
                    hover:scale-105
                  "
                >
                  {profileSrc ? (
                    <img
                      src={profileSrc}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-10 h-10 md:w-12 md:h-12 text-gray-400" />
                  )}

                  {/* Hover Overlay */}
                  <div
                    className="
                      absolute inset-0
                      bg-black/40
                      flex
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
                    absolute -bottom-1 -right-1
                    w-6 h-6 md:w-7 md:h-7
                    rounded-full
                    bg-[#3D08BA]
                    flex items-center justify-center
                    shadow-md
                    hover:bg-[#2c0691]
                    transition
                  "
                >
                  <PlusIcon className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Name and Welcome */}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600 leading-tight">Welcome back</p>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate leading-tight mt-0.5">
                  {name}!
                </h1>
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              </div>
            </div>
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

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="bg-white w-64 h-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Menu</h2>
            <nav className="space-y-4">
              <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
                Profile
              </button>
              <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
                Settings
              </button>
              <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
                Help & Support
              </button>
              <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 text-red-600">
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-[#3D08BA]">
            <HomeIcon className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button
            onClick={OnSubjectClick}
            className="flex flex-col items-center gap-1 text-gray-600"
          >
            <BookOpenIcon className="w-6 h-6" />
            <span className="text-xs">Subjects</span>
          </button>
          <button
            onClick={handleAssignmentsClick}
            className="flex flex-col items-center gap-1 text-gray-600"
          >
            <ClipboardDocumentListIcon className="w-6 h-6" />
            <span className="text-xs">Tasks</span>
          </button>
          <button
            onClick={handlePerformanceClick}
            className="flex flex-col items-center gap-1 text-gray-600"
          >
            <ChartBarIcon className="w-6 h-6" />
            <span className="text-xs">Progress</span>
          </button>
        </div>
      </nav>

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