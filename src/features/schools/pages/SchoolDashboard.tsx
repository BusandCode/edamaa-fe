import { useState } from 'react';
import { FaSearch, FaCheckCircle, FaChartLine, FaCalendarAlt, FaVideo, FaIdCard, FaUsers, FaFileAlt, FaCertificate, FaBook, FaCamera } from 'react-icons/fa';import NewLogo from '../../../components/common/NewLogo';
import QuickActionButton from '../components/QuickActionButton';
import RecentActivity from '../components/RecentActivity';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../../components/layout/school-layout/NavBar';



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

const SchoolDashboard = () => {
  const [profileImage, setProfileImage] = useState<string>('');

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
  const navigate = useNavigate();
  const handleStudentListClick = () => {
    navigate('/student-list-school');
  }

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
                    GS
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
                <h2 className='text-lg sm:text-xl font-bold text-gray-900'>Welcome, God'swill School</h2>
                <FaCheckCircle className='text-blue-500 shrink-0' size={18} />
              </div>
              <p className='text-sm text-gray-600 mt-1'>A WAEC accredited tutorial center focused on Science and Technology</p>
            </div>
          </div>
        </div>
        {/* Quick Actions */}
        <div className='mb-6'>
          <h3 className='text-base font-bold text-gray-900 mb-4'>Quick Actions</h3>
          <div className='grid grid-cols-3 gap-3'>
            <QuickActionButton icon={FaIdCard} label="Student Lists" onClick={handleStudentListClick}/>
            <QuickActionButton icon={FaUsers} label="Tutors Lists" onClick={function (): void {
              throw new Error('Function not implemented.');
            } } />
            <QuickActionButton icon={FaCertificate} label="WAEC Prep" badge="NEW" onClick={function (): void {
              throw new Error('Function not implemented.');
            } } />
            <QuickActionButton icon={FaChartLine} label="Revenue" onClick={function (): void {
              throw new Error('Function not implemented.');
            } } />
            <QuickActionButton icon={FaCalendarAlt} label="Schedule" onClick={function (): void {
              throw new Error('Function not implemented.');
            } } />
            <QuickActionButton icon={FaVideo} label="Live Classes" badge="8" onClick={function (): void {
              throw new Error('Function not implemented.');
            } } />
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
              <button className='bg-white text-[#3D08BA] px-5 py-2 rounded-lg font-semibold text-xs hover:bg-gray-100 transition-colors'>
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
      <NavBar />
    </div>
  );
};

export default SchoolDashboard;