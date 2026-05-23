import { useEffect, useMemo, useState } from 'react';
import { FaSearch, FaPhone, FaCommentDots, FaTimes, FaUserGraduate, FaPen } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { students } from './students';
import StudentCommunicationPanel, {
  type CommunicationMode,
} from '../../../../components/communication/StudentCommunicationPanel';
import useMissedCallInbox from '../../../shared/hooks/useMissedCallInbox';

type StudentRecord = (typeof students)[number];

const StudentList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [communicationMode, setCommunicationMode] = useState<CommunicationMode>('chat');
  const [actionNotice, setActionNotice] = useState('');
  const studentRoster = useMemo(
    () =>
      students.map((student) => ({
        id: Number(student.id),
        name: student.name,
      })),
    []
  );

  const {
    missedCallsCount,
    missedCountByStudentId,
    recentMissedCalls,
    clearMissedCalls,
  } = useMissedCallInbox({
    storageKey: 'edamaa:tutor:missed-calls',
    students: studentRoster,
    onNewMissedCall: (entry) => {
      const statusText = entry.reason === 'declined' ? 'declined' : 'missed';
      setActionNotice(`${entry.studentName} ${statusText} your ${entry.mode} call.`);
    },
  });

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

        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-red-700">Missed Call Inbox: {missedCallsCount}</p>
            {missedCallsCount > 0 && (
              <button
                onClick={clearMissedCalls}
                className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Clear
              </button>
            )}
          </div>
          {recentMissedCalls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-red-800">
              {recentMissedCalls.map((entry) => (
                <span key={entry.id} className="rounded-full border border-red-200 bg-white px-2.5 py-1">
                  {entry.studentName} • {entry.mode} • {entry.reason}
                </span>
              ))}
            </div>
          )}
        </div>

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
          {filteredStudents.map((student, index) => {
            const studentMissedCalls = missedCountByStudentId[Number(student.id)] || 0;
            return (
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
                    className="relative cursor-pointer text-blue-600 hover:text-blue-700"
                    onClick={() => openCommunication(student, 'audio')}
                    title={`Call ${student.name}`}
                  >
                    <FaPhone />
                    {studentMissedCalls > 0 && (
                      <span className="absolute -top-2 -right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {studentMissedCalls > 9 ? '9+' : studentMissedCalls}
                      </span>
                    )}
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
            );
          })}
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
