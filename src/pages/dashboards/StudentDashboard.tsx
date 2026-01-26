import { useState } from 'react';
import NewLogo from '../../components/NewLogo';
import SubscriptionStatus from "../../components/SubscriptionStatus";
import RecordClasses from "../../components/RecordClasses";
import { useNavigate } from 'react-router-dom';
import StudentProfile from "../profiles/StudentProfile";


import {
  Bars3Icon,
  BellIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  VideoCameraIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CreditCardIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  HomeIcon,
  // UserGroupIcon
} from '@heroicons/react/24/outline';

const StudentDashboard = () => {
  const navigate = useNavigate(); // Move this to the top level
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileSrc, setProfileSrc] = useState<string | null>(null);

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
    setProfileSrc(updatedProfile.profileImage);
  };

  const OnSubjectClick = () => {
    navigate('/mysubjects');
  }

  const handleAssignmentsClick = () => {
    // navigate('/assignments');
    console.log('Assignments clicked');
  }

  const handlePerformanceClick = () => {
    // navigate('/performance');
    console.log('Performance clicked');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* HEADER */}
      <div className={`bg-white shadow-sm sticky top-0 z-10 ${showProfile ? 'blur-sm' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 py-4">

          {/* Top Row */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <NewLogo logoWidth={30} logoHeight={30} textSize="text-sm" gap="gap-1.5" centered={false} />

            {/* Search */}
            <div className="flex-1 max-w-md relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                placeholder="Search course, tutorial..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#3D08BA]"
              />
            </div>

            <button onClick={() => setMenuOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
              <Bars3Icon className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Welcome */}
          <div className="flex items-center justify-between">

            {/* Profile */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowProfile(true)}
                  className="w-12 h-12 rounded-full border-2 border-[#F68C29] overflow-hidden bg-gray-100 flex items-center justify-center"
                >
                  {profileSrc ? (
                    <img src={profileSrc} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-10 h-10 text-gray-400" />
                  )}
                </button>

                <button
                  onClick={() => setShowProfile(true)}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#3D08BA] rounded-full flex items-center justify-center"
                >
                  <PlusIcon className="w-4 h-4 text-white" />
                </button>
              </div>

              <div>
                <h2 className="font-bold text-gray-800">Welcome, {name}</h2>
                <p className="text-xs text-gray-600">{description}</p>
              </div>
            </div>

            {/* Bell */}
            <button className="relative p-2 rounded-full hover:bg-gray-100">
              <BellIcon className="w-6 h-6 text-[#3D08BA]" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className={`max-w-7xl mx-auto px-4 py-4 ${showProfile ? 'blur-sm' : ''}`}>

        {/* Earnings */}
        <div className="bg-linear-to-r from-[#3D08BA] to-[#5010E0] rounded-2xl p-5 text-white mb-6">
          <div className="flex justify-between mb-3">
            <h3 className="font-semibold">Earnings Overview</h3>
            <span>30%</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-4">
            <div className="h-full w-[30%] bg-linear-to-r from-[#F68C29] to-[#FF9F4D]" />
          </div>
          <SubscriptionStatus isActive showBoth />
        </div>

        {/* Quick Access */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">

          {[
           { label: 'My Subjects', icon: BookOpenIcon, color: 'from-blue-500 to-blue-700', onClick: OnSubjectClick },
            { label: 'Assignments', icon: ClipboardDocumentListIcon, color: 'from-green-500 to-green-700', onClick: handleAssignmentsClick },
            { label: 'Join Class', icon: VideoCameraIcon, color: 'from-red-500 to-red-700', live: true },
            { label: 'Performance Report', icon: ChartBarIcon, color: 'from-purple-500 to-purple-700', onClick: handlePerformanceClick },
            { label: 'Resource Library', icon: DocumentTextIcon, color: 'from-orange-500 to-orange-700' },
            { label: 'Payment & Subscriptions', icon: CreditCardIcon, color: 'from-yellow-500 to-yellow-700' },
          ].map(({ label, icon: Icon, color, live, onClick }) => (
            <button 
              key={label} 
              onClick={onClick}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col items-center gap-2"
            >
              <div className={`w-14 h-14 bg-linear-to-br ${color} rounded-2xl flex items-center justify-center relative`}>
                <Icon className="w-7 h-7 text-white stroke-[1.5]" />
                {live && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-2 rounded-full font-bold">
                    LIVE
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-800 text-center">{label}</span>
            </button>
          ))}
        </div>

        <RecordClasses />

        {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-64 bg-white shadow-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Menu</h3>

            <nav className="space-y-4">
              <button className="block text-gray-700 hover:text-[#3D08BA]">
                Profile
              </button>
              <button className="block text-gray-700 hover:text-[#3D08BA]">
                Settings
              </button>
              <button className="block text-gray-700 hover:text-[#3D08BA]">
                Help & Support
              </button>
              <button className="block text-red-600">
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}

      </div>

      {/* Bottom Navigation - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg md:hidden z-10">
        <div className="flex justify-around items-center py-2 sm:py-3 px-2">
          <button className="flex flex-col items-center gap-0.5 sm:gap-1 text-orange-500">
            <div className="bg-orange-100 p-2 sm:p-2.5 rounded-lg">
              <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[14px]">Home</span>
          </button>
          <button onClick={OnSubjectClick} className="flex flex-col items-center gap-0.5 sm:gap-1 text-gray-600 hover:text-orange-500">
            <div className="p-2 sm:p-2.5 rounded-lg hover:bg-orange-100">
              <BookOpenIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[14px]">Subjects</span>
          </button>
          <button onClick={handleAssignmentsClick} className="flex flex-col items-center gap-0.5 sm:gap-1 text-gray-600 hover:text-orange-500">
            <div className="p-2 sm:p-2.5 rounded-lg hover:bg-orange-100">
              <ClipboardDocumentListIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[14px]">Tasks</span>
          </button>
          <button onClick={handlePerformanceClick} className="flex flex-col items-center gap-0.5 sm:gap-1 text-gray-600 hover:text-orange-500">
            <div className="p-2 sm:p-2.5 rounded-lg hover:bg-orange-100">
              <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[14px]">Progress</span>
          </button>
        </div>
      </div>

      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowProfile(false)} />
          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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