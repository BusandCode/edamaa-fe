import { useEffect, useMemo, useState } from 'react';
import { FaSearch, FaPhone, FaCommentDots, FaTimes, FaUserGraduate, FaPen } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { students } from './students';
import StudentCommunicationPanel, {
  type CommunicationMode,
} from '../../../../components/communication/StudentCommunicationPanel';

type StudentRecord = (typeof students)[number];

const StudentList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [communicationMode, setCommunicationMode] = useState<CommunicationMode>('chat');
  const [actionNotice, setActionNotice] = useState('');

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
          return true;
        }
        return student.name.toLowerCase().includes(query) || student.phone.includes(query);
      }),
    [searchQuery]
  );

  useEffect(() => {
    if (!actionNotice) {
      return;
    }
    const timer = window.setTimeout(() => setActionNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  const openCommunication = (student: StudentRecord, mode: CommunicationMode) => {
    setSelectedStudent(student);
    setCommunicationMode(mode);
  };

  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Students Lists</h1>
          <button onClick={() => navigate(-1)} className="text-sm bg-black text-white px-4 py-1 rounded-full">
            Back
          </button>
        </div>

        {actionNotice && (
          <div className="mb-4 rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-4 py-3 text-sm text-[#3D08BA]">
            {actionNotice}
          </div>
        )}

        <div className="relative mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name or phone"
            className="w-full border rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none"
          />
          <FaSearch className="absolute left-4 top-3 text-gray-400" />
        </div>

        <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            <FaUserGraduate />
            <span className="font-semibold">{filteredStudents.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <select className="border rounded-full px-4 py-1 text-sm">
              <option>Class</option>
            </select>

            <select className="border rounded-full px-4 py-1 text-sm">
              <option>Name</option>
            </select>

            <button className="border rounded-full p-2">
              <FaPen size={12} />
            </button>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-7 text-xs font-semibold text-gray-500 px-4 mb-2">
          <span>S/N</span>
          <span>Name</span>
          <span>Class</span>
          <span>Dept</span>
          <span>Phone NO</span>
          <span>Assigned Tutor</span>
          <span>Actions</span>
        </div>

        <div className="space-y-3">
          {filteredStudents.map((student, index) => (
            <div
              key={student.id}
              className="grid grid-cols-2 md:grid-cols-7 items-center bg-pink-50 rounded-lg px-4 py-3 text-sm"
            >
              <span>{index + 1}.</span>

              <div className="flex items-center gap-2">
                <img src={student.avatar} alt={student.name} className="w-6 h-6 rounded-full" />
                <span>{student.name}</span>
              </div>

              <span>{student.class}</span>
              <span>{student.dept}</span>
              <span>{student.phone}</span>
              <span>{student.tutor}</span>

              <div className="flex items-center gap-3">
                <button
                  className="cursor-pointer text-blue-600 hover:text-blue-700"
                  onClick={() => openCommunication(student, 'audio')}
                  title={`Call ${student.name}`}
                >
                  <FaPhone />
                </button>
                <button
                  className="cursor-pointer text-green-600 hover:text-green-700"
                  onClick={() => openCommunication(student, 'chat')}
                  title={`Chat ${student.name}`}
                >
                  <FaCommentDots />
                </button>
                <button className="cursor-pointer text-gray-500 hover:text-gray-600">
                  <FaTimes />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-6 text-sm font-medium cursor-pointer">View More</div>
      </div>

      {selectedStudent && (
        <StudentCommunicationPanel
          student={selectedStudent}
          role="tutor"
          initialMode={communicationMode}
          onClose={() => setSelectedStudent(null)}
          onNotice={setActionNotice}
        />
      )}
    </div>
  );
};

export default StudentList;
