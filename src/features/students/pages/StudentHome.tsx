import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  FireIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  PlayCircleIcon,
  Squares2X2Icon,
  UserCircleIcon,
  UserGroupIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import NewLogo from '../../../components/common/NewLogo';
import StudentBottomNavigation from '../../../components/layout/student-layout/StudentBottomNavigation';
import StudentCommunicationPanel, {
  type CommunicationMode,
  type IncomingCallInvite,
} from '../../../components/communication/StudentCommunicationPanel';
import { signOutEverywhere } from '../../../utils/signOut';
import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';
import { RECORDED_COURSES } from '../data/recordedCourses';
import { loadStudentIdentity, saveStudentIdentity } from '../utils/studentIdentity';

type OnlineTutor = {
  id: number;
  name: string;
  focus: string;
  responseTime: string;
  school: string;
  avatar: string;
};

type OnlineSchool = {
  id: number;
  name: string;
  city: string;
  activeClasses: number;
  activeTutors: number;
  theme: string;
};

type LiveClass = {
  id: number;
  title: string;
  tutor: string;
  school: string;
  learners: number;
  startsIn: string;
  category: string;
};

type StudentSchoolInvoiceStatus =
  | 'draft'
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'canceled';

type StudentSchoolInvoice = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  status: StudentSchoolInvoiceStatus;
  dueDate: string | null;
  schoolName?: string;
};

type StudentSchoolInvoicesResponse = {
  invoices: StudentSchoolInvoice[];
};

type PaySchoolInvoiceResponse = {
  mode: 'checkout' | 'settled';
  checkoutUrl?: string | null;
  message?: string;
};

type MissedCallReason = 'missed' | 'declined';

type MissedCallEntry = {
  id: string;
  callId: string;
  mode: 'audio' | 'video';
  senderLabel: string;
  at: string;
  reason: MissedCallReason;
};

const onlineTutors: OnlineTutor[] = [
  {
    id: 1,
    name: 'Dr. Adetokunbo Andrew',
    focus: 'Data Science Math',
    responseTime: '~2 mins',
    school: 'Edamaa Science Academy',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AndrewTutor',
  },
  {
    id: 2,
    name: 'Prof. Sobowale Olamide',
    focus: 'Quantum Physics',
    responseTime: '~4 mins',
    school: 'Lagos STEM Hub',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=OlamideTutor',
  },
  {
    id: 3,
    name: 'Dr. Ajayi Olubukunmi',
    focus: 'Literature & Writing',
    responseTime: '~3 mins',
    school: 'Royal Arts Institute',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BukunmiTutor',
  },
  {
    id: 4,
    name: 'Prof. Chinedu Nwosu',
    focus: 'Full Stack Web Dev',
    responseTime: '~1 min',
    school: 'BuildLab School',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChineduTutor',
  },
];

const onlineSchools: OnlineSchool[] = [
  {
    id: 1,
    name: 'Edamaa Science Academy',
    city: 'Lagos',
    activeClasses: 14,
    activeTutors: 28,
    theme: 'from-[#3D08BA] to-[#5b2ddb]',
  },
  {
    id: 2,
    name: 'Royal Arts Institute',
    city: 'Abuja',
    activeClasses: 9,
    activeTutors: 16,
    theme: 'from-[#F68C29] to-[#ffb361]',
  },
  {
    id: 3,
    name: 'Lagos STEM Hub',
    city: 'Ikeja',
    activeClasses: 18,
    activeTutors: 33,
    theme: 'from-[#1f6f78] to-[#34a0a4]',
  },
];

const liveClasses: LiveClass[] = [
  {
    id: 1,
    title: 'Calculus for Machine Learning',
    tutor: 'Dr. Adetokunbo Andrew',
    school: 'Edamaa Science Academy',
    learners: 122,
    startsIn: 'Live now',
    category: 'Mathematics',
  },
  {
    id: 2,
    title: 'React Architecture for Beginners',
    tutor: 'Prof. Chinedu Nwosu',
    school: 'BuildLab School',
    learners: 89,
    startsIn: 'Starts in 12 mins',
    category: 'Technology',
  },
  {
    id: 3,
    title: 'Poetry Breakdown Workshop',
    tutor: 'Dr. Ajayi Olubukunmi',
    school: 'Royal Arts Institute',
    learners: 64,
    startsIn: 'Starts in 18 mins',
    category: 'Literature',
  },
];

const quickFilters = ['All', 'Technology', 'Science', 'Arts', 'Social Studies', 'Exam Prep'];
const SIGNAL_CHANNEL = 'signal:student-communication';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const STUDENT_HOME_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const MISSED_CALL_STORAGE_PREFIX = 'edamaa:student:missed-calls:';
const MAX_MISSED_CALLS = 20;
const INCOMING_CALL_TIMEOUT_MS = 30_000;

