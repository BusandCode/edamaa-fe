import { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface ScheduleClassProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (classData: NewClassData) => Promise<{ ok: boolean; message: string }>;
  mode?: 'create' | 'edit';
  initialClass?: NewClassData | null;
}

export interface NewClassData {
  id: string;
  title: string;
  date: string;
  time: string;
  students: number;
  avatars: number;
  source?: 'independent' | 'assigned-school' | 'sample';
  roomCode?: string;
  subject?: string;
  instructor?: string;
  instructorImage?: string;
  scheduleLabel?: string;
  duration?: string;
  notes?: string;
  startAtIso?: string;
  durationMinutes?: number;
}

interface ScheduleFormData {
  title: string;
  date: string;
  time: string;
  duration: string;
  students: string;
}

const emptyScheduleForm = (): ScheduleFormData => ({
  title: '',
  date: '',
  time: '',
  duration: '60',
  students: '',
});

const toDateInputValue = (isoValue?: string) => {
  if (!isoValue) {
    return '';
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (isoValue?: string) => {
  if (!isoValue) {
    return '';
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const ScheduleClass = ({
  isOpen,
  onClose,
  onSchedule,
  mode = 'create',
  initialClass = null,
}: ScheduleClassProps) => {
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>({
    ...emptyScheduleForm(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const calendarYearOptions = Array.from({ length: 41 }, (_, index) => new Date().getFullYear() - 20 + index);
  const monthOptions = [
    { value: '01', label: 'Jan' },
    { value: '02', label: 'Feb' },
    { value: '03', label: 'Mar' },
    { value: '04', label: 'Apr' },
    { value: '05', label: 'May' },
    { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' },
    { value: '08', label: 'Aug' },
    { value: '09', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' },
  ];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === 'edit' && initialClass) {
      setScheduleForm({
        title: initialClass.title || '',
        date: toDateInputValue(initialClass.startAtIso),
        time: toTimeInputValue(initialClass.startAtIso),
        duration: String(initialClass.durationMinutes || 60),
        students: String(initialClass.students || 0),
      });
      return;
    }

    setScheduleForm(emptyScheduleForm());
  }, [initialClass, isOpen, mode]);

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    
    if (!scheduleForm.title || !scheduleForm.date || !scheduleForm.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Format date for display
    const dateObj = new Date(scheduleForm.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: '2-digit' 
    });

    // Convert 24h time to 12h format
    const [hours, minutes] = scheduleForm.time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;
    const formattedTime = `${displayHour}:${minutes}${ampm}`;

    const startAtIso = new Date(`${scheduleForm.date}T${scheduleForm.time}:00`).toISOString();
    const durationMinutes = Number.parseInt(scheduleForm.duration, 10) || 60;

    const newClass: NewClassData = {
      id: mode === 'edit' && initialClass?.id ? initialClass.id : String(Date.now()),
      title: scheduleForm.title,
      date: formattedDate,
      time: formattedTime,
      students: parseInt(scheduleForm.students) || 0,
      avatars: 3,
      source: 'independent',
      startAtIso,
      durationMinutes,
    };

    setIsSubmitting(true);
    try {
      const result = await onSchedule(newClass);
      if (!result.ok) {
        toast.error(result.message || 'Unable to schedule class right now.');
        return;
      }

      toast.success(result.message || 'Class scheduled successfully!');
      onClose();

      // Reset form after successful submit only.
      setScheduleForm(emptyScheduleForm());
    } catch {
      toast.error('Unable to schedule class right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setScheduleForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateYearChange = (yearText: string) => {
    const selectedYear = Number.parseInt(yearText, 10);
    if (!Number.isFinite(selectedYear)) {
      return;
    }

    setScheduleForm((prev) => {
      const current = prev.date || `${new Date().getFullYear()}-01-01`;
      const [yearPart, monthPart, dayPart] = current.split('-');
      if (!yearPart || !monthPart || !dayPart) {
        return prev;
      }
      return { ...prev, date: `${selectedYear}-${monthPart}-${dayPart}` };
    });
  };

  const handleDateMonthChange = (monthText: string) => {
    const normalizedMonth = String(monthText || '').padStart(2, '0');
    if (!normalizedMonth) {
      return;
    }

    setScheduleForm((prev) => {
      const base = prev.date || `${new Date().getFullYear()}-01-01`;
      const [year = String(new Date().getFullYear()), , day = '01'] = base.split('-');
      return { ...prev, date: `${year}-${normalizedMonth}-${day}` };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800">
            {mode === 'edit' ? 'Edit Scheduled Class' : 'Schedule New Class'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {/* Class Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={scheduleForm.title}
                onChange={handleInputChange}
                placeholder="e.g., Introduction to Python Programming"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  name="date"
                  value={scheduleForm.date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                  required
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500">Jump year:</label>
                  <select
                    value={scheduleForm.date ? scheduleForm.date.slice(0, 4) : ''}
                    onChange={(event) => handleDateYearChange(event.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                  >
                    <option value="">Select year</option>
                    {calendarYearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                      ))}
                    </select>
                    <label className="text-xs font-semibold text-gray-500">Month:</label>
                    <select
                      value={scheduleForm.date ? scheduleForm.date.slice(5, 7) : ''}
                      onChange={(event) => handleDateMonthChange(event.target.value)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                    >
                      <option value="">Select month</option>
                      {monthOptions.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                </div>
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="time"
                value={scheduleForm.time}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <select
                name="duration"
                value={scheduleForm.duration}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            {/* Expected Students */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Students
              </label>
              <input
                type="number"
                name="students"
                value={scheduleForm.students}
                onChange={handleInputChange}
                placeholder="e.g., 25"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-2 py-2 bg-[#3D08BA] text-white rounded-lg font-semibold hover:bg-[#2c0691] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? mode === 'edit'
                  ? 'Saving changes...'
                  : 'Scheduling...'
                : mode === 'edit'
                  ? 'Save Changes'
                  : 'Schedule Class'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleClass;
