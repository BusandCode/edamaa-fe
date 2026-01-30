import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../../../components/layout/student-layout/StudentBottomNavigation';
import {
  ArrowLeftIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  PaperClipIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  subjectColor: string;
  dueDate: string;
  dueTime: string;
  status: 'pending' | 'completed' | 'overdue';
  description: string;
  attachments: number;
  points: number;
  submittedOn?: string;
  grade?: number;
  feedback?: string;
}

const Assignments = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const assignments: Assignment[] = [
    {
      id: '1',
      title: 'Financial Statement Analysis Project',
      subject: 'Accounting',
      subjectColor: 'bg-blue-500',
      dueDate: 'Jan 30, 2026',
      dueTime: '11:59 PM',
      status: 'pending',
      description: 'Analyze the financial statements of a publicly traded company and prepare a comprehensive report including ratio analysis, trend analysis, and recommendations.',
      attachments: 3,
      points: 100,
    },
    {
      id: '2',
      title: 'Calculus Problem Set - Chapter 5',
      subject: 'Mathematics',
      subjectColor: 'bg-purple-500',
      dueDate: 'Jan 29, 2026',
      dueTime: '10:00 AM',
      status: 'pending',
      description: 'Complete problems 1-25 from Chapter 5 covering integration techniques and applications. Show all work and provide detailed explanations.',
      attachments: 1,
      points: 50,
    },
    {
      id: '3',
      title: 'Research Paper: Climate Change Impact',
      subject: 'Environmental Science',
      subjectColor: 'bg-green-500',
      dueDate: 'Jan 28, 2026',
      dueTime: '11:59 PM',
      status: 'overdue',
      description: 'Write a 10-page research paper analyzing the impact of climate change on coastal ecosystems. Include at least 15 scholarly sources.',
      attachments: 2,
      points: 150,
    },
    {
      id: '4',
      title: 'Code Review: Sorting Algorithms',
      subject: 'Computer Science',
      subjectColor: 'bg-indigo-500',
      dueDate: 'Jan 25, 2026',
      dueTime: '5:00 PM',
      status: 'completed',
      description: 'Review and optimize the provided sorting algorithm implementations. Submit your improved code with performance analysis.',
      attachments: 4,
      points: 75,
      submittedOn: 'Jan 24, 2026',
      grade: 72,
      feedback: 'Excellent work on the optimization! Your analysis was thorough and well-documented.',
    },
    {
      id: '5',
      title: 'Marketing Strategy Presentation',
      subject: 'Business',
      subjectColor: 'bg-orange-500',
      dueDate: 'Feb 2, 2026',
      dueTime: '2:00 PM',
      status: 'pending',
      description: 'Create a 15-minute presentation on a comprehensive marketing strategy for a startup company. Include market analysis, target audience, and promotional tactics.',
      attachments: 0,
      points: 100,
    },
    {
      id: '6',
      title: 'Lab Report: Chemical Reactions',
      subject: 'Chemistry',
      subjectColor: 'bg-pink-500',
      dueDate: 'Jan 23, 2026',
      dueTime: '11:59 PM',
      status: 'completed',
      description: 'Document your findings from the chemical reactions lab. Include observations, data analysis, and conclusions.',
      attachments: 5,
      points: 80,
      submittedOn: 'Jan 22, 2026',
      grade: 78,
      feedback: 'Good observations. Consider adding more detail to your analysis section.',
    },
    {
      id: '7',
      title: 'Essay: Renaissance Art History',
      subject: 'Art History',
      subjectColor: 'bg-amber-500',
      dueDate: 'Feb 5, 2026',
      dueTime: '11:59 PM',
      status: 'pending',
      description: 'Write a 5-page essay comparing and contrasting the works of Leonardo da Vinci and Michelangelo during the High Renaissance period.',
      attachments: 2,
      points: 100,
    },
    {
      id: '8',
      title: 'Physics Simulation Project',
      subject: 'Physics',
      subjectColor: 'bg-cyan-500',
      dueDate: 'Jan 20, 2026',
      dueTime: '11:59 PM',
      status: 'completed',
      description: 'Create a computer simulation demonstrating the principles of projectile motion. Include documentation and analysis.',
      attachments: 3,
      points: 120,
      submittedOn: 'Jan 19, 2026',
      grade: 115,
      feedback: 'Outstanding work! Your simulation was accurate and well-documented.',
    },
  ];

  const Courses = ['all', ...Array.from(new Set(assignments.map(a => a.subject)))];

  const filteredAssignments = assignments.filter(assignment => {
    const matchesTab = activeTab === 'all' || assignment.status === activeTab;
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || assignment.subject === selectedSubject;
    return matchesTab && matchesSearch && matchesSubject;
  });

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    completed: assignments.filter(a => a.status === 'completed').length,
    overdue: assignments.filter(a => a.status === 'overdue').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleSolidIcon className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-orange-100 text-orange-700 border-orange-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      overdue: 'bg-red-100 text-red-700 border-red-200',
    };
    return badges[status as keyof typeof badges];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-[#3D08BA] text-white rounded-lg hover:bg-[#2D0690] transition-colors"
            >
              <FunnelIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Pending</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
              />
            </div>

            {/* Subject Filter */}
            {showFilters && (
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
              >
                {Courses.map(subject => (
                  <option key={subject} value={subject}>
                    {subject === 'all' ? 'All Courses' : subject}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'pending', 'completed', 'overdue'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm ${
                activeTab === tab
                  ? 'bg-[#3D08BA] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-2">
                ({tab === 'all' ? stats.total : stats[tab]})
              </span>
            </button>
          ))}
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <AcademicCapIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No assignments found</h3>
              <p className="text-gray-600">Try adjusting your filters or search query</p>
            </div>
          ) : (
            filteredAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      {getStatusIcon(assignment.status)}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                          {assignment.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`${assignment.subjectColor} text-white text-xs px-2.5 py-1 rounded-md font-medium`}>
                            {assignment.subject}
                          </span>
                          <span className={`border text-xs px-2.5 py-1 rounded-md font-medium ${getStatusBadge(assignment.status)}`}>
                            {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {assignment.description}
                        </p>
                        
                        {/* Assignment Details */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-4 h-4" />
                            <span>Due: {assignment.dueDate} at {assignment.dueTime}</span>
                          </div>
                          {assignment.attachments > 0 && (
                            <div className="flex items-center gap-1.5">
                              <PaperClipIcon className="w-4 h-4" />
                              <span>{assignment.attachments} file{assignment.attachments > 1 ? 's' : ''}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 font-medium text-[#3D08BA]">
                            <span>{assignment.points} pts</span>
                          </div>
                        </div>

                        {/* Completion Details */}
                        {assignment.status === 'completed' && assignment.submittedOn && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-green-900">
                                Submitted: {assignment.submittedOn}
                              </span>
                              {assignment.grade && (
                                <span className="text-lg font-bold text-green-700">
                                  {assignment.grade}/{assignment.points}
                                </span>
                              )}
                            </div>
                            {assignment.feedback && (
                              <p className="text-sm text-green-700 mt-2">
                                {assignment.feedback}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Action Buttons */}
                  <div className="flex lg:flex-col gap-2">
                    {assignment.status === 'pending' || assignment.status === 'overdue' ? (
                      <>
                        <button className="flex-1 lg:w-28 px-4 py-2 bg-[#3D08BA] text-white rounded-lg hover:bg-[#2D0690] transition-colors text-sm font-medium">
                          Submit
                        </button>
                        <button className="flex-1 lg:w-28 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                          Details
                        </button>
                      </>
                    ) : (
                      <button className="flex-1 lg:w-28 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                        View
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="assignments"
        onHomeClick={() => navigate('/student-dashboard')}
        onCoursesClick={() => navigate('/mycourses')}
        onAssignmentsClick={() => navigate('/assignments')}
        onPerformanceClick={() => navigate('/performance')}
      />

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default Assignments;