import { useEffect, useMemo, useState } from 'react';
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
  HomeIcon,
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
import { loadStudentIdentity, saveStudentIdentity } from '../utils/studentIdentity';
import { signOutEverywhere } from '../../../utils/signOut';
import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

type StudentSchoolInvoiceStatus =
  | 'draft'
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'canceled';

type StudentSchoolInvoice = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  status: StudentSchoolInvoiceStatus;
  dueDate: string | null;
  schoolName?: string;
};

type StudentSchoolInvoicesResponse = {
  invoices: StudentSchoolInvoice[];
};

type PaySchoolInvoiceResponse = {
  mode: 'checkout' | 'settled';
  checkoutUrl?: string | null;
  message?: string;
};

const STUDENT_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const studentInvoiceStatusPill = (status: StudentSchoolInvoiceStatus) => {
  switch (status) {
    case 'overdue':
      return 'bg-red-100 text-red-700';
    case 'pending':
      return 'bg-[#3D08BA]/10 text-[#3D08BA]';
    case 'partially_paid':
      return 'bg-amber-100 text-amber-700';
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'canceled':
      return 'bg-slate-100 text-slate-700';
    case 'draft':
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const extractStudentApiError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload?.message && typeof payload.message === 'string') {
      return payload.message;
    }
  } catch {
    // Ignore JSON parse errors; we fall back to status text.
  }

  return response.statusText || `Request failed (${response.status})`;
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const initialStudentIdentity = useMemo(() => loadStudentIdentity(), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileSrc] = useState(null);
  const [name, setName] = useState(initialStudentIdentity.name);
  const [username, setUsername] = useState('andrew123');
  const [email, setEmail] = useState('andrew@example.com');
  const [description, setDescription] = useState(
    'I am here to learn, unlearn and relearn'
  );
  const [schoolInvoices, setSchoolInvoices] = useState<StudentSchoolInvoice[]>([]);
  const [isSchoolInvoicesLoading, setIsSchoolInvoicesLoading] = useState(false);
  const [schoolInvoicesError, setSchoolInvoicesError] = useState<string | null>(null);
  const [activeSchoolInvoiceId, setActiveSchoolInvoiceId] = useState('');
  const outstandingSchoolInvoices = useMemo(
    () =>
      schoolInvoices.filter(
        (invoice) =>
          invoice.status === 'pending' ||
          invoice.status === 'overdue' ||
          invoice.status === 'partially_paid'
      ),
    [schoolInvoices]
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
    saveStudentIdentity({ name: updatedProfile.name });
    // setProfileSrc(updatedProfile.profileImage);
  };

  const OnCoursesClick = () => {
    navigate('/mycourses');
  };
  const handlePaymentsClick = () => {
    navigate('/payments');
  };
  const handleSchoolFeesClick = () => {
    navigate('/payments?view=school-fees');
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
  const handleResourcesClick = () => {
    navigate('/resources');
  };

  const handleLogout = async () => {
    await signOutEverywhere();
    navigate('/signin', { replace: true });
  };

  const requestWithStudentAuth = async (path: string, init: RequestInit = {}) => {
    const token = loadPersistedSupabaseAccessToken();
    const localDevSession = loadPersistedLocalDevAuthSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (localDevSession?.email) {
      headers['x-dev-user-email'] = localDevSession.email;
      headers['x-dev-user-role'] = localDevSession.role || 'student';
    } else {
      throw new Error('Please sign in to continue.');
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    let response: Response;
    try {
      response = await fetch(`${STUDENT_API_BASE_URL}${normalizedPath}`, {
        ...init,
        headers,
      });
    } catch (error) {
      const fallbackMessage =
        error instanceof Error && error.message.trim() ? error.message : 'Failed to fetch';
      throw new Error(
        `${fallbackMessage}. Could not reach the backend API. Start the API with "bash scripts/api-up.sh", then retry.`
      );
    }

    if (!response.ok) {
      throw new Error(await extractStudentApiError(response));
    }

    return response;
  };

  const loadSchoolInvoices = async () => {
    const token = loadPersistedSupabaseAccessToken();
    const localDevSession = loadPersistedLocalDevAuthSession();
    if (!token && !localDevSession?.email) {
      setSchoolInvoices([]);
      return;
    }

    setIsSchoolInvoicesLoading(true);
    setSchoolInvoicesError(null);
    try {
      const response = await requestWithStudentAuth('/school-finance/invoices/me');
      const payload = (await response.json()) as StudentSchoolInvoicesResponse;
      if (Array.isArray(payload.invoices)) {
        setSchoolInvoices(payload.invoices);
      } else {
        setSchoolInvoices([]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not load school invoices right now.';
      setSchoolInvoicesError(message);
      setSchoolInvoices([]);
    } finally {
      setIsSchoolInvoicesLoading(false);
    }
  };

  const handlePaySchoolInvoiceFromDashboard = async (invoiceId: string) => {
    if (activeSchoolInvoiceId) {
      return;
    }

    setActiveSchoolInvoiceId(invoiceId);
    try {
      const response = await requestWithStudentAuth(
        `/school-finance/invoices/${encodeURIComponent(invoiceId)}/pay`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );
      const payload = (await response.json()) as PaySchoolInvoiceResponse;
      if (payload.mode === 'checkout' && payload.checkoutUrl) {
        window.location.assign(payload.checkoutUrl);
        return;
      }

      if (payload.message) {
        window.alert(payload.message);
      }

      await loadSchoolInvoices();
      navigate('/payments?view=school-fees');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not process school invoice payment.';
      window.alert(message);
    } finally {
      setActiveSchoolInvoiceId('');
    }
  };

  useEffect(() => {
    void loadSchoolInvoices();
  }, []);

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
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* STICKY TOP BAR - Logo, Notification & Menu */}
      <div className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between py-3 sm:py-3.5">
            {/* Logo */}
            <div className='shrink-0'>
              <NewLogo 
                logoWidth={32} 
                logoHeight={32} 
                textSize="text-sm sm:text-base" 
                gap="gap-2" 
                centered={false} 
              />
            </div>

            {/* Right Side - Notification & Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate('/student-home')}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full border border-[#3D08BA]/25 text-[#3D08BA] hover:bg-[#3D08BA]/5 transition-colors"
                aria-label="Back to student home"
                title="Back to Student Home"
              >
                <HomeIcon className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Student Home</span>
              </button>

              {/* Notification Bell */}
              <button 
                onClick={handleNotificationClick} 
                className="relative shrink-0 p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
              >
                <div className="relative">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#3D08BA] rounded-full flex items-center justify-center">
                    <BellSolidIcon className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                  </div>
                  {notificationCount > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white text-[10px] sm:text-xs font-bold">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    </div>
                  )}
                </div>
              </button>

              {/* Menu Icon */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Menu"
              >
                {menuOpen ? (
                  <HiOutlineX className="w-6 h-6 sm:w-6 sm:h-6 text-gray-600" />
                ) : (
                  <HiOutlineMenu className="w-6 h-6 sm:w-6 sm:h-6 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PROFILE SECTION - Separate from sticky bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-5">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            {/* Profile Avatar with Plus Button */}
            <div className="relative shrink-0 group">
              <button
                type="button"
                aria-label="View profile"
                title="View profile"
                onClick={() => setShowProfile(true)}
                className="
                  relative
                  w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20
                  rounded-full
                  overflow-hidden
                  border-3 sm:border-4 border-[#F68C29]
                  bg-gray-100
                  flex items-center justify-center
                  focus:outline-none
                  focus:ring-2 focus:ring-[#3D08BA]
                  transition-all
                  hover:shadow-lg
                "
              >
                {profileSrc ? (
                  <img
                    src={profileSrc}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400" />
                )}

                {/* Hover Overlay */}
                <div
                  className="
                    absolute inset-0
                    bg-black/40
                    hidden sm:flex
                    items-center justify-center
                    text-white text-xs
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
                  absolute bottom-0 right-0
                  w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7
                  rounded-full
                  bg-[#3D08BA]
                  flex items-center justify-center
                  shadow-lg
                  hover:bg-[#2c0691]
                  transition-all
                  hover:scale-110
                "
              >
                <PlusIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
              </button>
            </div>

            {/* Name and Bio */}
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 leading-tight mb-0.5">Welcome back</p>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight mb-1">
                {name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {description}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                @{username}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 md:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* LEFT COLUMN - Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Performance Stats */}
            <PerformanceStats />

            {/* Quick Access Grid */}
            <QuickAccessGrid
              onCoursesClick={OnCoursesClick}
              onPaymentsClick= {handlePaymentsClick}
              onSchoolFeesClick={handleSchoolFeesClick}
              onAssignmentsClick={handleAssignmentsClick}
              onPerformanceClick={handlePerformanceClick}
              onJoinClass={handleJoinClassClick}
              onResourceClick={handleResourcesClick}
            />

            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    School Fee Invoices
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Pay assigned school invoices quickly from your dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSchoolFeesClick}
                  className="inline-flex items-center rounded-lg border border-[#3D08BA]/20 px-3 py-2 text-xs sm:text-sm font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/5 transition-colors"
                >
                  Open all
                </button>
              </div>

              {isSchoolInvoicesLoading && (
                <p className="mt-4 text-xs sm:text-sm text-gray-500">Loading your school invoices...</p>
              )}

              {!isSchoolInvoicesLoading && schoolInvoicesError && (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-xs sm:text-sm text-red-700">
                  <p>{schoolInvoicesError}</p>
                  <button
                    type="button"
                    onClick={() => void loadSchoolInvoices()}
                    className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!isSchoolInvoicesLoading && !schoolInvoicesError && outstandingSchoolInvoices.length === 0 && (
                <p className="mt-4 text-xs sm:text-sm text-gray-500">
                  No outstanding school invoices right now.
                </p>
              )}

              {!isSchoolInvoicesLoading && !schoolInvoicesError && outstandingSchoolInvoices.length > 0 && (
                <div className="mt-4 space-y-3">
                  {outstandingSchoolInvoices.slice(0, 4).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-xl border border-gray-200 px-3 py-3 sm:px-4 sm:py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                            {invoice.title}
                          </p>
                          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
                            {(invoice.schoolName || 'School')} • ₦{invoice.amount.toLocaleString()}
                          </p>
                          {invoice.dueDate && (
                            <p className="mt-1 text-[11px] sm:text-xs text-gray-500">
                              Due {new Date(invoice.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold capitalize ${studentInvoiceStatusPill(
                            invoice.status
                          )}`}
                        >
                          {invoice.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handlePaySchoolInvoiceFromDashboard(invoice.id)}
                          disabled={activeSchoolInvoiceId === invoice.id}
                          className="inline-flex items-center rounded-lg bg-[#3D08BA] px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#2e06a1] disabled:opacity-60"
                        >
                          {activeSchoolInvoiceId === invoice.id ? 'Processing...' : 'Pay now'}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/payments?view=school-fees&invoice=${encodeURIComponent(invoice.id)}`)}
                          className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
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
          className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute top-0 right-0 bg-white w-80 sm:w-96 h-full shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="p-5 sm:p-6 border-b border-gray-200 bg-linear-to-br from-[#3D08BA] to-[#2c0691]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Menu</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <HiOutlineX className="w-6 h-6 text-white" />
                </button>
              </div>
              
              {/* User Info in Menu */}
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="w-14 h-14 rounded-full border-3 border-white bg-gray-100 flex items-center justify-center shrink-0">
                  {profileSrc ? (
                    <img src={profileSrc} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-9 h-9 text-gray-400" />
                  )}
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
                    onClick={() => {
                      item.onClick();
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-medium transition-all flex items-center gap-3 group hover:shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-[#3D08BA] flex items-center justify-center transition-colors">
                      <item.icon className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </button>
                ))}
                
                <button 
                  onClick={() => {
                    navigate('/preferences');
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-medium transition-all flex items-center gap-3 group hover:shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-[#3D08BA] flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <span className="flex-1">Preferences</span>
                </button>
              </div>

              {/* Logout Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition-all flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
                    <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="flex-1">Logout</span>
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
        // onAssignmentsClick={handleAssignmentsClick}
        onPerformanceClick={handlePerformanceClick}
      />

      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setShowProfile(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
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