const AVATAR_GRADIENTS: Array<[string, string]> = [
  ['#3D08BA', '#5f2ce0'],
  ['#F68C29', '#f9b26a'],
  ['#1f6f78', '#34a0a4'],
  ['#2f4858', '#4f6d7a'],
];

const buildFallbackAvatar = (fullName: string) => {
  const cleanedName = fullName.trim() || 'Tutor';
  const initials =
    cleanedName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'T';
  const hash = cleanedName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [startColor, endColor] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="48" fill="url(#avatarGradient)" />
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        fill="#ffffff"
        font-family="Arial, sans-serif"
        font-size="34"
        font-weight="700"
      >
        ${initials}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const isLocalhostHost = (host: string) => host === '127.0.0.1' || host === 'localhost';

const resolveStudentApiBaseCandidates = () => {
  const candidates = new Set<string>();
  candidates.add('/api');

  if (STUDENT_HOME_API_BASE_URL && STUDENT_HOME_API_BASE_URL !== '/api') {
    candidates.add(STUDENT_HOME_API_BASE_URL);
  }

  if (typeof window !== 'undefined') {
    const host = (window.location.hostname || '').trim();
    if (isLocalhostHost(host)) {
      candidates.add(`http://${host}:3001`);
    }
  }

  candidates.add('http://127.0.0.1:3001');
  candidates.add('http://localhost:3001');
  return Array.from(candidates).map((base) => base.replace(/\/+$/, ''));
};

const extractStudentApiError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Fallback to plain text below.
  }

  try {
    const payload = (await response.text()).replace(/\s+/g, ' ').trim();
    if (payload && !/^</.test(payload)) {
      return payload;
    }
  } catch {
    // Keep generic fallback.
  }

  return `Request failed with status ${response.status}`;
};

