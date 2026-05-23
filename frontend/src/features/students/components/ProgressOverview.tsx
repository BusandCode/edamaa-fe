import { ChevronRightIcon } from '@heroicons/react/24/outline';

export interface SubjectProgress {
  id: string;
  subject: string;
  progress: number;
  totalItems: number;
  completedItems: number;
  color: string;
  nextLabel: string;
  summaryLabel?: string;
}

type ProgressOverviewProps = {
  subjects?: SubjectProgress[];
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
  emptyMessage?: string;
};

const fallbackSubjects: SubjectProgress[] = [
    {
      id: '1',
      subject: 'Mathematics',
      progress: 75,
      totalItems: 20,
      completedItems: 15,
      color: 'bg-blue-500',
      nextLabel: 'Integration Techniques',
    },
    {
      id: '2',
      subject: 'Physics',
      progress: 60,
      totalItems: 18,
      completedItems: 11,
      color: 'bg-purple-500',
      nextLabel: 'Quantum Mechanics Basics',
    },
    {
      id: '3',
      subject: 'Chemistry',
      progress: 85,
      totalItems: 16,
      completedItems: 14,
      color: 'bg-green-500',
      nextLabel: 'Organic Chemistry Review',
    },
    {
      id: '4',
      subject: 'Biology',
      progress: 45,
      totalItems: 22,
      completedItems: 10,
      color: 'bg-red-500',
      nextLabel: 'Cell Division',
    },
    {
      id: '5',
      subject: 'English Literature',
      progress: 90,
      totalItems: 12,
      completedItems: 11,
      color: 'bg-orange-500',
      nextLabel: 'Final Essay Review',
    },
  ];

const ProgressOverview = ({
  subjects,
  title = 'Subject progress',
  subtitle = '',
  actionLabel,
  onAction,
  isLoading = false,
  emptyMessage = 'Your subject performance will appear here once results are published.',
}: ProgressOverviewProps) => {
  const collection = subjects ?? fallbackSubjects;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="text-sm text-[#3D08BA] hover:text-[#2D0690] font-medium"
          >
            {actionLabel}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-5 text-sm text-gray-500">
          Loading subject performance...
        </div>
      ) : collection.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-6">
          {collection.map((subject) => (
            <div key={subject.id} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {subject.subject}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {subject.summaryLabel ||
                      `${subject.completedItems} of ${subject.totalItems} checkpoints completed`}
                  </p>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {subject.progress}%
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className={`${subject.color} h-full rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${subject.progress}%` }}
                >
                  <div className="h-full w-full bg-white/20 animate-pulse"></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Latest: {subject.nextLabel}</span>
                {onAction && (
                  <button
                    type="button"
                    onClick={onAction}
                    className="flex items-center gap-1 text-[#3D08BA] hover:text-[#2D0690] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Open
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgressOverview;
