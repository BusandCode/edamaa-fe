import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  ClockIcon,
  PlayIcon,
  CalendarIcon,
  FunnelIcon,
  AcademicCapIcon,
  ChartBarIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const MySubjects = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const navigate = useNavigate();
  const onBackClick = () => {
    navigate(-1);
  }

  const subjects = [
    {
      id: 1,
      title: 'Mathematics',
      description: 'Advanced mathematical concepts and problem solving',
      category: 'Science',
      color: '#3D08BA',
      schedule: 'Mon, Wed, Fri - 2:00 PM',
      duration: '12 weeks',
      enrolled: 45,
      status: 'ongoing',
      progress: 65,
      instructor: 'Dr. Sarah Johnson',
      nextClass: 'Monday, 2:00 PM',
      totalLessons: 36,
      completedLessons: 23,
      assignments: 8,
      completedAssignments: 5
    },
    {
      id: 2,
      title: 'Physics',
      description: 'Fundamental principles of physics and mechanics',
      category: 'Science',
      color: '#3D08BA',
      schedule: 'Tue, Thu - 10:00 AM',
      duration: '10 weeks',
      enrolled: 38,
      status: 'ongoing',
      progress: 45,
      instructor: 'Prof. Michael Chen',
      nextClass: 'Tuesday, 10:00 AM',
      totalLessons: 30,
      completedLessons: 14,
      assignments: 6,
      completedAssignments: 3
    },
    {
      id: 3,
      title: 'English Literature',
      description: 'Classic and contemporary literary analysis',
      category: 'Arts',
      color: '#3D08BA',
      schedule: 'Mon, Wed - 11:00 AM',
      duration: '8 weeks',
      enrolled: 52,
      status: 'ongoing',
      progress: 80,
      instructor: 'Dr. Emily Rodriguez',
      nextClass: 'Monday, 11:00 AM',
      totalLessons: 24,
      completedLessons: 19,
      assignments: 5,
      completedAssignments: 4
    },
    {
      id: 4,
      title: 'Computer Science',
      description: 'Programming fundamentals and algorithms',
      category: 'Technology',
      color: '#3D08BA',
      schedule: 'Mon, Wed, Fri - 4:00 PM',
      duration: '14 weeks',
      enrolled: 60,
      status: 'ongoing',
      progress: 55,
      instructor: 'Prof. David Kumar',
      nextClass: 'Monday, 4:00 PM',
      totalLessons: 42,
      completedLessons: 23,
      assignments: 10,
      completedAssignments: 6
    },
    {
      id: 5,
      title: 'Chemistry',
      description: 'Organic and inorganic chemistry principles',
      category: 'Science',
      color: '#3D08BA',
      schedule: 'Tue, Thu - 9:00 AM',
      duration: '12 weeks',
      enrolled: 42,
      status: 'ongoing',
      progress: 70,
      instructor: 'Dr. Lisa Wang',
      nextClass: 'Tuesday, 9:00 AM',
      totalLessons: 36,
      completedLessons: 25,
      assignments: 7,
      completedAssignments: 5
    },
    {
      id: 6,
      title: 'History',
      description: 'World history and cultural development',
      category: 'Social Studies',
      color: '#3D08BA',
      schedule: 'Wed, Fri - 1:00 PM',
      duration: '10 weeks',
      enrolled: 35,
      status: 'ongoing',
      progress: 40,
      instructor: 'Prof. James Thompson',
      nextClass: 'Wednesday, 1:00 PM',
      totalLessons: 30,
      completedLessons: 12,
      assignments: 6,
      completedAssignments: 2
    }
  ];

  const categories = ['all', 'Science', 'Arts', 'Technology', 'Social Studies'];

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.title.toLowerCase().includes(searchQuery.toLowerCase())
                        //  subject.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || subject.category === filterCategory;
    return matchesSearch && matchesCategory;
  });


  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">My Subjects</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">All courses you're enrolled in</p>
          </div>
            <div>
              <button onClick={onBackClick} className='bg-[#3D08BA] text-white px-5 py-2 rounded-[20px]'>Back</button>
            </div>
          </div>
          

          {/* Stats Cards */}
          <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
            <div className="bg-[#3D08BA] rounded-xl p-3 sm:p-4 text-white">
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <BookOpenIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <p className="text-xs sm:text-sm">Total Subjects</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold">{subjects.length}</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border rounded-lg focus:outline-none focus:border-[#3D08BA]"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 border rounded-lg hover:bg-gray-50 text-sm sm:text-base"
            >
              <FunnelIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Filter
            </button>
          </div>

          {/* Filter Categories */}
          {showFilters && (
            <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setFilterCategory(category)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                    filterCategory === category
                      ? 'bg-[#3D08BA] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredSubjects.map(subject => (
            <div
              key={subject.id}
              className="bg-white rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg overflow-hidden cursor-pointer transition-shadow"
            >
              {/* Subject Header */}
              <div 
                className="p-4 sm:p-5 text-white"
                style={{ backgroundColor: subject.color }}
              >
                <h3 className="text-lg sm:text-xl font-bold mb-1">{subject.title}</h3>
                <p className="text-xs sm:text-sm opacity-90 line-clamp-2">{subject.description}</p>
              </div>

              {/* Subject Details */}
              <div className="p-4 sm:p-5">
                {/* Instructor */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                  <AcademicCapIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-xs sm:text-sm text-gray-700">{subject.instructor}</span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">Course Progress</span>
                    <span className="text-xs font-bold text-[#F68C29]">{subject.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200  rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all bg-[#F68C29] duration-300"
                      style={{ 
                        width: `${subject.progress}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                    <p className="text-xs text-gray-600 mb-1">Lessons</p>
                    <p className="text-sm sm:text-base font-bold text-gray-900">
                      {subject.completedLessons}/{subject.totalLessons}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                    <p className="text-xs text-gray-600 mb-1">Assignments</p>
                    <p className="text-sm sm:text-base font-bold text-gray-900">
                      {subject.completedAssignments}/{subject.assignments}
                    </p>
                  </div>
                </div>

                {/* Schedule Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <ClockIcon className="w-4 h-4" />
                    <span>{subject.schedule}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Next: {subject.nextClass}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button 
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors border-[#F68C29] text-[#F68C29] border-2"
                  >
                    <VideoCameraIcon className="w-4 h-4" />
                    Join Class
                  </button>
                  <button 
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border-2 transition-colors"
                    style={{ 
                      borderColor: subject.color,
                      color: subject.color
                    }}
                  >
                    <ChartBarIcon className="w-4 h-4" />
                    Progress
                  </button>
                </div>

                {/* View Details Button */}
                <button 
                  className="w-full text-white py-2.5 sm:py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm sm:text-base"
                  style={{ backgroundColor: subject.color }}
                >
                  <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  View Subject Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredSubjects.length === 0 && (
          <div className="text-center py-12">
            <BookOpenIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No subjects found</h3>
            <p className="text-sm text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySubjects;