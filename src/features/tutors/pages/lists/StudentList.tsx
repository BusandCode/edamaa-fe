import { students } from './students';
import {
  FaSearch,
  FaPhone,
  FaCommentDots,
  FaTimes,
  FaUserGraduate,
  FaPen
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const StudentList = () => {

  const handleBackClick = () => {
    const navigate = useNavigate();
    navigate(-1);
  };
  
  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Students Lists</h1>
          <button onClick={handleBackClick} className="text-sm bg-black text-white px-4 py-1 rounded-full">
            Back
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <input
            type="text"
            placeholder="Search Tutors name or ID"
            className="w-full border rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none"
          />
          <FaSearch className="absolute left-4 top-3 text-gray-400" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            <FaUserGraduate />
            <span className="font-semibold">{students.length}</span>
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

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-7 text-xs font-semibold text-gray-500 px-4 mb-2">
          <span>S/N</span>
          <span>Name</span>
          <span>Class</span>
          <span>Dept</span>
          <span>Phone NO</span>
          <span>Assigned Tutor</span>
          <span>Actions</span>
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {students.map((student, index) => (
            <div
              key={student.id}
              className="grid grid-cols-2 md:grid-cols-7 items-center bg-pink-50 rounded-lg px-4 py-3 text-sm"
            >
              <span>{index + 1}.</span>

              <div className="flex items-center gap-2">
                <img
                  src={student.avatar}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
                <span>{student.name}</span>
              </div>

              <span>{student.class}</span>
              <span>{student.dept}</span>
              <span>{student.phone}</span>
              <span>{student.tutor}</span>

              <div className="flex items-center gap-3">
                <FaPhone className="cursor-pointer" />
                <FaCommentDots className="cursor-pointer" />
                <FaTimes className="cursor-pointer" />
              </div>
            </div>
          ))}
        </div>

        {/* View More */}
        <div className="text-center mt-6 text-sm font-medium cursor-pointer">
          View More
        </div>
      </div>
    </div>
  );
};

export default StudentList;
