import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  AcademicCapIcon,
  VideoCameraIcon,
  PlayCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../../../components/layout/student-layout/StudentBottomNavigation';

const MyCourses = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const navigate = useNavigate();

  const handleHomeClick = () => {
    navigate('/student-dashboard');
  };

  const handleAssignmentsClick = () => {
    navigate('/assignments');
  };

  const handlePerformanceClick = () => {
    navigate('/performance');
  };

  const handleCourseClick = (courseId: number) => {
    navigate(`/course/${courseId}`);
  };

  const Courses = [
    {
      id: 1,
      title: 'Advanced Mathematics for Data Science',
      instructor: 'Dr. Adetokunbo Andrew',
      category: 'Science',
      thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
      rating: 4.8,
      totalStudents: 2453,
      progress: 65,
      totalLessons: 36,
      completedLessons: 23,
      duration: '12 weeks',
      nextLesson: 'Calculus Applications',
      lastAccessed: '2 hours ago',
      level: 'Intermediate'
    },
    {
      id: 2,
      title: 'Modern Physics: Quantum Mechanics',
      instructor: 'Prof. Sobowale Olamide',
      category: 'Science',
      thumbnail: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400',
      rating: 4.9,
      totalStudents: 1876,
      progress: 45,
      totalLessons: 30,
      completedLessons: 14,
      duration: '10 weeks',
      nextLesson: 'Wave Functions',
      lastAccessed: '1 day ago',
      level: 'Advanced'
    },
    {
      id: 3,
      title: 'English Literature: Classic to Contemporary',
      instructor: 'Dr. Ajayi Olubukunmi',
      category: 'Arts',
      thumbnail: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
      rating: 4.7,
      totalStudents: 3201,
      progress: 80,
      totalLessons: 24,
      completedLessons: 19,
      duration: '8 weeks',
      nextLesson: 'Modernist Poetry',
      lastAccessed: '3 hours ago',
      level: 'Beginner'
    },
    {
      id: 4,
      title: 'Full Stack Web Development',
      instructor: 'Prof. Andrew',
      category: 'Technology',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
      rating: 4.9,
      totalStudents: 5678,
      progress: 55,
      totalLessons: 42,
      completedLessons: 23,
      duration: '14 weeks',
      nextLesson: 'React Hooks Deep Dive',
      lastAccessed: '5 hours ago',
      level: 'Intermediate'
    },
    {
      id: 5,
      title: 'Organic Chemistry Fundamentals',
      instructor: 'Mide Code',
      category: 'Science',
      thumbnail: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400',
      rating: 4.6,
      totalStudents: 1543,
      progress: 70,
      totalLessons: 36,
      completedLessons: 25,
      duration: '12 weeks',
      nextLesson: 'Reaction Mechanisms',
      lastAccessed: '1 day ago',
      level: 'Intermediate'
    },
    {
      id: 6,
      title: 'World History: Ancient Civilizations',
      instructor: 'Prof. Ajayi',
      category: 'Social Studies',
      thumbnail: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400',
      rating: 4.5,
      totalStudents: 2109,
      progress: 40,
      totalLessons: 30,
      completedLessons: 12,
      duration: '10 weeks',
      nextLesson: 'Roman Empire',
      lastAccessed: '2 days ago',
      level: 'Beginner'
    }
  ];

  const filteredCourses = Courses.filter(subject =>
    subject.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.instructor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalCourses: Courses.length,
    inProgress: Courses.filter(s => s.progress > 0 && s.progress < 100).length,
    completed: Courses.filter(s => s.progress === 100).length,
    totalHours: 156
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm top-0 z-30 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Section */}
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#3D08BA] mb-2">
                  My Learning
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Continue your learning journey
                </p>
              </div>
            </div>

            {/* Simple Stats Text */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-sm text-gray-600">
              <span>
                <strong className="text-gray-900">{stats.totalCourses}</strong> courses enrolled
              </span>
              <span className="hidden sm:inline">•</span>
              <span>
                <strong className="text-gray-900">{stats.inProgress}</strong> in progress
              </span>
              <span className="hidden sm:inline">•</span>
              <span>
                <strong className="text-gray-900">{stats.completed}</strong> completed
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search your courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent bg-white shadow-sm"
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 pb-4">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#3D08BA] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#3D08BA] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              List View
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((subject) => (
              <div
                key={subject.id}
                onClick={() => handleCourseClick(subject.id)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-gray-200">
                  <img
                    src={subject.thumbnail}
                    alt={subject.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircleIcon className="w-16 h-16 text-white drop-shadow-lg" />
                  </div>

                  {/* Progress Badge */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-xs font-bold text-red-500">{subject.progress}%</span>
                  </div>

                  {/* Level Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-[#3D08BA] text-white px-3 py-1 rounded-full text-xs font-medium">
                      {subject.level}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Category */}
                  <span className="text-xs font-semibold text-[#3D08BA] uppercase tracking-wider">
                    {subject.category}
                  </span>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-gray-900 mt-2 mb-2 line-clamp-2 group-hover:text-[#3D08BA] transition-colors">
                    {subject.title}
                  </h3>

                  {/* Instructor */}
                  <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                    <AcademicCapIcon className="w-4 h-4" />
                    {subject.instructor}
                  </p>

                  {/* Rating & Students */}
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <StarSolidIcon className="w-4 h-4 text-yellow-400" />
                      <span className="font-semibold text-gray-900">{subject.rating}</span>
                    </div>
                    <div className="text-gray-500">
                      {subject.totalStudents.toLocaleString()} students
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold text-gray-900">
                        {subject.completedLessons}/{subject.totalLessons} lessons
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-[#3D08BA] to-red-400 transition-all duration-500"
                        style={{ width: `${subject.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Next Lesson */}
                  <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600">
                      <VideoCameraIcon className="w-4 h-4" />
                      <span className="text-xs">Next: {subject.nextLesson}</span>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-[#3D08BA] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {filteredCourses.map((subject) => (
              <div
                key={subject.id}
                onClick={() => handleCourseClick(subject.id)}
                className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group border border-gray-200"
              >
                <div className="flex flex-col sm:flex-row gap-5">
                  {/* Thumbnail */}
                  <div className="relative w-full sm:w-48 aspect-video sm:aspect-auto sm:h-32 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                    <img
                      src={subject.thumbnail}
                      alt={subject.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                    <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full">
                      <span className="text-xs font-bold text-red-500">{subject.progress}%</span>
                    </div>
                    <PlayCircleIcon className="absolute inset-0 m-auto w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-[#3D08BA] uppercase tracking-wider">
                          {subject.category}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900 mt-1 group-hover:text-[#3D08BA] transition-colors">
                          {subject.title}
                        </h3>
                      </div>
                      <span className="bg-[#3D08BA] text-white px-3 py-1 rounded-full text-xs font-medium shrink-0">
                        {subject.level}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                      <AcademicCapIcon className="w-4 h-4" />
                      {subject.instructor}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-1">
                        <StarSolidIcon className="w-4 h-4 text-yellow-400" />
                        <span className="font-semibold text-gray-900">{subject.rating}</span>
                      </div>
                      <div className="text-gray-500">
                        {subject.totalStudents.toLocaleString()} students
                      </div>
                      <div className="text-gray-500">
                        {subject.completedLessons}/{subject.totalLessons} lessons
                      </div>
                      <div className="text-gray-500">Last accessed: {subject.lastAccessed}</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-[#3D08BA] to-red-400 transition-all duration-500"
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <VideoCameraIcon className="w-4 h-4" />
                        <span>Next: {subject.nextLesson}</span>
                      </div>
                      <button className="px-4 py-2 bg-[#3D08BA] text-white rounded-lg font-medium text-sm hover:bg-red-400 transition-colors flex items-center gap-2">
                        Continue Learning
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredCourses.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpenIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search query</p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-6 py-3 bg-[#3D08BA] text-white rounded-xl font-semibold hover:bg-red-400 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation
        activeTab="courses"
        onHomeClick={handleHomeClick}
        onCoursesClick={() => {}}
        onAssignmentsClick={handleAssignmentsClick}
        onPerformanceClick={handlePerformanceClick}
      />
    </div>
  );
};

export default MyCourses;