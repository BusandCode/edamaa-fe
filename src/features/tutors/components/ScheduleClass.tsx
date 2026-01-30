import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface ScheduleClassProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (classData: NewClassData) => void;
}

export interface NewClassData {
  id: number;
  title: string;
  date: string;
  time: string;
  students: number;
  avatars: number;
}

interface ScheduleFormData {
  title: string;
  date: string;
  time: string;
  duration: string;
  students: string;
}

const ScheduleClass = ({ isOpen, onClose, onSchedule }: ScheduleClassProps) => {
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>({
    title: '',
    date: '',
    time: '',
    duration: '60',
    students: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
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

    const newClass: NewClassData = {
      id: Date.now(), // Using timestamp as unique ID
      title: scheduleForm.title,
      date: formattedDate,
      time: formattedTime,
      students: parseInt(scheduleForm.students) || 0,
      avatars: 3
    };

    onSchedule(newClass);
    toast.success('Class scheduled successfully!');
    onClose();
    
    // Reset form
    setScheduleForm({
      title: '',
      date: '',
      time: '',
      duration: '60',
      students: ''
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setScheduleForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800">Schedule New Class</h2>
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
              <input
                type="date"
                name="date"
                value={scheduleForm.date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                required
              />
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-2 py-2 bg-[#3D08BA] text-white rounded-lg font-semibold hover:bg-[#2c0691] transition-colors"
            >
              Schedule Class
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleClass;