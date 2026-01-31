import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface SubjectProgress {
  id: string;
  subject: string;
  progress: number;
  totalTopics: number;
  completedTopics: number;
  color: string;
  nextTopic: string;
}

const ProgressOverview = () => {
  const subjects: SubjectProgress[] = [
    {
      id: '1',
      subject: 'Mathematics',
      progress: 75,
      totalTopics: 20,
      completedTopics: 15,
      color: 'bg-blue-500',
      nextTopic: 'Integration Techniques',
    },
    {
      id: '2',
      subject: 'Physics',
      progress: 60,
      totalTopics: 18,
      completedTopics: 11,
      color: 'bg-purple-500',
      nextTopic: 'Quantum Mechanics Basics',
    },
    {
      id: '3',
      subject: 'Chemistry',
      progress: 85,
      totalTopics: 16,
      completedTopics: 14,
      color: 'bg-green-500',
      nextTopic: 'Organic Chemistry Review',
    },
    {
      id: '4',
      subject: 'Biology',
      progress: 45,
      totalTopics: 22,
      completedTopics: 10,
      color: 'bg-red-500',
      nextTopic: 'Cell Division',
    },
    {
      id: '5',
      subject: 'English Literature',
      progress: 90,
      totalTopics: 12,
      completedTopics: 11,
      color: 'bg-orange-500',
      nextTopic: 'Final Essay Review',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Subject Progress</h2>
        {/* <button className="text-sm text-[#3D08BA] hover:text-[#2D0690] font-medium">
          View Details
        </button> */}
      </div>

      <div className="space-y-6">
        {subjects.map((subject) => (
          <div key={subject.id} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {subject.subject}
                </h3>
                <p className="text-sm text-gray-600">
                  {subject.completedTopics} of {subject.totalTopics} topics completed
                </p>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {subject.progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
              <div
                className={`${subject.color} h-full rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${subject.progress}%` }}
              >
                <div className="h-full w-full bg-white/20 animate-pulse"></div>
              </div>
            </div>

            {/* Next Topic */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Next: {subject.nextTopic}</span>
              <button className="flex items-center gap-1 text-[#3D08BA] hover:text-[#2D0690] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Continue
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressOverview;