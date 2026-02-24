import { useEffect, useMemo, useState } from 'react';
import {
  FaSearch,
  FaPhone,
  FaCommentDots,
  FaUserGraduate,
  FaFilter,
  FaEye,
  FaEdit,
} from 'react-icons/fa';
import { students } from './students';
import NavBar from '../../../../components/layout/school-layout/NavBar';
import StudentCommunicationPanel, {
  type CommunicationMode,
} from '../../../../components/communication/StudentCommunicationPanel';
import useMissedCallInbox from '../../../shared/hooks/useMissedCallInbox';

type StudentRecord = (typeof students)[number];

const StudentList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [showFilters, setShowFilters] = useState(false);
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
    storageKey: 'edamaa:school:missed-calls',
    students: studentRoster,
    onNewMissedCall: (entry) => {
      const statusText = entry.reason === 'declined' ? 'declined' : 'missed';
      setActionNotice(`${entry.studentName} ${statusText} your ${entry.mode} call.`);
    },
  });

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const matchesSearch =
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.phone.includes(searchQuery);
        const matchesClass = selectedClass === 'All Classes' || student.class === selectedClass;
        const matchesDept = selectedDept === 'All Departments' || student.dept === selectedDept;
        return matchesSearch && matchesClass && matchesDept;
      }),
    [searchQuery, selectedClass, selectedDept]
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
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 pb-24">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#3D08BA]">Student Directory</h1>
              <p className="text-gray-600 text-sm mt-1">Manage and track all students</p>
            </div>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-4 py-3 text-sm text-[#3D08BA]">
            {actionNotice}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search by name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-4 text-gray-400" />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-[#3D08BA] font-medium hover:underline"
          >
            <FaFilter size={12} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          {showFilters && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                >
                  <option>All Classes</option>
                  <option>SS1</option>
                  <option>SS2</option>
                  <option>SS3</option>
                  <option>S.S.3</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Department</label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                >
                  <option>All Departments</option>
                  <option>Science</option>
                  <option>Arts</option>
                  <option>Commercial</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-[#3D08BA]">{filteredStudents.length}</span> of {students.length}{' '}
            students
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
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

        <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">S/N</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tutor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student, index) => {
                  const studentMissedCalls = missedCountByStudentId[Number(student.id)] || 0;
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatar}
                            alt={student.name}
                            className="w-10 h-10 rounded-full border-2 border-gray-200"
                          />
                          <span className="text-sm font-medium text-gray-900">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{student.class}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{student.dept}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{student.phone}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{student.tutor}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              student.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                          ></div>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button className="text-[#3D08BA] hover:text-[#2D0690] transition-colors" title="View">
                            <FaEye size={16} />
                          </button>
                          <button
                            onClick={() => openCommunication(student, 'audio')}
                            className="relative text-blue-500 hover:text-blue-600 transition-colors"
                            title={`Call ${student.name}`}
                          >
                            <FaPhone size={14} />
                            {studentMissedCalls > 0 && (
                              <span className="absolute -top-2 -right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {studentMissedCalls > 9 ? '9+' : studentMissedCalls}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => openCommunication(student, 'chat')}
                            className="text-green-500 hover:text-green-600 transition-colors"
                            title={`Chat ${student.name}`}
                          >
                            <FaCommentDots size={14} />
                          </button>
                          <button className="text-gray-500 hover:text-gray-600 transition-colors" title="Edit">
                            <FaEdit size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden space-y-3">
          {filteredStudents.map((student) => {
            const studentMissedCalls = missedCountByStudentId[Number(student.id)] || 0;
            return (
              <div key={student.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full border-2 border-gray-200" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {student.class} • {student.dept}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
                          student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            student.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                        ></div>
                        {student.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaPhone size={12} className="text-gray-400" />
                    <span>{student.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaUserGraduate size={12} className="text-gray-400" />
                    <span>Tutor: {student.tutor}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button className="flex-1 bg-[#3D08BA] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#2D0690] transition-colors">
                    View Profile
                  </button>
                  <button
                    onClick={() => openCommunication(student, 'audio')}
                    className="relative p-2 border border-gray-300 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <FaPhone size={14} />
                    {studentMissedCalls > 0 && (
                      <span className="absolute -top-2 -right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {studentMissedCalls > 9 ? '9+' : studentMissedCalls}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => openCommunication(student, 'chat')}
                    className="p-2 border border-gray-300 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                  >
                    <FaCommentDots size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredStudents.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FaUserGraduate className="text-5xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No students found</h3>
            <p className="text-sm text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {selectedStudent && (
        <StudentCommunicationPanel
          student={selectedStudent}
          role="school"
          initialMode={communicationMode}
          onClose={() => setSelectedStudent(null)}
          onNotice={setActionNotice}
        />
      )}

      <NavBar activeTab="students" />
    </div>
  );
};

export default StudentList;
