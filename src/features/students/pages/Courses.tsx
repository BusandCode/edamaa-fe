import { useEffect, useState } from 'react';
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  AcademicCapIcon,
  VideoCameraIcon,
  PlayCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../../../components/layout/student-layout/StudentBottomNavigation';
import CourseMatesChatPanel from '../../../components/communication/CourseMatesChatPanel';
import {
  CURRENT_STUDENT,
  RECORDED_COURSES,
  type RecordedCourse,
} from '../data/recordedCourses';

const MyCourses = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedChatCourse, setSelectedChatCourse] = useState<RecordedCourse | null>(null);
  const [chatNotice, setChatNotice] = useState('');

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

  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/student-dashboard');
  };

  const openCourseChat = (course: RecordedCourse) => {
    setSelectedChatCourse(course);
  };

  useEffect(() => {
    if (!chatNotice) {
      return;
    }
    const timer = window.setTimeout(() => setChatNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [chatNotice]);

  const courses = RECORDED_COURSES;

  const filteredCourses = courses.filter(subject =>
    subject.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.instructor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalCourses: courses.length,
    inProgress: courses.filter(s => s.progress > 0 && s.progress < 100).length,
    completed: courses.filter(s => s.progress === 100).length,
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBackClick}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-[#3D08BA]"
                  aria-label="Go back"
                  title="Go back"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>

                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#3D08BA] mb-2">
                    My Learning
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600">
                    Continue your learning journey
                  </p>
                </div>
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
        {chatNotice && (
          <div className="mb-4 rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-4 py-3 text-sm text-[#3D08BA]">
            {chatNotice}
          </div>
        )}

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
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openCourseChat(subject);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#3D08BA]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#3D08BA] hover:bg-[#3D08BA]/5 transition-colors"
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      Course Chat
                    </button>
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openCourseChat(subject);
                          }}
                          className="px-3 py-2 rounded-lg border border-[#3D08BA]/30 bg-white text-[#3D08BA] font-medium text-sm hover:bg-[#3D08BA]/5 transition-colors inline-flex items-center gap-2"
                        >
                          <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          Course Chat
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCourseClick(subject.id);
                          }}
                          className="px-4 py-2 bg-[#3D08BA] text-white rounded-lg font-medium text-sm hover:bg-red-400 transition-colors flex items-center gap-2"
                        >
                          Continue Learning
                          <ArrowRightIcon className="w-4 h-4" />
                        </button>
                      </div>
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

      {selectedChatCourse && (
        <CourseMatesChatPanel
          course={{
            id: selectedChatCourse.id,
            title: selectedChatCourse.title,
            classmates: selectedChatCourse.classmates,
            currentStudent: CURRENT_STUDENT,
          }}
          onClose={() => setSelectedChatCourse(null)}
          onNotice={setChatNotice}
        />
      )}

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