const StudentHome = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isCommunicationOpen, setIsCommunicationOpen] = useState(false);
  const [communicationMode, setCommunicationMode] = useState<CommunicationMode>('chat');
  const [pendingIncomingCall, setPendingIncomingCall] = useState<IncomingCallInvite | null>(null);
  const [incomingCallInvite, setIncomingCallInvite] = useState<IncomingCallInvite | null>(null);
  const [missedCalls, setMissedCalls] = useState<MissedCallEntry[]>([]);
  const [communicationNotice, setCommunicationNotice] = useState('');
  const [schoolInvoices, setSchoolInvoices] = useState<StudentSchoolInvoice[]>([]);
  const [isSchoolInvoicesLoading, setIsSchoolInvoicesLoading] = useState(false);
  const [schoolInvoicesError, setSchoolInvoicesError] = useState<string | null>(null);
  const [activeSchoolInvoiceId, setActiveSchoolInvoiceId] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const seenSignalIdsRef = useRef<Set<string>>(new Set());
  const seenCallIdsRef = useRef<Set<string>>(new Set());
  const incomingCallInviteRef = useRef<IncomingCallInvite | null>(null);
  const ignoredCallIdsRef = useRef<Set<string>>(new Set());
  const incomingCallTimeoutRef = useRef<number | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const ringtoneContextRef = useRef<AudioContext | null>(null);
  const studentIdentity = useMemo(() => loadStudentIdentity(), []);
  const missedCallStorageKey = useMemo(
    () => `${MISSED_CALL_STORAGE_PREFIX}${studentIdentity.id}`,
    [studentIdentity.id]
  );
  const missedCallsCount = missedCalls.length;
  const recentMissedCalls = useMemo(() => missedCalls.slice(0, 3), [missedCalls]);
  const outstandingSchoolInvoices = useMemo(
    () =>
      schoolInvoices.filter(
        (invoice) =>
          invoice.status === 'pending' ||
          invoice.status === 'overdue' ||
          invoice.status === 'partially_paid'
      ),
    [schoolInvoices]
  );

  const urgentSchoolInvoice = useMemo(() => {
    if (outstandingSchoolInvoices.length === 0) {
      return null;
    }

    const overdueInvoice = outstandingSchoolInvoices.find((invoice) => invoice.status === 'overdue');
    if (overdueInvoice) {
      return overdueInvoice;
    }

    return [...outstandingSchoolInvoices].sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })[0];
  }, [outstandingSchoolInvoices]);

  const recommendedCourses = useMemo(() => {
    const source = RECORDED_COURSES.filter((course) =>
      activeFilter === 'All' ? true : course.category.toLowerCase() === activeFilter.toLowerCase()
    );

    const searched = source.filter((course) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) {
        return true;
      }
      return (
        course.title.toLowerCase().includes(query) ||
        course.instructor.toLowerCase().includes(query) ||
        course.category.toLowerCase().includes(query)
      );
    });

    return searched.slice(0, 6);
  }, [searchQuery, activeFilter]);

  const onHomeClick = () => navigate('/student-home');
  const onCoursesClick = () => navigate('/mycourses');
  const onAssignmentsClick = () => navigate('/assignments');
  const onPerformanceClick = () => navigate('/performance');
  const handleSignOut = useCallback(async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      await signOutEverywhere();
      navigate('/signin', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, navigate]);

  const openSchoolFeesView = useCallback(() => {
    const invoiceQuery = urgentSchoolInvoice
      ? `&invoice=${encodeURIComponent(urgentSchoolInvoice.id)}`
      : '';
    navigate(`/payments?view=school-fees${invoiceQuery}`);
  }, [navigate, urgentSchoolInvoice]);

  const requestWithStudentAuth = useCallback(async (endpoint: string, init?: RequestInit) => {
    const token = loadPersistedSupabaseAccessToken();
    const localDevSession = loadPersistedLocalDevAuthSession();

    if (!token && !localDevSession?.email) {
      throw new Error('Please sign in to view your school invoices.');
    }

    const bases = resolveStudentApiBaseCandidates();
    let networkError: Error | null = null;

    const shouldTryNextBase = (response: Response, base: string) => {
      if (base.startsWith('/') && response.status === 500) {
        return true;
      }
      if ([502, 503, 504].includes(response.status)) {
        return true;
      }
      if (base.startsWith('/') && [404, 405].includes(response.status)) {
        return true;
      }
      return false;
    };

    for (let index = 0; index < bases.length; index += 1) {
      const base = bases[index];
      let response: Response;

      try {
        response = await fetch(`${base}${endpoint}`, {
          ...init,
          headers: {
            ...(init?.headers || {}),
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(localDevSession?.email ? { 'X-Dev-User-Email': localDevSession.email } : {}),
            ...(localDevSession?.defaultRole ? { 'X-Dev-User-Role': localDevSession.defaultRole } : {}),
          },
        });
      } catch (error) {
        networkError = error instanceof Error ? error : new Error('Network request failed');
        continue;
      }

      if (!response.ok) {
        if (shouldTryNextBase(response, base)) {
          continue;
        }
        throw new Error(await extractStudentApiError(response));
      }

      return response;
    }

    const fallbackMessage =
      networkError?.message && networkError.message.trim() ? networkError.message : 'Failed to fetch';
    throw new Error(
      `${fallbackMessage}. Could not reach backend API on ${bases.join(', ')}. Start the API with "bash scripts/api-up.sh", then retry.`
    );
  }, []);

  const loadSchoolInvoices = useCallback(async () => {
    const token = loadPersistedSupabaseAccessToken();
    const localDevSession = loadPersistedLocalDevAuthSession();
    if (!token && !localDevSession?.email) {
      setSchoolInvoices([]);
      setSchoolInvoicesError(null);
      return;
    }

    setIsSchoolInvoicesLoading(true);
    setSchoolInvoicesError(null);
    try {
      const response = await requestWithStudentAuth('/school-finance/invoices/me', {
        method: 'GET',
      });
      const payload = (await response.json()) as StudentSchoolInvoicesResponse;
      setSchoolInvoices(Array.isArray(payload.invoices) ? payload.invoices : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not load your school invoices right now.';
      setSchoolInvoicesError(message);
      setSchoolInvoices([]);
    } finally {
      setIsSchoolInvoicesLoading(false);
    }
  }, [requestWithStudentAuth]);

  const handlePaySchoolInvoiceFromHome = useCallback(
    async (invoiceId: string) => {
      if (activeSchoolInvoiceId) {
        return;
      }

      setActiveSchoolInvoiceId(invoiceId);
      try {
        const response = await requestWithStudentAuth(
          `/school-finance/invoices/${encodeURIComponent(invoiceId)}/pay`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          }
        );
        const payload = (await response.json()) as PaySchoolInvoiceResponse;
        if (payload.mode === 'checkout' && payload.checkoutUrl) {
          window.location.assign(payload.checkoutUrl);
          return;
        }

        if (payload.message) {
          setCommunicationNotice(payload.message);
        }
        await loadSchoolInvoices();
        navigate('/payments?view=school-fees');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not process school invoice payment.';
        setSchoolInvoicesError(message);
      } finally {
        setActiveSchoolInvoiceId('');
      }
    },
    [activeSchoolInvoiceId, loadSchoolInvoices, navigate, requestWithStudentAuth]
  );

  const sendRealtimeSignal = useCallback(
    async (event: string, payload: Record<string, unknown>) => {
      try {
        const response = await fetch(`${API_BASE_URL}/realtime/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: SIGNAL_CHANNEL,
            event,
            payload,
          }),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    []
  );

  const rememberIgnoredCallId = useCallback((callId: string) => {
    if (!callId) {
      return;
    }
    if (ignoredCallIdsRef.current.size > 200) {
      ignoredCallIdsRef.current.clear();
    }
    ignoredCallIdsRef.current.add(callId);
  }, []);

  const recordMissedCall = useCallback((invite: IncomingCallInvite, reason: MissedCallReason) => {
    const senderLabel =
      typeof invite.senderLabel === 'string' && invite.senderLabel.trim()
        ? invite.senderLabel.trim()
        : 'Tutor / School support';

    setMissedCalls((current) => {
      if (current.some((entry) => entry.callId === invite.callId)) {
        return current;
      }

      const nextEntry: MissedCallEntry = {
        id: `${invite.callId}-${Date.now()}`,
        callId: invite.callId,
        mode: invite.mode,
        senderLabel,
        at: new Date().toISOString(),
        reason,
      };
      return [nextEntry, ...current].slice(0, MAX_MISSED_CALLS);
    });
  }, []);

  const playRingtonePulse = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    if (!ringtoneContextRef.current) {
      ringtoneContextRef.current = new AudioContextCtor();
    }

    const context = ringtoneContextRef.current;
    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }

    const scheduleTone = (frequency: number, offset: number) => {
      const startAt = context.currentTime + offset;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.13, startAt + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.25);
    };

    scheduleTone(780, 0.01);
    scheduleTone(620, 0.33);
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current !== null) {
      window.clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  const startRingtone = useCallback(() => {
    if (typeof window === 'undefined' || ringtoneIntervalRef.current !== null) {
      return;
    }
    playRingtonePulse();
    ringtoneIntervalRef.current = window.setInterval(() => {
      playRingtonePulse();
    }, 1800);
  }, [playRingtonePulse]);

  const openCommunication = (mode: CommunicationMode) => {
    setCommunicationMode(mode);
    setIncomingCallInvite(null);
    setPendingIncomingCall(null);
    setIsCommunicationOpen(true);
  };

  const acceptIncomingCall = () => {
    if (!incomingCallInvite) {
      return;
    }

    rememberIgnoredCallId(incomingCallInvite.callId);
    setCommunicationMode(incomingCallInvite.mode);
    setPendingIncomingCall(incomingCallInvite);
    setIsCommunicationOpen(true);
    setIncomingCallInvite(null);
    setCommunicationNotice(`Connecting ${incomingCallInvite.mode} call...`);
  };

  const declineIncomingCall = useCallback(async () => {
    if (!incomingCallInvite) {
      return;
    }

    const invite = incomingCallInvite;
    rememberIgnoredCallId(invite.callId);
    recordMissedCall(invite, 'declined');
    setIncomingCallInvite(null);
    setPendingIncomingCall(null);
    setCommunicationNotice('Incoming call declined.');

    await sendRealtimeSignal('call.end', {
      eventId: `call-end-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      studentId: studentIdentity.id,
      role: 'student',
      senderLabel: 'Student',
      callId: invite.callId,
      mode: invite.mode,
      endedAt: new Date().toISOString(),
      reason: 'declined',
    });
  }, [incomingCallInvite, rememberIgnoredCallId, recordMissedCall, sendRealtimeSignal, studentIdentity.id]);

  useEffect(() => {
    // Keep a stable receiver profile so tutor/school and student panels route on the same student id.
    saveStudentIdentity(studentIdentity);
  }, [studentIdentity]);

  useEffect(() => {
    void loadSchoolInvoices();
  }, [loadSchoolInvoices]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(missedCallStorageKey);
      if (!rawValue) {
        setMissedCalls([]);
        return;
      }

      const parsed = JSON.parse(rawValue) as unknown;
      if (!Array.isArray(parsed)) {
        setMissedCalls([]);
        return;
      }

      const normalized: MissedCallEntry[] = parsed
        .map((entry) => (entry && typeof entry === 'object' ? (entry as Partial<MissedCallEntry>) : null))
        .filter((entry): entry is Partial<MissedCallEntry> => entry !== null)
        .filter((entry) => typeof entry.callId === 'string' && (entry.mode === 'audio' || entry.mode === 'video'))
        .map<MissedCallEntry>((entry) => {
          const reason: MissedCallReason = entry.reason === 'declined' ? 'declined' : 'missed';
          return {
            id: typeof entry.id === 'string' ? entry.id : `${entry.callId}-${Date.now()}`,
            callId: entry.callId as string,
            mode: entry.mode as 'audio' | 'video',
            senderLabel:
              typeof entry.senderLabel === 'string' && entry.senderLabel.trim()
                ? entry.senderLabel.trim()
                : 'Tutor / School support',
            at: typeof entry.at === 'string' ? entry.at : new Date().toISOString(),
            reason,
          };
        })
        .slice(0, MAX_MISSED_CALLS);

      setMissedCalls(normalized);
    } catch {
      setMissedCalls([]);
    }
  }, [missedCallStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(missedCallStorageKey, JSON.stringify(missedCalls));
    } catch {
      // Storage can fail in private browsing contexts.
    }
  }, [missedCalls, missedCallStorageKey]);

  useEffect(() => {
    incomingCallInviteRef.current = incomingCallInvite;
  }, [incomingCallInvite]);

  useEffect(() => {
    if (!communicationNotice) {
      return;
    }

    const timer = window.setTimeout(() => setCommunicationNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [communicationNotice]);

  useEffect(() => {
    if (incomingCallTimeoutRef.current !== null) {
      window.clearTimeout(incomingCallTimeoutRef.current);
      incomingCallTimeoutRef.current = null;
    }

    if (!incomingCallInvite || isCommunicationOpen) {
      return;
    }

    incomingCallTimeoutRef.current = window.setTimeout(() => {
      const activeInvite = incomingCallInviteRef.current;
      if (!activeInvite || ignoredCallIdsRef.current.has(activeInvite.callId)) {
        return;
      }

      rememberIgnoredCallId(activeInvite.callId);
      recordMissedCall(activeInvite, 'missed');
      setIncomingCallInvite((current) => (current?.callId === activeInvite.callId ? null : current));
      setPendingIncomingCall((current) => (current?.callId === activeInvite.callId ? null : current));
      setCommunicationNotice(`Missed ${activeInvite.mode} call from ${activeInvite.senderLabel || 'Tutor / School support'}.`);

      void sendRealtimeSignal('call.end', {
        eventId: `call-end-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        studentId: studentIdentity.id,
        role: 'student',
        senderLabel: 'Student',
        callId: activeInvite.callId,
        mode: activeInvite.mode,
        endedAt: new Date().toISOString(),
        reason: 'missed',
      });
    }, INCOMING_CALL_TIMEOUT_MS);

    return () => {
      if (incomingCallTimeoutRef.current !== null) {
        window.clearTimeout(incomingCallTimeoutRef.current);
        incomingCallTimeoutRef.current = null;
      }
    };
  }, [
    incomingCallInvite,
    isCommunicationOpen,
    recordMissedCall,
    rememberIgnoredCallId,
    sendRealtimeSignal,
    studentIdentity.id,
  ]);

  useEffect(() => {
    if (incomingCallInvite && !isCommunicationOpen) {
      startRingtone();
      return;
    }

    stopRingtone();
  }, [incomingCallInvite, isCommunicationOpen, startRingtone, stopRingtone]);

  useEffect(() => {
    return () => {
      stopRingtone();

      if (ringtoneContextRef.current) {
        void ringtoneContextRef.current.close().catch(() => undefined);
        ringtoneContextRef.current = null;
      }
    };
  }, [stopRingtone]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const source = new EventSource(
      `${API_BASE_URL}/realtime/stream?channel=${encodeURIComponent(SIGNAL_CHANNEL)}`
    );

    source.onmessage = (messageEvent) => {
      let envelope: Record<string, unknown> | null = null;
      try {
        const parsed = JSON.parse(messageEvent.data) as unknown;
        envelope = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
      } catch {
        envelope = null;
      }

      if (!envelope) {
        return;
      }

      const event = typeof envelope.event === 'string' ? envelope.event : '';
      const payload =
        envelope.payload && typeof envelope.payload === 'object'
          ? (envelope.payload as Record<string, unknown>)
          : null;

      if (!event || !payload) {
        return;
      }

      const payloadStudentId = Number(payload.studentId);
      if (!Number.isFinite(payloadStudentId) || payloadStudentId !== studentIdentity.id) {
        return;
      }

      const eventId = typeof payload.eventId === 'string' ? payload.eventId : '';
      if (eventId) {
        if (seenSignalIdsRef.current.has(eventId)) {
          return;
        }
        if (seenSignalIdsRef.current.size > 1000) {
          seenSignalIdsRef.current.clear();
        }
        seenSignalIdsRef.current.add(eventId);
      }

      if (event === 'call.start') {
        if (isCommunicationOpen) {
          return;
        }

        const senderRole = typeof payload.role === 'string' ? payload.role : '';
        if (senderRole === 'student') {
          return;
        }

        const mode = payload.mode === 'video' ? 'video' : 'audio';
        const callId = typeof payload.callId === 'string' ? payload.callId : '';
        const fromSessionId = typeof payload.sessionId === 'string' ? payload.sessionId : '';

        if (!callId || !fromSessionId) {
          return;
        }

        if (seenCallIdsRef.current.has(callId)) {
          return;
        }
        if (seenCallIdsRef.current.size > 200) {
          seenCallIdsRef.current.clear();
        }
        seenCallIdsRef.current.add(callId);

        const senderLabel =
          typeof payload.senderLabel === 'string' && payload.senderLabel.trim()
            ? payload.senderLabel.trim()
            : 'Tutor / School support';

        setIncomingCallInvite({
          callId,
          fromSessionId,
          mode,
          senderLabel,
          senderRole: senderRole === 'school' ? 'school' : 'tutor',
        });
        setCommunicationNotice(`Incoming ${mode} call from ${senderLabel}.`);
        return;
      }

      if (event === 'call.end') {
        const callId = typeof payload.callId === 'string' ? payload.callId : '';
        if (!callId) {
          return;
        }

        const activeInvite = incomingCallInviteRef.current;
        if (activeInvite?.callId === callId && !ignoredCallIdsRef.current.has(callId)) {
          rememberIgnoredCallId(callId);
          recordMissedCall(activeInvite, 'missed');
          setCommunicationNotice(`Missed ${activeInvite.mode} call from ${activeInvite.senderLabel || 'Tutor / School support'}.`);
        }

        setIncomingCallInvite((current) => (current?.callId === callId ? null : current));
        setPendingIncomingCall((current) => (current?.callId === callId ? null : current));
      }
    };

    return () => {
      source.close();
    };
  }, [isCommunicationOpen, recordMissedCall, rememberIgnoredCallId, studentIdentity.id]);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100">
      {/* Soft background accents keep the page premium without feeling noisy. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-[#3D08BA]/10 blur-3xl"></div>
        <div className="absolute top-56 -right-20 h-72 w-72 rounded-full bg-[#F68C29]/10 blur-3xl"></div>
      </div>

      <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <NewLogo logoWidth={30} logoHeight={30} textSize="text-base" gap="gap-2" centered={false} />

            <div className="flex items-center gap-2">
              <button
                onClick={() => openCommunication('audio')}
                className="rounded-full border border-blue-200 bg-blue-50 p-2 hover:bg-blue-100 transition-colors"
                aria-label="Open in-app call support"
                title="Call Tutor/School"
              >
                <PhoneIcon className="h-5 w-5 text-blue-700" />
              </button>
              <button
                onClick={() => openCommunication('chat')}
                className="relative rounded-full border border-emerald-200 bg-emerald-50 p-2 hover:bg-emerald-100 transition-colors"
                aria-label="Open in-app message support"
                title="Message Tutor/School"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-emerald-700" />
                {missedCallsCount > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {missedCallsCount > 9 ? '9+' : missedCallsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/student-dashboard')}
                className="rounded-full border border-[#3D08BA]/25 bg-[#3D08BA]/6 p-2 hover:bg-[#3D08BA]/10 transition-colors"
                aria-label="Open student dashboard"
                title="Student Dashboard"
              >
                <Squares2X2Icon className="h-5 w-5 text-[#3D08BA]" />
              </button>
              <button
                onClick={() => navigate('/notifications')}
                className="relative rounded-full border border-gray-200 bg-white p-2 hover:bg-gray-50 transition-colors"
                aria-label="Notifications"
              >
                <BellSolidIcon className="h-5 w-5 text-[#3D08BA]" />
                <span className="absolute -top-1 -right-1 rounded-full bg-[#F68C29] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  4
                </span>
              </button>
              <button
                onClick={openSchoolFeesView}
                className="relative rounded-full border border-gray-200 bg-white p-2 hover:bg-gray-50 transition-colors"
                aria-label="Open school fee alerts"
                title="School fee alerts"
              >
                <BanknotesIcon className="h-5 w-5 text-[#3D08BA]" />
                {outstandingSchoolInvoices.length > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${
                      urgentSchoolInvoice?.status === 'overdue'
                        ? 'bg-red-500'
                        : 'bg-[#F68C29]'
                    }`}
                  >
                    {outstandingSchoolInvoices.length > 9
                      ? '9+'
                      : outstandingSchoolInvoices.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/student-dashboard', { state: { openProfile: true } })}
                className="rounded-full border border-gray-200 bg-white p-2 hover:bg-gray-50 transition-colors"
                aria-label="Open my profile"
                title="My Profile"
              >
                <UserCircleIcon className="h-5 w-5 text-gray-700" />
              </button>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={`rounded-full border border-red-200 bg-red-50 p-2 transition-colors ${
                  isSigningOut ? 'cursor-not-allowed opacity-60' : 'hover:bg-red-100'
                }`}
                aria-label="Sign out"
                title={isSigningOut ? 'Signing out...' : 'Sign out'}
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {communicationNotice && (
          <div className="mb-4 rounded-xl border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-4 py-3 text-sm text-[#3D08BA]">
            {communicationNotice}
          </div>
        )}

        <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">School Fee Alerts</h2>
              <p className="mt-1 text-xs text-gray-600">
                Stay ahead of deadlines. Pay assigned school invoices from your home workspace.
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                outstandingSchoolInvoices.length > 0
                  ? 'bg-red-50 text-red-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {outstandingSchoolInvoices.length} outstanding
            </span>
          </div>

          {isSchoolInvoicesLoading && (
            <p className="mt-3 text-sm text-gray-600">Checking your assigned school invoices...</p>
          )}

          {!isSchoolInvoicesLoading && schoolInvoicesError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {schoolInvoicesError}
            </div>
          )}

          {!isSchoolInvoicesLoading && !schoolInvoicesError && urgentSchoolInvoice && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-[220px]">
                  <p className="text-sm font-semibold text-gray-900">{urgentSchoolInvoice.title}</p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {(urgentSchoolInvoice.schoolName || 'School')} • ₦
                    {urgentSchoolInvoice.amount.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {urgentSchoolInvoice.dueDate
                      ? `Due ${new Date(urgentSchoolInvoice.dueDate).toLocaleDateString()}`
                      : 'No due date'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    urgentSchoolInvoice.status === 'overdue'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-[#3D08BA]/10 text-[#3D08BA]'
                  }`}
                >
                  {urgentSchoolInvoice.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void handlePaySchoolInvoiceFromHome(urgentSchoolInvoice.id)}
                  disabled={activeSchoolInvoiceId === urgentSchoolInvoice.id}
                  className="rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2D0690] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activeSchoolInvoiceId === urgentSchoolInvoice.id ? 'Processing...' : 'Pay now'}
                </button>
                <button
                  onClick={() => navigate('/payments?view=school-fees')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Open payments
                </button>
                <button
                  onClick={openSchoolFeesView}
                  className="rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-2 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10"
                >
                  Open exact invoice
                </button>
              </div>
            </div>
          )}

          {!isSchoolInvoicesLoading && !schoolInvoicesError && !urgentSchoolInvoice && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              You are all caught up. No outstanding school invoices right now.
            </p>
          )}
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#2e0a91] via-[#3D08BA] to-[#5f2ce0] p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute -right-12 -top-10 h-44 w-44 rounded-full bg-white/10"></div>
          <div className="absolute -bottom-20 right-20 h-52 w-52 rounded-full bg-[#F68C29]/20"></div>

          <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] items-end">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <FireIcon className="h-3.5 w-3.5" />
                Personalized learning hub
              </p>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
                Learn faster with live insights, active tutors, and curated short lessons.
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/85">
                Your Edamaa home now highlights who is online, what classes are happening, and the best next course for your goals.
              </p>

              <div className="mt-5 relative max-w-xl">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/65" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tutors, schools, courses..."
                  className="w-full rounded-xl border border-white/20 bg-white/12 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Tutors Online</p>
                <p className="mt-1 text-2xl font-bold">{onlineTutors.length}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Schools Active</p>
                <p className="mt-1 text-2xl font-bold">{onlineSchools.length}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Live Classes</p>
                <p className="mt-1 text-2xl font-bold">{liveClasses.length}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-white/70">My Streak</p>
                <p className="mt-1 text-2xl font-bold">12d</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Tutor & School Communication</h2>
              <p className="mt-1 text-xs text-gray-600">
                Chat, voice call, and video call are fully in-app. Your receiver id is <span className="font-semibold">#{studentIdentity.id}</span>.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                  Missed calls: {missedCallsCount}
                </span>
                {missedCallsCount > 0 && (
                  <button
                    onClick={() => setMissedCalls([])}
                    className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Clear history
                  </button>
                )}
              </div>
              {recentMissedCalls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
                  {recentMissedCalls.map((entry) => (
                    <span key={entry.id} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                      {entry.mode === 'video' ? 'Video' : 'Audio'} • {entry.reason === 'declined' ? 'declined' : 'missed'} •{' '}
                      {new Date(entry.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openCommunication('chat')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                Message
              </button>
              <button
                onClick={() => openCommunication('audio')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                <PhoneIcon className="h-4 w-4" />
                Call
              </button>
              <button
                onClick={() => openCommunication('video')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2D0690]"
              >
                <VideoCameraIcon className="h-4 w-4" />
                Video
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Classes Going On</h2>
            <button
              onClick={() => navigate('/join-class')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              View Schedule
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {liveClasses.map((session) => (
              <article key={session.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                    {session.startsIn}
                  </span>
                  <span className="text-[11px] font-medium text-gray-500">{session.category}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">{session.title}</h3>
                <p className="mt-1 text-xs text-gray-600">
                  {session.tutor} • {session.school}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <UserGroupIcon className="h-4 w-4" />
                    {session.learners} learners
                  </span>
                  <button
                    onClick={() => navigate('/join-class')}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#3D08BA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2D0690]"
                  >
                    <VideoCameraIcon className="h-4 w-4" />
                    Join
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tutors Online</h2>
              <button
                onClick={() => navigate('/mycourses')}
                className="text-xs font-semibold text-[#3D08BA] hover:text-[#2D0690]"
              >
                Explore tutors
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {onlineTutors.map((tutor) => (
                <div key={tutor.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={tutor.avatar || buildFallbackAvatar(tutor.name)}
                        alt={tutor.name}
                        className="h-11 w-11 rounded-full border border-gray-200"
                        loading="lazy"
                        // Fallback keeps avatars visible if external avatar providers are unavailable.
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = buildFallbackAvatar(tutor.name);
                        }}
                      />
                      <span className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500"></span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{tutor.name}</p>
                      <p className="text-xs text-gray-600">{tutor.focus}</p>
                      <p className="text-[11px] text-gray-500">{tutor.school}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-500">Replies</p>
                    <p className="text-xs font-semibold text-green-600">{tutor.responseTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Schools Online</h2>
              <button
                onClick={() => navigate('/resources')}
                className="text-xs font-semibold text-[#3D08BA] hover:text-[#2D0690]"
              >
                View all schools
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {onlineSchools.map((school) => (
                <article key={school.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-lg bg-linear-to-r ${school.theme} flex items-center justify-center`}>
                        <BuildingOffice2Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{school.name}</p>
                        <p className="text-xs text-gray-500">{school.city}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      Online
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <p className="rounded-lg bg-gray-50 px-2 py-1 text-gray-600">
                      {school.activeClasses} active classes
                    </p>
                    <p className="rounded-lg bg-gray-50 px-2 py-1 text-gray-600">
                      {school.activeTutors} tutors online
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            {quickFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeFilter === filter
                    ? 'bg-[#3D08BA] text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedCourses.map((course) => (
              <article
                key={course.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all"
              >
                <div className="relative aspect-video overflow-hidden bg-gray-100">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent"></div>
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#3D08BA]">
                    {course.level}
                  </span>
                  <span className="absolute left-3 bottom-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {course.category}
                  </span>
                  <span className="absolute right-3 bottom-3 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    Certificate on completion
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{course.title}</h3>
                  <p className="mt-1 text-xs text-gray-600">{course.instructor}</p>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      {course.modules[0]?.lessons[0]?.durationMinutes || 6} min next lesson
                    </span>
                    <span>{course.completedLessons}/{course.totalLessons}</span>
                  </div>

                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                    <CheckBadgeIcon className="h-4 w-4" />
                    Finish all lessons and pass checkpoints to unlock your certificate.
                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-[#3D08BA] to-[#F68C29]"
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>

                  <button
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2D0690] transition-colors"
                  >
                    <PlayCircleIcon className="h-4 w-4" />
                    Continue Learning
                  </button>
                </div>
              </article>
            ))}
          </div>

          {recommendedCourses.length === 0 && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm font-medium text-gray-700">No courses match your search or filter yet.</p>
            </div>
          )}
        </section>
      </main>

      <StudentBottomNavigation
        activeTab="student-dashboard"
        onHomeClick={onHomeClick}
        onCoursesClick={onCoursesClick}
        onAssignmentsClick={onAssignmentsClick}
        onPerformanceClick={onPerformanceClick}
      />

      {incomingCallInvite && !isCommunicationOpen && (
        <div className="fixed bottom-24 right-4 z-50 w-[min(92vw,360px)] rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="relative mt-0.5">
              <span className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-blue-300/60"></span>
              <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <PhoneIcon className="h-5 w-5" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Incoming {incomingCallInvite.mode} call</p>
              <p className="mt-0.5 text-xs text-gray-600 truncate">From {incomingCallInvite.senderLabel || 'Tutor / School support'}</p>
              <p className="mt-1 text-[11px] text-gray-500">Student receiver #{studentIdentity.id}</p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    void declineIncomingCall();
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Decline
                </button>
                <button
                  onClick={acceptIncomingCall}
                  className="inline-flex items-center justify-center rounded-lg bg-[#3D08BA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2D0690]"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCommunicationOpen && (
        <StudentCommunicationPanel
          student={studentIdentity}
          role="student"
          initialMode={communicationMode}
          initialIncomingCall={pendingIncomingCall}
          onClose={() => {
            setIsCommunicationOpen(false);
            setPendingIncomingCall(null);
          }}
          onNotice={setCommunicationNotice}
        />
      )}
    </div>
  );
};

export default StudentHome;
