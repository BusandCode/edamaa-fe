import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  ClockIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
interface ClassDetails {
  id: string;
  code: string;
  name: string;
  subject: string;
  instructor: string;
  instructorImage?: string;
  schedule: string;
  students: number;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
}

const JoinClass = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassDetails | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');

  // Available classes
  const availableClasses: ClassDetails[] = [
    {
      id: '1',
      code: 'ACC101',
      name: 'Financial Accounting Fundamentals',
      subject: 'Accounting',
      instructor: 'Adetokunbo Andrew',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      schedule: 'Mon & Wed, 10:00 AM - 11:30 AM',
      students: 45,
      description: 'Learn the basics of financial accounting including journal entries, ledgers, financial statements, and accounting principles. Perfect for beginners starting their accounting journey.',
      level: 'Beginner',
      duration: '12 weeks',
    },
    {
      id: '2',
      code: 'MTH201',
      name: 'Advanced Calculus',
      subject: 'Mathematics',
      instructor: 'Prof. Michael Chen',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael',
      schedule: 'Tue & Thu, 2:00 PM - 3:30 PM',
      students: 32,
      description: 'Advanced topics in calculus including multivariable calculus, differential equations, and vector calculus. Requires strong foundation in basic calculus.',
      level: 'Advanced',
      duration: '16 weeks',
    },
    {
      id: '3',
      code: 'CS301',
      name: 'Data Structures and Algorithms',
      subject: 'Computer Science',
      instructor: 'Dr. Emily Rodriguez',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily',
      schedule: 'Mon, Wed & Fri, 9:00 AM - 10:00 AM',
      students: 58,
      description: 'Study fundamental data structures and algorithms including arrays, linked lists, trees, graphs, sorting, and searching. Essential for software engineering.',
      level: 'Intermediate',
      duration: '14 weeks',
    },
    {
      id: '4',
      code: 'BUS202',
      name: 'Marketing Strategy',
      subject: 'Business',
      instructor: 'Prof. David Williams',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
      schedule: 'Tue & Thu, 11:00 AM - 12:30 PM',
      students: 41,
      description: 'Explore marketing strategies, consumer behavior, market research, and digital marketing techniques. Learn how to create effective marketing campaigns.',
      level: 'Intermediate',
      duration: '10 weeks',
    },
    {
      id: '5',
      code: 'CHM101',
      name: 'Introduction to Chemistry',
      subject: 'Chemistry',
      instructor: 'Dr. Rachel Green',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rachel',
      schedule: 'Mon & Wed, 1:00 PM - 2:30 PM',
      students: 38,
      description: 'Basic chemistry concepts including atomic structure, chemical bonding, reactions, and stoichiometry. Laboratory work included.',
      level: 'Beginner',
      duration: '12 weeks',
    },
    {
      id: '6',
      code: 'ENG150',
      name: 'Academic Writing',
      subject: 'English',
      instructor: 'Prof. James Parker',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=james',
      schedule: 'Tue & Thu, 9:00 AM - 10:30 AM',
      students: 50,
      description: 'Develop strong academic writing skills including research papers, essays, citations, and critical analysis. Essential for all majors.',
      level: 'Beginner',
      duration: '8 weeks',
    },
    {
      id: '7',
      code: 'PHY301',
      name: 'Quantum Mechanics',
      subject: 'Physics',
      instructor: 'Dr. Alan Cooper',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alan',
      schedule: 'Mon, Wed & Fri, 2:00 PM - 3:00 PM',
      students: 28,
      description: 'Advanced quantum mechanics covering wave functions, Schrödinger equation, quantum operators, and applications. Prerequisites required.',
      level: 'Advanced',
      duration: '16 weeks',
    },
    {
      id: '8',
      code: 'ART210',
      name: 'Digital Design Fundamentals',
      subject: 'Art & Design',
      instructor: 'Prof. Maya Stevens',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maya',
      schedule: 'Tue & Thu, 3:00 PM - 5:00 PM',
      students: 35,
      description: 'Learn digital design principles, color theory, typography, and tools like Adobe Creative Suite. Build a professional portfolio.',
      level: 'Beginner',
      duration: '10 weeks',
    },
    {
      id: '9',
      code: 'ECO202',
      name: 'Microeconomics',
      subject: 'Economics',
      instructor: 'Dr. Robert Martinez',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=robert',
      schedule: 'Mon & Wed, 3:00 PM - 4:30 PM',
      students: 44,
      description: 'Study supply and demand, market structures, consumer behavior, and production theory. Real-world economic analysis.',
      level: 'Intermediate',
      duration: '12 weeks',
    },
    {
      id: '10',
      code: 'PSY101',
      name: 'Introduction to Psychology',
      subject: 'Psychology',
      instructor: 'Prof. Lisa Anderson',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa',
      schedule: 'Tue & Thu, 10:00 AM - 11:30 AM',
      students: 52,
      description: 'Explore fundamental concepts in psychology including cognition, behavior, development, and mental health. Engaging and interactive.',
      level: 'Beginner',
      duration: '12 weeks',
    },
    {
      id: '11',
      code: 'BIO301',
      name: 'Molecular Biology',
      subject: 'Biology',
      instructor: 'Dr. Kevin Wright',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kevin',
      schedule: 'Mon, Wed & Fri, 11:00 AM - 12:00 PM',
      students: 30,
      description: 'Advanced molecular biology covering DNA replication, gene expression, protein synthesis, and biotechnology applications.',
      level: 'Advanced',
      duration: '14 weeks',
    },
    {
      id: '12',
      code: 'HIS150',
      name: 'World History',
      subject: 'History',
      instructor: 'Prof. Thomas Baker',
      instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=thomas',
      schedule: 'Tue & Thu, 1:00 PM - 2:30 PM',
      students: 47,
      description: 'Survey of world history from ancient civilizations to modern times. Explore cultural, political, and economic developments.',
      level: 'Beginner',
      duration: '14 weeks',
    },
  ];

  const filteredClasses = availableClasses.filter(classItem => {
    const matchesSearch = classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         classItem.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         classItem.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || classItem.level.toLowerCase() === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const handleJoinWithCode = () => {
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const foundClass = availableClasses.find(c => c.code.toUpperCase() === joinCode.toUpperCase());
      
      if (foundClass) {
        setSelectedClass(foundClass);
        setError('');
        setJoinCode('');
      } else {
        setError('Invalid class code. Please check and try again.');
      }
      
      setIsLoading(false);
    }, 800);
  };

  const handleConfirmJoin = () => {
    if (!selectedClass) {
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      setJoinSuccess(true);
      setIsLoading(false);
      
      setTimeout(() => {
        navigate(`/live-class/${selectedClass.id}`, { state: { classItem: selectedClass } });
      }, 2000);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && joinCode.trim()) {
      handleJoinWithCode();
    }
  };

  if (joinSuccess && selectedClass) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Successfully Joined!</h2>
          <p className="text-gray-600 mb-4">
            You've been enrolled in <span className="font-semibold">{selectedClass.name}</span>
          </p>
          <p className="text-sm text-gray-500">Launching live classroom...</p>
          <button
            onClick={() => navigate(`/live-class/${selectedClass.id}`, { state: { classItem: selectedClass } })}
            className="mt-4 w-full rounded-lg bg-[#3D08BA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2D0690] transition-colors"
          >
            Enter Live Classroom Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
            </button>
            <p className="text-sm text-gray-600">Browse classes or enter a class code</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-8">
        {/* Join with Code Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Have a Class Code?</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="Enter code (e.g., ACC101)"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-[#3D08BA] font-mono uppercase text-sm"
              maxLength={10}
            />
            <button
              onClick={handleJoinWithCode}
              disabled={!joinCode.trim() || isLoading}
              className="px-6 py-2.5 bg-[#3D08BA] text-white rounded-lg hover:bg-[#2D0690] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap text-sm"
            >
              {isLoading ? 'Checking...' : 'Join Class'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-500 rounded-lg flex items-start gap-2">
              <XCircleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-[#3D08BA] text-sm"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm ${
                    selectedFilter === filter
                      ? 'bg-[#3D08BA] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Available Classes Grid */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Available Classes ({filteredClasses.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map((classItem) => (
              <div
                key={classItem.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all overflow-hidden"
              >
                {/* Class Header */}
                <div className="bg-[#3D08BA] p-4 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold bg-red-500 px-2 py-1 rounded">
                      {classItem.code}
                    </span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">
                      {classItem.level}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">
                    {classItem.name}
                  </h3>
                  <p className="text-xs opacity-90">{classItem.subject}</p>
                </div>

                {/* Class Body */}
                <div className="p-4">
                  {/* Instructor */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                      {classItem.instructorImage ? (
                        <img
                          src={classItem.instructorImage}
                          alt={classItem.instructor}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <AcademicCapIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {classItem.instructor}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {classItem.description}
                  </p>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <ClockIcon className="w-4 h-4" />
                      <span className="truncate">{classItem.schedule}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <UserGroupIcon className="w-4 h-4" />
                        <span>{classItem.students} students</span>
                      </div>
                      <span className="font-medium">{classItem.duration}</span>
                    </div>
                  </div>

                  {/* Join Button */}
                  <button
                    onClick={() => setSelectedClass(classItem)}
                    className="w-full px-4 py-2 bg-[#3D08BA] text-white rounded-lg hover:bg-[#2D0690] transition-colors font-medium text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredClasses.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <AcademicCapIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">No classes found</h3>
              <p className="text-sm text-gray-600">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </main>

      {/* Class Detail Modal */}
      {selectedClass && !joinSuccess && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedClass(null)}
          />
          <div className="relative bg-white rounded-xl border border-gray-200 max-w-2xl w-full my-8">
            {/* Class Header */}
            <div className="bg-[#3D08BA] p-6 text-white rounded-t-xl">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold bg-red-500 px-2.5 py-1 rounded">
                      {selectedClass.code}
                    </span>
                    <span className="text-sm bg-white/20 px-2.5 py-1 rounded">
                      {selectedClass.level}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-2">
                    {selectedClass.name}
                  </h2>
                  <p className="text-sm opacity-90">{selectedClass.subject}</p>
                </div>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm opacity-95 leading-relaxed">{selectedClass.description}</p>
            </div>

            {/* Class Info */}
            <div className="p-6">
              {/* Instructor */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                  {selectedClass.instructorImage ? (
                    <img
                      src={selectedClass.instructorImage}
                      alt={selectedClass.instructor}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <AcademicCapIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Instructor</p>
                  <p className="font-semibold text-gray-900">{selectedClass.instructor}</p>
                </div>
              </div>

              {/* Class Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <ClockIcon className="w-5 h-5 text-[#3D08BA] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600">Schedule</p>
                    <p className="font-medium text-gray-900 text-sm">{selectedClass.schedule}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <UserGroupIcon className="w-5 h-5 text-[#3D08BA] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600">Enrolled Students</p>
                    <p className="font-medium text-gray-900 text-sm">{selectedClass.students} students</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <AcademicCapIcon className="w-5 h-5 text-[#3D08BA] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600">Level</p>
                    <p className="font-medium text-gray-900 text-sm">{selectedClass.level}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <svg className="w-5 h-5 text-[#3D08BA] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-600">Duration</p>
                    <p className="font-medium text-gray-900 text-sm">{selectedClass.duration}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={handleConfirmJoin}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-[#3D08BA] text-white rounded-lg hover:bg-[#2D0690] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold text-sm"
                >
                  {isLoading ? 'Joining...' : 'Confirm & Join Class'}
                </button>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default JoinClass;
