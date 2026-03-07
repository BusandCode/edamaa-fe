import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaChalkboardTeacher,
  FaEnvelope,
  FaSearch,
  FaUserTie,
  FaVideo,
} from 'react-icons/fa';
import NavBar from '../../../../components/layout/school-layout/NavBar';
import {
  fetchSchoolTutorDirectory,
  type SchoolTutorDirectoryItem,
} from '../../utils/schoolTutorsApi';

const buildTutorAvatar = (seed: string) =>
  `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(seed)}`;

const TutorListSchool = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [tutors, setTutors] = useState<SchoolTutorDirectoryItem[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await fetchSchoolTutorDirectory(searchQuery);
        setTutors(Array.isArray(payload.tutors) ? payload.tutors : []);
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load tutor directory right now.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!actionNotice) {
      return;
    }
    const timer = window.setTimeout(() => setActionNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  const tutorCountLabel = useMemo(
    () => `${tutors.length} tutor${tutors.length === 1 ? '' : 's'} available`,
    [tutors.length]
  );

  const openSchoolLiveClassForTutor = (tutor: SchoolTutorDirectoryItem) => {
    const classId = `school-live-${Date.now().toString().slice(-6)}`;
    const classItem = {
      id: classId,
      code: 'SCH-TUTOR-LIVE',
      name: `${tutor.name || 'Tutor'} Live Session`,
      subject: 'Tutor Session',
      instructor: tutor.name || tutor.email,
      schedule: 'Live now',
      students: 40,
      description: 'School-led live classroom session.',
      level: 'Intermediate' as const,
      duration: '90 mins',
    };
    navigate(`/live-class/${classId}?role=teacher&actor=school`, { state: { classItem } });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 pb-24">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/school-dashboard')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3D08BA]/20 bg-white text-[#3D08BA] transition-colors hover:bg-[#3D08BA]/5"
                aria-label="Back to dashboard"
                title="Back to dashboard"
              >
                <FaArrowLeft size={13} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[#3D08BA]">Tutor Directory</h1>
                <p className="mt-1 text-sm text-gray-600">Find tutors and start a school live class quickly.</p>
              </div>
            </div>
            <p className="rounded-full border border-[#3D08BA]/20 bg-white px-3 py-1 text-xs font-semibold text-[#3D08BA]">
              {tutorCountLabel}
            </p>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="mx-auto mt-4 max-w-6xl px-4">
          <div className="rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-4 py-3 text-sm text-[#3D08BA]">
            {actionNotice}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 rounded-xl bg-white p-4 shadow-sm">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tutor by name or email..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
            />
            <FaSearch className="absolute left-3 top-4 text-gray-400" />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-5 text-sm text-gray-600">
            Loading tutor directory...
          </div>
        )}

        {!isLoading && tutors.length === 0 && !error && (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <FaUserTie className="mx-auto mb-4 text-5xl text-gray-300" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No tutors found</h3>
            <p className="text-sm text-gray-600">Try a different search or add tutors to your school account.</p>
          </div>
        )}

        {!isLoading && tutors.length > 0 && (
          <>
            <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tutor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tutors.map((tutor) => (
                      <tr key={tutor.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={buildTutorAvatar(tutor.name || tutor.email)}
                              alt={tutor.name || tutor.email}
                              className="h-10 w-10 rounded-full border-2 border-gray-200"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{tutor.name || 'Tutor'}</p>
                              <p className="text-xs text-gray-500">Role: Tutor</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">{tutor.email}</td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {new Date(tutor.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <a
                              href={`mailto:${encodeURIComponent(tutor.email)}`}
                              className="text-[#3D08BA] transition-colors hover:text-[#2D0690]"
                              title={`Email ${tutor.name || tutor.email}`}
                            >
                              <FaEnvelope size={15} />
                            </a>
                            <button
                              onClick={() => openSchoolLiveClassForTutor(tutor)}
                              className="text-blue-500 transition-colors hover:text-blue-600"
                              title={`Start live class with ${tutor.name || tutor.email}`}
                            >
                              <FaVideo size={15} />
                            </button>
                            <button
                              onClick={() =>
                                setActionNotice(`Assignment workflow for ${tutor.name || tutor.email} is ready to wire next.`)
                              }
                              className="text-green-600 transition-colors hover:text-green-700"
                              title="Assign classes"
                            >
                              <FaChalkboardTeacher size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {tutors.map((tutor) => (
                <div key={tutor.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start gap-3">
                    <img
                      src={buildTutorAvatar(tutor.name || tutor.email)}
                      alt={tutor.name || tutor.email}
                      className="h-12 w-12 rounded-full border-2 border-gray-200"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{tutor.name || 'Tutor'}</h3>
                      <p className="mt-0.5 text-xs text-gray-500">{tutor.email}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Joined {new Date(tutor.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  </div>

                  <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                    <a
                      href={`mailto:${encodeURIComponent(tutor.email)}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <FaEnvelope size={12} />
                      Email
                    </a>
                    <button
                      onClick={() => openSchoolLiveClassForTutor(tutor)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#3D08BA] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2D0690]"
                    >
                      <FaVideo size={12} />
                      Go Live
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <NavBar activeTab="students" />
    </div>
  );
};

export default TutorListSchool;
