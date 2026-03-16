import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaKey, FaSignInAlt } from 'react-icons/fa';
import { verifySchoolTeacherAccess } from '../utils/schoolScheduleApi';

type PendingLaunch = {
  path: string;
  teacherName: string;
  classTitle: string;
  subject: string;
  schedule: string;
  classItem: {
    id: string;
    code: string;
    name: string;
    subject: string;
    instructor: string;
    schedule: string;
    students: number;
    description: string;
    level: 'Intermediate';
    duration: string;
  };
};

const SchoolTeacherClassAccess = () => {
  const navigate = useNavigate();
  const params = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingLaunch, setPendingLaunch] = useState<PendingLaunch | null>(null);

  const sessionId = useMemo(() => String(params.sessionId || '').trim(), [params.sessionId]);
  const token = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams]);
  const codeFromLink = useMemo(() => String(searchParams.get('code') || '').trim(), [searchParams]);
  const accessKey = useMemo(() => `edamaa_teacher_access_${sessionId}`, [sessionId]);

  const handleVerify = async () => {
    if (!sessionId) {
      setNotice('This class link is missing a session id. Ask your school admin to regenerate it.');
      return;
    }
    if (!token) {
      setNotice('This class link is missing a secure token. Ask your school admin for a new link.');
      return;
    }
    if (!code.trim()) {
      setNotice('Please enter the teacher access code to continue.');
      return;
    }

    setIsSubmitting(true);
    setNotice(null);
    try {
      const payload = await verifySchoolTeacherAccess({
        sessionId,
        token,
        code: code.trim(),
      });

      const classItem = {
        id: payload.session.id,
        code: payload.launch.roomCode || payload.session.roomCode,
        name: payload.session.title,
        subject: payload.session.subject,
        instructor: payload.session.instructor,
        schedule: new Date(payload.session.startAt).toLocaleString(),
        students: payload.session.expectedStudents,
        description:
          payload.session.notes ||
          `Live class for ${payload.session.subject}. Audience: ${payload.session.audienceTag || 'General'}.`,
        level: 'Intermediate' as const,
        duration: `${payload.session.durationMinutes} mins`,
      };

      setPendingLaunch({
        path: payload.launch.liveClassPath,
        teacherName:
          payload.session.assignedTutorName ||
          payload.session.instructor ||
          'Teacher',
        classTitle: payload.session.title,
        subject: payload.session.subject,
        schedule: new Date(payload.session.startAt).toLocaleString(),
        classItem,
      });
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          accessKey,
          JSON.stringify({ verifiedAt: new Date().toISOString(), token })
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not verify this teacher access link.';
      setNotice(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!code && codeFromLink) {
      setCode(codeFromLink.replace(/\D+/g, '').slice(0, 6));
    }
  }, [code, codeFromLink]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          <FaArrowLeft size={10} />
          Back
        </button>

        <h1 className="text-xl font-bold text-[#3D08BA]">Teacher Class Access</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome school teacher. Sign in with your invited school email, then enter your secure class code to start this class.
        </p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Session ID</label>
            <input
              readOnly
              value={sessionId || 'Unavailable'}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Teacher access code</label>
            <div className="relative">
              <FaKey className="pointer-events-none absolute left-3 top-3 text-gray-400" size={12} />
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D+/g, '').slice(0, 6))}
                placeholder="Enter access code"
                className="w-full rounded-lg border border-gray-300 px-9 py-2 text-sm tracking-widest focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
              />
            </div>
          </div>
        </div>

        {notice && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {notice}
          </div>
        )}

        <button
          onClick={() => void handleVerify()}
          disabled={isSubmitting}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#3D08BA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2D0690] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FaSignInAlt size={12} />
          {isSubmitting ? 'Verifying...' : 'Verify and Enter Class'}
        </button>
      </div>

      {pendingLaunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#3D08BA]">
              Welcome, {pendingLaunch.teacherName}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You are about to host <span className="font-semibold">{pendingLaunch.classTitle}</span>.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {pendingLaunch.subject} • {pendingLaunch.schedule}
            </p>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600">
              <p className="font-semibold text-gray-700">Quick controls</p>
              <ul className="mt-2 space-y-1">
                <li>Accept or mute students when they raise questions.</li>
                <li>Bring a student on stage for answers or demos.</li>
                <li>End the class when the session is complete.</li>
              </ul>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => setPendingLaunch(null)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  navigate(pendingLaunch.path, {
                    state: { classItem: pendingLaunch.classItem },
                  })
                }
                className="flex-1 rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2D0690]"
              >
                Enter Live Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolTeacherClassAccess;
