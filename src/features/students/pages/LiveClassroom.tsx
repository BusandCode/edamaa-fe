import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ClockIcon,
  ArrowLeftIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  GiftTopIcon,
  HandRaisedIcon,
  HeartIcon,
  LockClosedIcon,
  MicrophoneIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
  PhoneXMarkIcon,
  PresentationChartBarIcon,
  SparklesIcon,
  UserGroupIcon,
  UserMinusIcon,
  UserPlusIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { buildRtcConfiguration } from '../../../utils/rtc';
import { hasPersistedAuthSession } from '../../../utils/authSession';
import { loadSchoolBrandingNames, loadSchoolProfileImage } from '../../../utils/schoolBranding';
import {
  fetchSchoolScheduleLiveAttendance,
  recordSchoolScheduleAttendance,
  setSchoolScheduleAttendanceWindow,
  type SchoolScheduleAttendanceResponse,
} from '../../schools/utils/schoolScheduleApi';
import {
  createTutorAssignment,
  createSchoolAssignment,
  fetchTutorAssignments,
  fetchSchoolAssignments,
  type CreateSchoolAssignmentInput,
  fetchStudentAssignments,
  type SchoolAssignment,
  type StudentAssignment,
} from '../../schools/utils/assignmentsApi';
import {
  fetchTeachingSubscriptionState,
  type TeachingActor,
} from '../../subscriptions/utils/teachingSubscriptionApi';
import { loadStudentIdentity } from '../utils/studentIdentity';
import {
  fetchSchoolScheduleSessions,
  type SchoolScheduleSession,
} from '../../schools/utils/schoolScheduleApi';

type ClassLevel = 'Beginner' | 'Intermediate' | 'Advanced';
type RoomRole = 'teacher' | 'student';

type ClassDetails = {
  id: string;
  code: string;
  name: string;
  subject: string;
  instructor: string;
  instructorImage?: string;
  schedule: string;
  students: number;
  description: string;
  level: ClassLevel;
  duration: string;
};

type Participant = {
  id: string;
  name: string;
  role: RoomRole;
  avatar?: string;
  muted: boolean;
  cameraOn: boolean;
  handRaised: boolean;
  online: boolean;
  isSelf?: boolean;
};

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: RoomRole;
  text: string;
  sentAt: string;
  replyToMessageId?: string;
  replyToSenderName?: string;
  replyToText?: string;
};

type LiveQuestion = {
  id: string;
  studentId: string;
  studentName: string;
  text: string;
  status: 'open' | 'spotlight' | 'resolved';
  submittedAt: string;
  votes: number;
  voterIds: string[];
  lastActivityAt: string;
};

type GiftDefinition = {
  id: string;
  name: string;
  iconUrl: string;
  iconLabel: string;
  coinCost: number;
  accentClass: string;
  tier: 'standard' | 'advanced';
  unlockBadgeLevel: number;
  panelTab: 'gifts' | 'interactive' | 'exclusive';
};

type GiftRecipient = {
  id: string;
  name: string;
  targetType: 'teacher' | 'school';
};

type GiftEvent = {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  giftId: string;
  giftName: string;
  giftIconUrl: string;
  giftIconLabel: string;
  giftAccentClass: string;
  giftTier: 'standard' | 'advanced';
  unlockBadgeLevel: number;
  quantity: number;
  totalCoins: number;
  sentAt: string;
};

type GiftNotification = {
  id: string;
  title: string;
  subtitle: string;
  iconUrl: string;
  accentClass: string;
};

type ReactionBurst = {
  id: string;
  label: string;
  accentClass: string;
  lane: number;
};

type AdvancedGiftSpotlight = {
  id: string;
  senderName: string;
  recipientName: string;
  giftName: string;
  iconUrl: string;
  accentClass: string;
  quantity: number;
};

type CoinPack = {
  id: string;
  label: string;
  coins: number;
  bonusCoins: number;
  priceLabel: string;
};

type GifterBadge = {
  level: number;
  name: string;
  minTotalGiftedCoins: number;
};

type NoticeTone = 'info' | 'success' | 'warning' | 'error';

type NoticeMessage = {
  type: NoticeTone;
  text: string;
};

type FloatingGift = {
  id: string;
  label: string;
  accentClass: string;
  lane: number;
};

type LiveClassLocationState = {
  classItem?: ClassDetails;
};

type GiftPanelTab = 'gifts' | 'interactive' | 'exclusive';

type PendingStageInvite = {
  inviteId: string;
  studentId: string;
  studentName: string;
  hostClientId: string;
  status: 'pending' | 'accepted' | 'declined';
  sentAt: string;
};

type IncomingStageInvite = {
  inviteId: string;
  hostClientId: string;
  hostName: string;
  sentAt: string;
};

type LiveTaskKind = 'classwork' | 'assignment';

type LiveTaskPlan = {
  id: string;
  kind: LiveTaskKind;
  title: string;
  releaseAfterMinutes: number;
  durationMinutes?: number;
  content: string;
  checklist: string[];
};

type LiveTaskRuntime = LiveTaskPlan & {
  startAtMs: number;
  endAtMs?: number;
  remainingMs?: number;
};

type LiveLinkedAssignment = Pick<
  StudentAssignment | SchoolAssignment,
  | 'id'
  | 'title'
  | 'content'
  | 'checklist'
  | 'dueAt'
  | 'isReleased'
  | 'releaseMode'
  | 'linkedSessionStatus'
  | 'type'
  | 'sessionId'
>;

type LiveLinkedAssignmentDraft = {
  title: string;
  subject: string;
  department: string;
  classGroup: string;
  dueAt: string;
  points: number;
  description: string;
  content: string;
  checklistText: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');

const RTC_CONFIGURATION: RTCConfiguration = buildRtcConfiguration();

const formatLiveDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '--';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }
  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toDateTimeLocalValue = (value: string | Date | null | undefined) => {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const offset = parsed.getTimezoneOffset();
  return new Date(parsed.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

const buildLiveLinkedAssignmentDraft = (
  liveClass: ClassDetails,
  session: SchoolScheduleSession | null
): LiveLinkedAssignmentDraft => {
  const dueBase = session?.endAt ? new Date(session.endAt) : new Date();
  dueBase.setDate(dueBase.getDate() + 2);

  return {
    title: `${liveClass.subject} follow-up homework`,
    subject: session?.subject || liveClass.subject,
    department: session?.department || '',
    classGroup: session?.classGroup || '',
    dueAt: toDateTimeLocalValue(dueBase),
    points: 20,
    description: `Follow-up task for ${session?.title || liveClass.name}.`,
    content: '',
    checklistText: '',
  };
};

const AVATAR_GRADIENTS: Array<[string, string]> = [
  ['#3D08BA', '#5f2ce0'],
  ['#F68C29', '#f9b26a'],
  ['#1f6f78', '#34a0a4'],
  ['#2f4858', '#4f6d7a'],
  ['#9b1c1c', '#f97316'],
];

const GIFTING_STORAGE_KEY = 'edamaa_live_total_gifted_coins';
const GIFT_PIN_STORAGE_KEY = 'edamaa_live_pinned_gifts';
const GIFT_COIN_ICON_URL = '/gifts/coin.svg';
const HOT_QUESTION_COOLDOWN_MS = 5 * 60 * 1000;
const HOT_COOLDOWN_OPTIONS = [
  { label: '2 min', value: 2 * 60 * 1000 },
  { label: '5 min', value: 5 * 60 * 1000 },
  { label: '10 min', value: 10 * 60 * 1000 },
];
const HOT_COOLDOWN_STORAGE_KEY = 'edamaa_live_hot_question_cooldown_ms';
const AUTO_HOT_STORAGE_KEY = 'edamaa_live_auto_hot_enabled';
const REACTION_SET_STORAGE_KEY = 'edamaa_live_reaction_set';
const DEFAULT_REACTION_PALETTE = [
  { emoji: '👏', label: 'Clap', accentClass: 'from-amber-400 to-orange-500' },
  { emoji: '🔥', label: 'Fire', accentClass: 'from-red-500 to-orange-500' },
  { emoji: '🎯', label: 'On point', accentClass: 'from-emerald-400 to-cyan-500' },
  { emoji: '🙌', label: 'Celebrate', accentClass: 'from-fuchsia-400 to-pink-500' },
  { emoji: '🤔', label: 'Thinking', accentClass: 'from-slate-400 to-indigo-400' },
];
const REACTION_PALETTE_BY_SET: Record<string, typeof DEFAULT_REACTION_PALETTE> = {
  classic: DEFAULT_REACTION_PALETTE,
  energy: [
    { emoji: '⚡', label: 'Energy', accentClass: 'from-yellow-400 to-amber-500' },
    { emoji: '🔥', label: 'Fire', accentClass: 'from-red-500 to-orange-500' },
    { emoji: '💥', label: 'Boom', accentClass: 'from-rose-500 to-fuchsia-500' },
    { emoji: '👏', label: 'Clap', accentClass: 'from-amber-400 to-orange-500' },
    { emoji: '🚀', label: 'Lift', accentClass: 'from-sky-400 to-indigo-500' },
  ],
  focus: [
    { emoji: '🧠', label: 'Think', accentClass: 'from-indigo-400 to-violet-500' },
    { emoji: '✅', label: 'Clear', accentClass: 'from-emerald-400 to-lime-500' },
    { emoji: '📌', label: 'Pin', accentClass: 'from-rose-400 to-pink-500' },
    { emoji: '🎯', label: 'On point', accentClass: 'from-emerald-400 to-cyan-500' },
    { emoji: '🤝', label: 'Agree', accentClass: 'from-slate-400 to-blue-500' },
  ],
};

const COIN_PACKS: CoinPack[] = [
  { id: 'starter', label: 'Starter', coins: 120, bonusCoins: 0, priceLabel: '$1.99' },
  { id: 'study', label: 'Study Pack', coins: 700, bonusCoins: 60, priceLabel: '$9.99' },
  { id: 'supporter', label: 'Supporter', coins: 2500, bonusCoins: 300, priceLabel: '$29.99' },
  { id: 'champion', label: 'Champion', coins: 6000, bonusCoins: 900, priceLabel: '$69.99' },
];

const GIFTER_BADGES: GifterBadge[] = [
  { level: 1, name: 'Starter Gifter', minTotalGiftedCoins: 0 },
  { level: 2, name: 'Supporter Badge', minTotalGiftedCoins: 1200 },
  { level: 3, name: 'Elite Gifter', minTotalGiftedCoins: 5000 },
  { level: 4, name: 'Legend Gifter', minTotalGiftedCoins: 15000 },
  { level: 5, name: 'Campus Royalty', minTotalGiftedCoins: 40000 },
];

const giftAssetUrl = (giftId: string) => `/gifts/${giftId}.svg`;

const GIFT_CATALOG: GiftDefinition[] = [
  { id: 'ball-point-pen', name: 'Ball point pen', iconLabel: 'PEN', iconUrl: giftAssetUrl('ball-point-pen'), coinCost: 1, accentClass: 'from-teal-500 to-cyan-500', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'gifts' },
  { id: 'pack-ball-point-pen', name: 'Pack of Ball point pen', iconLabel: 'PACK', iconUrl: giftAssetUrl('pack-ball-point-pen'), coinCost: 30, accentClass: 'from-blue-500 to-indigo-600', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'interactive' },
  { id: 'rose', name: 'Rose', iconLabel: 'ROSE', iconUrl: giftAssetUrl('rose'), coinCost: 1, accentClass: 'from-rose-500 to-pink-500', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'gifts' },
  { id: 'rosa', name: 'Rosa', iconLabel: 'ROSA', iconUrl: giftAssetUrl('rosa'), coinCost: 30, accentClass: 'from-pink-500 to-orange-500', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'interactive' },
  { id: 'roses', name: 'Roses', iconLabel: 'ROSE', iconUrl: giftAssetUrl('roses'), coinCost: 10, accentClass: 'from-fuchsia-500 to-rose-500', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'gifts' },
  { id: 'board', name: 'Board', iconLabel: 'BOARD', iconUrl: giftAssetUrl('board'), coinCost: 500, accentClass: 'from-blue-600 to-indigo-700', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'interactive' },
  { id: 'marker', name: 'Marker', iconLabel: 'MARK', iconUrl: giftAssetUrl('marker'), coinCost: 99, accentClass: 'from-emerald-500 to-lime-500', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'interactive' },
  { id: 'glucose', name: 'Glucose', iconLabel: 'GLU', iconUrl: giftAssetUrl('glucose'), coinCost: 99, accentClass: 'from-amber-500 to-orange-600', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'interactive' },
  { id: 'cheese', name: 'Cheese', iconLabel: 'CHS', iconUrl: giftAssetUrl('cheese'), coinCost: 5, accentClass: 'from-yellow-400 to-amber-500', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'gifts' },
  { id: 'blow-gum', name: 'Blow Gum', iconLabel: 'GUM', iconUrl: giftAssetUrl('blow-gum'), coinCost: 5, accentClass: 'from-violet-500 to-pink-500', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'gifts' },
  { id: 'burger', name: 'Burger', iconLabel: 'BURG', iconUrl: giftAssetUrl('burger'), coinCost: 99, accentClass: 'from-orange-500 to-red-500', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'interactive' },
  { id: 'milky-doughnut', name: 'Milky doughnut', iconLabel: 'MILK', iconUrl: giftAssetUrl('milky-doughnut'), coinCost: 30, accentClass: 'from-pink-300 to-fuchsia-500', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'interactive' },
  { id: 'doughnut', name: 'Doughnut', iconLabel: 'DGH', iconUrl: giftAssetUrl('doughnut'), coinCost: 20, accentClass: 'from-rose-400 to-orange-400', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'gifts' },
  { id: 'bottle-water', name: 'Bottle water', iconLabel: 'H2O', iconUrl: giftAssetUrl('bottle-water'), coinCost: 50, accentClass: 'from-sky-400 to-cyan-600', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'gifts' },
  { id: 'stream-water', name: 'Stream water', iconLabel: 'STRM', iconUrl: giftAssetUrl('stream-water'), coinCost: 800, accentClass: 'from-cyan-500 to-teal-700', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'interactive' },
  { id: 'well-water', name: 'Well water', iconLabel: 'WELL', iconUrl: giftAssetUrl('well-water'), coinCost: 70, accentClass: 'from-blue-500 to-cyan-500', tier: 'standard', unlockBadgeLevel: 1, panelTab: 'interactive' },
  { id: 'fountain-pen', name: 'Fountain Pen', iconLabel: 'FPN', iconUrl: giftAssetUrl('fountain-pen'), coinCost: 1000, accentClass: 'from-violet-600 to-indigo-700', tier: 'advanced', unlockBadgeLevel: 2, panelTab: 'exclusive' },
  { id: 'eagle-eye', name: 'Eagle eye', iconLabel: 'EYE', iconUrl: giftAssetUrl('eagle-eye'), coinCost: 500, accentClass: 'from-purple-600 to-pink-600', tier: 'advanced', unlockBadgeLevel: 2, panelTab: 'exclusive' },
  { id: 'small-eagle', name: 'Small Eagle', iconLabel: 'SEAG', iconUrl: giftAssetUrl('small-eagle'), coinCost: 2000, accentClass: 'from-orange-700 to-amber-500', tier: 'advanced', unlockBadgeLevel: 3, panelTab: 'exclusive' },
  { id: 'big-eagle', name: 'Big eagle', iconLabel: 'BEAG', iconUrl: giftAssetUrl('big-eagle'), coinCost: 4000, accentClass: 'from-red-700 to-orange-500', tier: 'advanced', unlockBadgeLevel: 4, panelTab: 'exclusive' },
  { id: 'classroom', name: 'Classroom', iconLabel: 'ROOM', iconUrl: giftAssetUrl('classroom'), coinCost: 40000, accentClass: 'from-slate-800 to-indigo-700', tier: 'advanced', unlockBadgeLevel: 5, panelTab: 'exclusive' },
];

const DEFAULT_CLASS: ClassDetails = {
  id: 'demo-live',
  code: 'LIVE101',
  name: 'Interactive Live Masterclass',
  subject: 'General Studies',
  instructor: 'Edamaa Tutor',
  instructorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EdamaaTutor',
  schedule: 'Live now',
  students: 120,
  description: 'High-engagement livestream class with interactive Q&A and collaborative learning.',
  level: 'Intermediate',
  duration: '90 mins',
};

const LIVE_TASK_PLAN: LiveTaskPlan[] = [
  {
    id: 'live-classwork-checkpoint-1',
    kind: 'classwork',
    title: 'Live Classwork: Lesson Checkpoint',
    releaseAfterMinutes: 8,
    durationMinutes: 20,
    content:
      'Answer the checkpoint questions based on this lecture. Submit during class time to get your instant score.',
    checklist: [
      'Open classwork before timer ends.',
      'Answer every question.',
      'Submit once to see score immediately.',
    ],
  },
  {
    id: 'live-assignment-followup-1',
    kind: 'assignment',
    title: 'Post-Class Assignment: Key Lesson Reflection',
    releaseAfterMinutes: 0,
    content:
      'Summarize what you learned in this class and submit practical examples that show your understanding.',
    checklist: [
      'Write a short structured reflection.',
      'Include at least 2 key ideas from the lecture.',
      'Upload your file or add a submission link.',
    ],
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatClockTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const formatCountdown = (remainingMs: number) => {
  if (remainingMs <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const buildFallbackAvatar = (fullName: string) => {
  const name = fullName.trim() || 'Student';
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'S';

  const hash = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
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

const normalizeClass = (classItem: ClassDetails | undefined, classId: string | undefined): ClassDetails => {
  if (classItem) {
    return classItem;
  }

  if (classId) {
    return {
      ...DEFAULT_CLASS,
      id: classId,
      code: classId.toUpperCase(),
      name: `Live Session ${classId.toUpperCase()}`,
    };
  }

  return DEFAULT_CLASS;
};

const getBadgeForTotalGiftedCoins = (totalGiftedCoins: number) => {
  return [...GIFTER_BADGES]
    .reverse()
    .find((badge) => totalGiftedCoins >= badge.minTotalGiftedCoins) || GIFTER_BADGES[0];
};

const sanitizeCardNumber = (value: string) => value.replace(/[^\d]/g, '').slice(0, 16);
const sanitizeExpiry = (value: string) => value.replace(/[^\d/]/g, '').slice(0, 5);
const sanitizeCvv = (value: string) => value.replace(/[^\d]/g, '').slice(0, 4);

const LiveClassroom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classId } = useParams();

  const state = location.state as LiveClassLocationState | null;
  const classFromState = state?.classItem;
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const roomRole: RoomRole = searchParams.get('role') === 'teacher' ? 'teacher' : 'student';
  const isTeacher = roomRole === 'teacher';
  const teacherActor: TeachingActor = searchParams.get('actor') === 'school' ? 'school' : 'tutor';
  const giftingEnabled = teacherActor !== 'school';

  const liveClass = useMemo(() => normalizeClass(classFromState, classId), [classFromState, classId]);
  const studentIdentity = useMemo(() => loadStudentIdentity(), []);
  const schoolBranding = useMemo(() => {
    if (teacherActor !== 'school') {
      return null;
    }

    const { schoolName } = loadSchoolBrandingNames();
    const logoDataUrl = loadSchoolProfileImage();
    const resolvedSchoolName = schoolName || 'School';
    const initials =
      resolvedSchoolName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'SC';

    return {
      schoolName: resolvedSchoolName,
      logoDataUrl: /^data:image\//.test(logoDataUrl) ? logoDataUrl : '',
      initials,
    };
  }, [teacherActor]);
  const teacherId = useMemo(() => `teacher-${liveClass.id}`, [liveClass.id]);
  const schoolSupportId = useMemo(() => `school-${liveClass.id}`, [liveClass.id]);
  const schoolSupportName = useMemo(() => `${liveClass.subject} School Support`, [liveClass.subject]);
  const channelName = useMemo(() => `live-class:${liveClass.id}`, [liveClass.id]);
  const hasTeacherAuthSession = useMemo(() => hasPersistedAuthSession(), []);
  const canManageLinkedAssignments = isTeacher && hasTeacherAuthSession && Boolean(liveClass.id);

  const clientIdRef = useRef(`client-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
  const eventSourceRef = useRef<EventSource | null>(null);

  const stageLocalVideoRef = useRef<HTMLVideoElement | null>(null);
  const stageRemoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const knownPeerClientsRef = useRef<Map<string, { participantId: string; role: RoomRole }>>(new Map());
  const giftComboTimerRef = useRef<number | null>(null);
  const pendingGiftComboRef = useRef<{ giftId: string; recipientId: string; quantity: number } | null>(null);
  const lastHotQuestionRef = useRef<{ studentId: string; atMs: number } | null>(null);
  const sessionStartMsRef = useRef<number>(Date.now());
  const announcedClassworkIdsRef = useRef<Set<string>>(new Set());
  const latestPresenceRef = useRef({
    participant: null as Participant | null,
    role: roomRole as RoomRole,
    muted: !isTeacher,
    cameraOn: isTeacher,
    handRaised: false,
  });

  const selfParticipant = useMemo<Participant>(() => {
    const storedStudentName =
      typeof window === 'undefined' ? '' : (window.localStorage.getItem('edamaa_student_display_name') || '').trim();
    const fallbackTeacherName = searchParams.get('host')?.trim() || liveClass.instructor || 'Tutor Host';

    if (isTeacher) {
      return {
        id: teacherId,
        name: fallbackTeacherName,
        role: 'teacher',
        avatar: liveClass.instructorImage,
        muted: false,
        cameraOn: true,
        handRaised: false,
        online: true,
        isSelf: true,
      };
    }

    return {
      id: `student-self-${clientIdRef.current}`,
      name: storedStudentName || 'You',
      role: 'student',
      muted: true,
      cameraOn: false,
      handRaised: false,
      online: true,
      isSelf: true,
    };
  }, [isTeacher, liveClass.instructor, liveClass.instructorImage, searchParams, teacherId]);

  const attendanceParticipantId = useMemo(() => `student-${studentIdentity.id}`, [studentIdentity.id]);
  const attendanceParticipantName = useMemo(
    () => studentIdentity.name || selfParticipant.name,
    [selfParticipant.name, studentIdentity.name]
  );

  const teacherPlaceholder = useMemo<Participant>(
    () => ({
      id: teacherId,
      name: liveClass.instructor,
      role: 'teacher',
      avatar: liveClass.instructorImage,
      muted: false,
      cameraOn: true,
      handRaised: false,
      online: true,
      isSelf: isTeacher,
    }),
    [isTeacher, liveClass.instructor, liveClass.instructorImage, teacherId]
  );

  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (isTeacher) {
      return [{ ...selfParticipant }];
    }

    return [teacherPlaceholder, selfParticipant];
  });

  const [remoteTeacherStream, setRemoteTeacherStream] = useState<MediaStream | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: `welcome-${liveClass.id}`,
      senderId: teacherId,
      senderName: liveClass.instructor,
      senderRole: 'teacher',
      text: `Welcome to ${liveClass.name}. Keep your mic muted unless called on.`,
      sentAt: new Date().toISOString(),
    },
  ]);

  const [giftFeed, setGiftFeed] = useState<GiftEvent[]>([]);
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<ReactionBurst[]>([]);
  const [giftNotifications, setGiftNotifications] = useState<GiftNotification[]>([]);
  const [advancedGiftSpotlight, setAdvancedGiftSpotlight] = useState<AdvancedGiftSpotlight | null>(null);

  const [likesCount, setLikesCount] = useState(0);
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'live' | 'ended'>('connecting');
  const [notice, setNoticeState] = useState<NoticeMessage | null>({
    type: 'info',
    text: 'Connecting to live classroom...',
  });
  const [schoolAttendanceState, setSchoolAttendanceState] = useState<SchoolScheduleAttendanceResponse | null>(null);
  const [isSchoolAttendanceLoading, setIsSchoolAttendanceLoading] = useState(false);
  const [attendanceActionState, setAttendanceActionState] = useState<'open' | 'close' | 'check_in' | null>(null);
  const isSchoolAttendanceClass = teacherActor === 'school' && Boolean(liveClass.id);
  const [linkedAssignmentSession, setLinkedAssignmentSession] = useState<SchoolScheduleSession | null>(null);
  const [isLinkedAssignmentSessionLoading, setIsLinkedAssignmentSessionLoading] = useState(false);
  const [isLinkedAssignmentComposerOpen, setIsLinkedAssignmentComposerOpen] = useState(false);
  const [isLinkedAssignmentSaving, setIsLinkedAssignmentSaving] = useState(false);
  const [linkedAssignmentDraft, setLinkedAssignmentDraft] = useState<LiveLinkedAssignmentDraft>(() =>
    buildLiveLinkedAssignmentDraft(liveClass, null)
  );

  useEffect(() => {
    if (isTeacher || !liveClass.id) {
      return;
    }

    const attendanceBase = {
      sessionId: liveClass.id,
      participantId: attendanceParticipantId,
      participantName: attendanceParticipantName,
    };

    void recordSchoolScheduleAttendance({
      ...attendanceBase,
      action: 'join',
    })
      .then((payload) => {
        if (payload.attendance) {
          setSchoolAttendanceState(payload.attendance);
        }
      })
      .catch(() => {
        // Ignore attendance sync failures in local/dev flows that are not tied to school schedule.
      });

    return () => {
      void recordSchoolScheduleAttendance({
        ...attendanceBase,
        action: 'leave',
      }).catch(() => {
        // Ignore attendance sync failures during teardown.
      });
    };
  }, [attendanceParticipantId, attendanceParticipantName, isTeacher, liveClass.id]);

  useEffect(() => {
    if (!canManageLinkedAssignments) {
      setLinkedAssignmentSession(null);
      setIsLinkedAssignmentSessionLoading(false);
      return;
    }

    let cancelled = false;
    const loadCurrentScheduleSession = async () => {
      setIsLinkedAssignmentSessionLoading(true);
      try {
        const payload = await fetchSchoolScheduleSessions({ status: 'all' });
        if (!cancelled) {
          setLinkedAssignmentSession(
            payload.sessions.find((session) => session.id === liveClass.id) || null
          );
        }
      } catch {
        if (!cancelled) {
          setLinkedAssignmentSession(null);
        }
      } finally {
        if (!cancelled) {
          setIsLinkedAssignmentSessionLoading(false);
        }
      }
    };

    void loadCurrentScheduleSession();

    return () => {
      cancelled = true;
    };
  }, [canManageLinkedAssignments, liveClass.id]);
  const [isTeacherSubscriptionChecking, setIsTeacherSubscriptionChecking] = useState(isTeacher);
  const [isTeacherSubscriptionLocked, setIsTeacherSubscriptionLocked] = useState(false);
  const [teacherSubscriptionLockReason, setTeacherSubscriptionLockReason] = useState('');
  const [liveNowMs, setLiveNowMs] = useState(() => Date.now());
  const [activeClassworkPromptId, setActiveClassworkPromptId] = useState<string | null>(null);
  const [showTeacherWelcome, setShowTeacherWelcome] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [mutedChatParticipantIds, setMutedChatParticipantIds] = useState<string[]>([]);
  const [chatReplyTarget, setChatReplyTarget] = useState<{
    id: string;
    senderName: string;
    text: string;
  } | null>(null);
  const [onStageParticipantIds, setOnStageParticipantIds] = useState<string[]>([]);
  const [pendingStageInvites, setPendingStageInvites] = useState<PendingStageInvite[]>([]);
  const [incomingStageInvite, setIncomingStageInvite] = useState<IncomingStageInvite | null>(null);
  const [questionDraft, setQuestionDraft] = useState('');
  const [questionQueue, setQuestionQueue] = useState<LiveQuestion[]>([]);
  const [spotlightQuestion, setSpotlightQuestion] = useState<LiveQuestion | null>(null);
  const [hotQuestionId, setHotQuestionId] = useState<string | null>(null);
  const [hotQuestionEndsAtMs, setHotQuestionEndsAtMs] = useState<number | null>(null);
  const classAutoHotKey = `${AUTO_HOT_STORAGE_KEY}:${liveClass.id}`;
  const classReactionSetKey = `${REACTION_SET_STORAGE_KEY}:${liveClass.id}`;
  const classCooldownKey = `${HOT_COOLDOWN_STORAGE_KEY}:${liveClass.id}`;
  const [autoHotEnabled, setAutoHotEnabled] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const scoped = window.localStorage.getItem(classAutoHotKey);
    if (scoped !== null) {
      return scoped === 'true';
    }
    return window.localStorage.getItem(AUTO_HOT_STORAGE_KEY) === 'true';
  });
  const [hotCooldownMs, setHotCooldownMs] = useState(() => {
    if (typeof window === 'undefined') {
      return HOT_QUESTION_COOLDOWN_MS;
    }
    const scoped = Number(window.localStorage.getItem(classCooldownKey));
    if (HOT_COOLDOWN_OPTIONS.some((option) => option.value === scoped)) {
      return scoped;
    }
    const stored = Number(window.localStorage.getItem(HOT_COOLDOWN_STORAGE_KEY));
    return HOT_COOLDOWN_OPTIONS.some((option) => option.value === stored) ? stored : HOT_QUESTION_COOLDOWN_MS;
  });
  const [coinBalance, setCoinBalance] = useState(2500);
  const [totalGiftedCoins, setTotalGiftedCoins] = useState(() => {
    if (typeof window === 'undefined') {
      return 0;
    }

    const stored = Number(window.localStorage.getItem(GIFTING_STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0;
  });
  const [selectedGiftId, setSelectedGiftId] = useState(GIFT_CATALOG[0].id);
  const [selectedRecipientId, setSelectedRecipientId] = useState(teacherId);
  const [giftPanelTab, setGiftPanelTab] = useState<GiftPanelTab>('gifts');
  const [pinnedGiftIds, setPinnedGiftIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const parsed = JSON.parse(window.localStorage.getItem(GIFT_PIN_STORAGE_KEY) || '[]');
      return Array.isArray(parsed)
        ? parsed.filter((giftId): giftId is string => typeof giftId === 'string').slice(0, 8)
        : [];
    } catch {
      return [];
    }
  });
  const [giftComboCount, setGiftComboCount] = useState(0);
  const [giftComboGiftId, setGiftComboGiftId] = useState<string | null>(null);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [selectedCoinPackId, setSelectedCoinPackId] = useState(COIN_PACKS[1].id);
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessingRecharge, setIsProcessingRecharge] = useState(false);
  const [reactionSetKey, setReactionSetKey] = useState(() => {
    if (typeof window === 'undefined') {
      return 'classic';
    }
    const scoped = window.localStorage.getItem(classReactionSetKey);
    if (scoped && REACTION_PALETTE_BY_SET[scoped]) {
      return scoped;
    }
    const stored = window.localStorage.getItem(REACTION_SET_STORAGE_KEY);
    return stored && REACTION_PALETTE_BY_SET[stored] ? stored : 'classic';
  });

  const reactionPalette = useMemo(
    () => REACTION_PALETTE_BY_SET[reactionSetKey] || DEFAULT_REACTION_PALETTE,
    [reactionSetKey]
  );

  const [micOn, setMicOn] = useState(isTeacher);
  const [cameraOn, setCameraOn] = useState(isTeacher);
  const [handRaised, setHandRaised] = useState(false);
  const [screenShared, setScreenShared] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [settingsToastVisible, setSettingsToastVisible] = useState(false);

  const pushNotice = useCallback((text: string, type: NoticeTone = 'info') => {
    setNoticeState({ type, text });
  }, []);

  const clearNotice = useCallback(() => {
    setNoticeState(null);
  }, []);

  const refreshSchoolAttendanceState = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!isSchoolAttendanceClass) {
        return;
      }

      if (!options?.silent) {
        setIsSchoolAttendanceLoading(true);
      }

      try {
        const payload = await fetchSchoolScheduleLiveAttendance(liveClass.id);
        setSchoolAttendanceState(payload);
      } catch {
        // Ignore attendance status fetch failures in flows not tied to school schedule.
      } finally {
        if (!options?.silent) {
          setIsSchoolAttendanceLoading(false);
        }
      }
    },
    [isSchoolAttendanceClass, liveClass.id]
  );

  const handleAttendanceWindowAction = useCallback(
    async (action: 'open' | 'close') => {
      if (!isTeacher || !isSchoolAttendanceClass) {
        return;
      }

      setAttendanceActionState(action);
      try {
        const payload = await setSchoolScheduleAttendanceWindow({
          sessionId: liveClass.id,
          action,
        });
        setSchoolAttendanceState(payload.attendance);
        pushNotice(payload.message, 'success');
      } catch (error) {
        pushNotice(
          error instanceof Error ? error.message : 'Could not update attendance right now.',
          'error'
        );
      } finally {
        setAttendanceActionState(null);
      }
    },
    [isSchoolAttendanceClass, isTeacher, liveClass.id, pushNotice]
  );

  const handleStudentAttendanceCheckIn = useCallback(async () => {
    if (isTeacher || !isSchoolAttendanceClass) {
      return;
    }

    setAttendanceActionState('check_in');
    try {
      const payload = await recordSchoolScheduleAttendance({
        sessionId: liveClass.id,
        action: 'check_in',
        participantId: attendanceParticipantId,
        participantName: attendanceParticipantName,
      });
      if (payload.attendance) {
        setSchoolAttendanceState(payload.attendance);
      }
      pushNotice('Attendance recorded for this class.', 'success');
    } catch (error) {
      pushNotice(
        error instanceof Error ? error.message : 'Could not record attendance right now.',
        'error'
      );
    } finally {
      setAttendanceActionState(null);
    }
  }, [
    attendanceParticipantId,
    attendanceParticipantName,
    isSchoolAttendanceClass,
    isTeacher,
    liveClass.id,
    pushNotice,
  ]);

  const activeParticipants = useMemo(
    () => participants.filter((participant) => participant.online),
    [participants]
  );

  const viewerCount = activeParticipants.length;

  useEffect(() => {
    if (!isSchoolAttendanceClass) {
      return;
    }

    void refreshSchoolAttendanceState();
    const interval = window.setInterval(() => {
      void refreshSchoolAttendanceState({ silent: true });
    }, 12000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isSchoolAttendanceClass, refreshSchoolAttendanceState]);

  const selfAttendanceRecord = useMemo(() => {
    if (!schoolAttendanceState) {
      return null;
    }

    return (
      schoolAttendanceState.records.find((record) => record.participantId === attendanceParticipantId) ||
      schoolAttendanceState.records.find(
        (record) =>
          record.participantName.trim().toLowerCase() ===
          attendanceParticipantName.trim().toLowerCase()
      ) ||
      null
    );
  }, [attendanceParticipantId, attendanceParticipantName, schoolAttendanceState]);

  const isAttendanceWindowOpen = schoolAttendanceState?.window.isOpen === true;
  const hasAttendanceCheckIn = Boolean(selfAttendanceRecord?.checkedInAt);
  const isLateAttendance = selfAttendanceRecord?.status === 'late';
  const shouldShowStudentAttendanceCard =
    isSchoolAttendanceClass &&
    !isTeacher &&
    (isAttendanceWindowOpen || hasAttendanceCheckIn || selfAttendanceRecord?.status === 'pending');
  const shouldShowTeacherAttendanceCard = isSchoolAttendanceClass && isTeacher;

  const currentBadge = useMemo(() => getBadgeForTotalGiftedCoins(totalGiftedCoins), [totalGiftedCoins]);
  const nextBadge = useMemo(
    () => GIFTER_BADGES.find((badge) => badge.level === currentBadge.level + 1) || null,
    [currentBadge.level]
  );
  const rewardProgressToNextBadge = useMemo(() => {
    if (!nextBadge) {
      return 1;
    }

    const span = Math.max(1, nextBadge.minTotalGiftedCoins - currentBadge.minTotalGiftedCoins);
    const progressed = totalGiftedCoins - currentBadge.minTotalGiftedCoins;
    return clamp(progressed / span, 0, 1);
  }, [currentBadge.minTotalGiftedCoins, nextBadge, totalGiftedCoins]);

  const recipientOptions = useMemo<GiftRecipient[]>(
    () => [
      { id: teacherId, name: liveClass.instructor, targetType: 'teacher' },
      { id: schoolSupportId, name: schoolSupportName, targetType: 'school' },
    ],
    [teacherId, liveClass.instructor, schoolSupportId, schoolSupportName]
  );

  const selectedCoinPack = useMemo(
    () => COIN_PACKS.find((pack) => pack.id === selectedCoinPackId) || COIN_PACKS[0],
    [selectedCoinPackId]
  );
  const visibleGifts = useMemo(() => {
    const tabScopedGifts = GIFT_CATALOG.filter((gift) => {
      if (giftPanelTab === 'exclusive') {
        return gift.tier === 'advanced';
      }

      if (giftPanelTab === 'interactive') {
        return gift.panelTab === 'interactive';
      }

      return gift.tier === 'standard';
    });

    const pinnedSet = new Set(pinnedGiftIds);
    return [...tabScopedGifts].sort((left, right) => {
      const pinDelta = Number(pinnedSet.has(right.id)) - Number(pinnedSet.has(left.id));
      if (pinDelta !== 0) {
        return pinDelta;
      }

      return left.coinCost - right.coinCost;
    });
  }, [giftPanelTab, pinnedGiftIds]);
  const selectedGift = useMemo(() => {
    return (
      GIFT_CATALOG.find((gift) => gift.id === selectedGiftId) ||
      visibleGifts[0] ||
      GIFT_CATALOG[0]
    );
  }, [selectedGiftId, visibleGifts]);
  const selectedGiftLocked = selectedGift.unlockBadgeLevel > currentBadge.level;
  const selectedRecipient =
    recipientOptions.find((recipient) => recipient.id === selectedRecipientId) || recipientOptions[0];
  const isSelfOnStage = onStageParticipantIds.includes(selfParticipant.id);
  const raisedHandStudents = useMemo(
    () =>
      activeParticipants.filter(
        (participant) =>
          participant.role === 'student' &&
          participant.handRaised &&
          participant.id !== selfParticipant.id
      ),
    [activeParticipants, selfParticipant.id]
  );
  const onStageParticipants = useMemo(
    () =>
      onStageParticipantIds
        .map((participantId) => participants.find((participant) => participant.id === participantId))
        .filter((participant): participant is Participant => !!participant),
    [onStageParticipantIds, participants]
  );
  const invitableStudents = useMemo(
    () =>
      activeParticipants.filter(
        (participant) =>
          participant.role === 'student' &&
          participant.id !== selfParticipant.id &&
          !onStageParticipantIds.includes(participant.id)
      ),
    [activeParticipants, onStageParticipantIds, selfParticipant.id]
  );
  const chatModerationStudents = useMemo(
    () =>
      activeParticipants.filter(
        (participant) => participant.role === 'student' && participant.id !== selfParticipant.id
      ),
    [activeParticipants, selfParticipant.id]
  );
  const isSelfChatMuted = mutedChatParticipantIds.includes(selfParticipant.id);
  const canSendChat = isTeacher || (isChatOpen && !isSelfChatMuted);

  const topGifters = useMemo(() => {
    const totals = new Map<string, { senderName: string; total: number }>();

    giftFeed.forEach((gift) => {
      const current = totals.get(gift.senderId);
      if (current) {
        totals.set(gift.senderId, {
          ...current,
          total: current.total + gift.totalCoins,
        });
      } else {
        totals.set(gift.senderId, {
          senderName: gift.senderName,
          total: gift.totalCoins,
        });
      }
    });

    return Array.from(totals.entries())
      .map(([senderId, details]) => ({ senderId, ...details }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 4);
  }, [giftFeed]);

  const liveClassworkTasks = useMemo<LiveTaskRuntime[]>(() => {
    const sessionStartMs = sessionStartMsRef.current;

    return LIVE_TASK_PLAN.filter((task) => task.kind === 'classwork').map((task) => {
      const startAtMs = sessionStartMs + task.releaseAfterMinutes * 60_000;
      const endAtMs = startAtMs + (task.durationMinutes || 0) * 60_000;
      return {
        ...task,
        startAtMs,
        endAtMs,
        remainingMs: endAtMs - liveNowMs,
      };
    });
  }, [liveNowMs]);

  const activeLiveClasswork = useMemo(() => {
    if (streamStatus === 'ended') {
      return null;
    }

    return (
      liveClassworkTasks.find(
        (task) => task.remainingMs !== undefined && liveNowMs >= task.startAtMs && task.remainingMs > 0
      ) || null
    );
  }, [liveClassworkTasks, liveNowMs, streamStatus]);

  const nextLiveClasswork = useMemo(() => {
    if (streamStatus === 'ended') {
      return null;
    }

    return (
      liveClassworkTasks
        .filter((task) => liveNowMs < task.startAtMs)
        .sort((left, right) => left.startAtMs - right.startAtMs)[0] || null
    );
  }, [liveClassworkTasks, liveNowMs, streamStatus]);

  const [linkedPostClassAssignments, setLinkedPostClassAssignments] = useState<LiveLinkedAssignment[]>([]);
  const [isLinkedAssignmentsLoading, setIsLinkedAssignmentsLoading] = useState(false);
  const loadLinkedAssignments = useCallback(async () => {
    if (teacherActor !== 'school' || !liveClass.id) {
      setLinkedPostClassAssignments([]);
      return;
    }

    setIsLinkedAssignmentsLoading(true);
    try {
      if (isTeacher) {
        if (!hasTeacherAuthSession) {
          setLinkedPostClassAssignments([]);
          return;
        }

        const payload =
          teacherActor === 'school' ? await fetchSchoolAssignments() : await fetchTutorAssignments();
        setLinkedPostClassAssignments(
          payload.assignments.filter((assignment) => assignment.sessionId === liveClass.id)
        );
        return;
      }

      if (!studentIdentity.department || !studentIdentity.classGroup) {
        setLinkedPostClassAssignments([]);
        return;
      }

      const payload = await fetchStudentAssignments({
        department: studentIdentity.department,
        classGroup: studentIdentity.classGroup,
        studentId: studentIdentity.id,
      });

      setLinkedPostClassAssignments(
        payload.assignments.filter((assignment) => assignment.sessionId === liveClass.id)
      );
    } catch {
      setLinkedPostClassAssignments([]);
    } finally {
      setIsLinkedAssignmentsLoading(false);
    }
  }, [
    hasTeacherAuthSession,
    isTeacher,
    liveClass.id,
    studentIdentity.classGroup,
    studentIdentity.department,
    studentIdentity.id,
    teacherActor,
  ]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await loadLinkedAssignments();
    };

    void run().catch(() => {
      if (!cancelled) {
        setLinkedPostClassAssignments([]);
        setIsLinkedAssignmentsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadLinkedAssignments]);

  const openLinkedAssignmentComposer = useCallback(() => {
    setLinkedAssignmentDraft(buildLiveLinkedAssignmentDraft(liveClass, linkedAssignmentSession));
    setIsLinkedAssignmentComposerOpen(true);
  }, [linkedAssignmentSession, liveClass]);

  const closeLinkedAssignmentComposer = useCallback(() => {
    setIsLinkedAssignmentComposerOpen(false);
    setIsLinkedAssignmentSaving(false);
  }, []);

  const handleCreateLinkedAssignment = useCallback(async () => {
    const payload: CreateSchoolAssignmentInput = {
      title: linkedAssignmentDraft.title.trim(),
      subject: linkedAssignmentDraft.subject.trim(),
      department: linkedAssignmentDraft.department.trim(),
      classGroup: linkedAssignmentDraft.classGroup.trim(),
      description: linkedAssignmentDraft.description.trim(),
      content: linkedAssignmentDraft.content.trim(),
      checklist: linkedAssignmentDraft.checklistText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      type: 'assignment',
      deliveryMode: 'virtual',
      releaseMode: 'on_class_end',
      dueAt: linkedAssignmentDraft.dueAt,
      points: Math.max(1, Number(linkedAssignmentDraft.points) || 0),
      sessionId: liveClass.id || null,
      attachments: 0,
    };

    if (
      !payload.title ||
      !payload.subject ||
      !payload.department ||
      !payload.classGroup ||
      !payload.description ||
      !payload.content ||
      !payload.dueAt ||
      !payload.sessionId
    ) {
      pushNotice('Add the class, due date, summary, and homework instructions before creating this task.', 'warning');
      return;
    }

    setIsLinkedAssignmentSaving(true);
    try {
      const response =
        teacherActor === 'school'
          ? await createSchoolAssignment(payload)
          : await createTutorAssignment(payload);
      setLinkedPostClassAssignments(
        response.assignments.filter((assignment) => assignment.sessionId === liveClass.id)
      );
      setIsLinkedAssignmentComposerOpen(false);
      pushNotice('Linked homework created for this class.', 'success');
    } catch (error) {
      pushNotice(
        error instanceof Error ? error.message : 'Could not create linked homework right now.',
        'error'
      );
    } finally {
      setIsLinkedAssignmentSaving(false);
    }
  }, [linkedAssignmentDraft, liveClass.id, pushNotice, teacherActor]);

  const releasedLinkedAssignments = useMemo(
    () => linkedPostClassAssignments.filter((assignment) => assignment.isReleased),
    [linkedPostClassAssignments]
  );
  const shouldShowLinkedAssignmentsPanel =
    (isTeacher && Boolean(liveClass.id)) ||
    isLinkedAssignmentsLoading ||
    linkedPostClassAssignments.length > 0;

  const rememberEventId = useCallback((eventId: string) => {
    if (!eventId) {
      return;
    }

    const seen = seenEventIdsRef.current;
    if (seen.size > 800) {
      seen.clear();
    }
    seen.add(eventId);
  }, []);

  const publishSignal = useCallback(
    async (event: string, payload: Record<string, unknown>) => {
      try {
        const response = await fetch(`${API_BASE_URL}/realtime/signal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: channelName,
            event,
            payload,
          }),
        });

        return response.ok;
      } catch {
        return false;
      }
    },
    [channelName]
  );

  const stopLocalStream = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (stageLocalVideoRef.current) {
      stageLocalVideoRef.current.srcObject = null;
    }
  }, []);

  const closePeerConnection = useCallback((remoteClientId: string) => {
    const connection = peerConnectionsRef.current.get(remoteClientId);
    if (connection) {
      connection.close();
      peerConnectionsRef.current.delete(remoteClientId);
    }
  }, []);

  const closeAllPeerConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((connection) => connection.close());
    peerConnectionsRef.current.clear();
    pendingIceRef.current.clear();
  }, []);

  const queueIceCandidate = useCallback((remoteClientId: string, candidate: RTCIceCandidateInit) => {
    const queued = pendingIceRef.current.get(remoteClientId) || [];
    pendingIceRef.current.set(remoteClientId, [...queued, candidate]);
  }, []);

  const flushPendingIceCandidates = useCallback(async (remoteClientId: string, connection: RTCPeerConnection) => {
    const queuedCandidates = pendingIceRef.current.get(remoteClientId) || [];
    if (queuedCandidates.length === 0) {
      return;
    }

    for (const candidate of queuedCandidates) {
      try {
        await connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore invalid or stale ICE candidates.
      }
    }

    pendingIceRef.current.delete(remoteClientId);
  }, []);

  const sendTargetedSignal = useCallback(
    async (event: string, targetClientId: string, data: Record<string, unknown>) => {
      const eventId = `signal-${event}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      rememberEventId(eventId);

      return publishSignal(event, {
        eventId,
        clientId: clientIdRef.current,
        targetClientId,
        ...data,
      });
    },
    [publishSignal, rememberEventId]
  );

  const createTeacherOfferForViewer = useCallback(
    async (viewerClientId: string) => {
      if (!isTeacher) {
        return;
      }

      const stream = localStreamRef.current;
      if (!stream || stream.getTracks().length === 0) {
        return;
      }

      closePeerConnection(viewerClientId);

      const connection = new RTCPeerConnection(RTC_CONFIGURATION);
      peerConnectionsRef.current.set(viewerClientId, connection);

      stream.getTracks().forEach((track) => {
        connection.addTrack(track, stream);
      });

      connection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        void sendTargetedSignal('webrtc.ice', viewerClientId, {
          candidate: event.candidate.toJSON(),
          senderRole: 'teacher',
        });
      };

      connection.onconnectionstatechange = () => {
        if (
          connection.connectionState === 'failed' ||
          connection.connectionState === 'disconnected' ||
          connection.connectionState === 'closed'
        ) {
          closePeerConnection(viewerClientId);
        }
      };

      try {
        const offer = await connection.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false,
        });
        await connection.setLocalDescription(offer);

        await sendTargetedSignal('webrtc.offer', viewerClientId, {
          sdp: offer,
          senderRole: 'teacher',
        });
      } catch {
        closePeerConnection(viewerClientId);
      }
    },
    [closePeerConnection, isTeacher, sendTargetedSignal]
  );

  const handleIncomingOffer = useCallback(
    async (senderClientId: string, offer: RTCSessionDescriptionInit) => {
      if (isTeacher) {
        return;
      }

      closePeerConnection(senderClientId);

      const connection = new RTCPeerConnection(RTC_CONFIGURATION);
      peerConnectionsRef.current.set(senderClientId, connection);

      connection.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          setRemoteTeacherStream(stream);
          setStreamStatus('live');
          pushNotice('Tutor video is now live.');
        }
      };

      connection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        void sendTargetedSignal('webrtc.ice', senderClientId, {
          candidate: event.candidate.toJSON(),
          senderRole: 'student',
        });
      };

      connection.onconnectionstatechange = () => {
        if (
          connection.connectionState === 'failed' ||
          connection.connectionState === 'disconnected' ||
          connection.connectionState === 'closed'
        ) {
          setRemoteTeacherStream(null);
          setStreamStatus('connecting');
        }
      };

      try {
        await connection.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingIceCandidates(senderClientId, connection);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        await sendTargetedSignal('webrtc.answer', senderClientId, {
          sdp: answer,
          senderRole: 'student',
        });
      } catch {
        closePeerConnection(senderClientId);
      }
    },
    [closePeerConnection, flushPendingIceCandidates, isTeacher, sendTargetedSignal]
  );

  const handleIncomingAnswer = useCallback(
    async (senderClientId: string, answer: RTCSessionDescriptionInit) => {
      const connection = peerConnectionsRef.current.get(senderClientId);
      if (!connection) {
        return;
      }

      try {
        await connection.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIceCandidates(senderClientId, connection);
      } catch {
        closePeerConnection(senderClientId);
      }
    },
    [closePeerConnection, flushPendingIceCandidates]
  );

  const handleIncomingIce = useCallback(
    async (senderClientId: string, candidateInit: RTCIceCandidateInit) => {
      const connection = peerConnectionsRef.current.get(senderClientId);

      if (!connection || !connection.remoteDescription) {
        queueIceCandidate(senderClientId, candidateInit);
        return;
      }

      try {
        await connection.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch {
        queueIceCandidate(senderClientId, candidateInit);
      }
    },
    [queueIceCandidate]
  );

  const appendChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages((previous) => [...previous.slice(-149), message]);
  }, []);

  const appendGiftEvent = useCallback((gift: GiftEvent) => {
    setGiftFeed((previous) => [gift, ...previous].slice(0, 40));

    const floatingId = `floating-${gift.id}`;
    const lane = Math.floor(Math.random() * 5);

    setFloatingGifts((previous) => [
      ...previous,
      {
        id: floatingId,
        label: `${gift.giftIconLabel} x${gift.quantity}`,
        accentClass: gift.giftAccentClass,
        lane,
      },
    ]);

    window.setTimeout(() => {
      setFloatingGifts((previous) => previous.filter((item) => item.id !== floatingId));
    }, 3200);

    const notificationId = `gift-notification-${gift.id}`;
    setGiftNotifications((previous) => [
      {
        id: notificationId,
        title: `${gift.senderName} sent ${gift.giftName} x${gift.quantity}`,
        subtitle: `${gift.recipientName} received ${gift.totalCoins} coins worth`,
        iconUrl: gift.giftIconUrl,
        accentClass: gift.giftAccentClass,
      },
      ...previous,
    ].slice(0, 3));

    window.setTimeout(() => {
      setGiftNotifications((previous) => previous.filter((item) => item.id !== notificationId));
    }, 2800);

    if (gift.giftTier === 'advanced') {
      const spotlightId = `advanced-spotlight-${gift.id}`;
      setAdvancedGiftSpotlight({
        id: spotlightId,
        senderName: gift.senderName,
        recipientName: gift.recipientName,
        giftName: gift.giftName,
        iconUrl: gift.giftIconUrl,
        accentClass: gift.giftAccentClass,
        quantity: gift.quantity,
      });

      window.setTimeout(() => {
        setAdvancedGiftSpotlight((current) => (current?.id === spotlightId ? null : current));
      }, 4300);
    }
  }, []);

  const emitPresenceTo = useCallback(
    (targetClientId: string) => {
      const eventId = `presence-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      rememberEventId(eventId);

      const snapshot = latestPresenceRef.current;
      const participant = snapshot.participant || selfParticipant;

      void publishSignal('participant.presence', {
        eventId,
        clientId: clientIdRef.current,
        targetClientId,
        participant: {
          ...participant,
          role: snapshot.role,
          muted: snapshot.muted,
          cameraOn: snapshot.cameraOn,
          handRaised: snapshot.handRaised,
          online: true,
        },
        classId: liveClass.id,
      });
    },
    [liveClass.id, publishSignal, rememberEventId, selfParticipant]
  );

  useEffect(() => {
    if (!isTeacher) {
      setIsTeacherSubscriptionChecking(false);
      setIsTeacherSubscriptionLocked(false);
      setTeacherSubscriptionLockReason('');
      return;
    }

    let mounted = true;
    const checkTeachingSubscription = async () => {
      setIsTeacherSubscriptionChecking(true);
      try {
        const status = await fetchTeachingSubscriptionState(teacherActor);
        if (!mounted) {
          return;
        }

        if (status.isActive) {
          setIsTeacherSubscriptionLocked(false);
          setTeacherSubscriptionLockReason('');
        } else {
          setIsTeacherSubscriptionLocked(true);
          setTeacherSubscriptionLockReason(
            'Your teaching subscription is inactive. Activate Edamaa Pro to host live classes.'
          );
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'Sign in with your authenticated account to host live classes.';
        setIsTeacherSubscriptionLocked(true);
        setTeacherSubscriptionLockReason(message);
      } finally {
        if (mounted) {
          setIsTeacherSubscriptionChecking(false);
        }
      }
    };

    void checkTeachingSubscription();
    return () => {
      mounted = false;
    };
  }, [isTeacher, teacherActor]);

  useEffect(() => {
    if (stageRemoteVideoRef.current) {
      stageRemoteVideoRef.current.srcObject = remoteTeacherStream;
      if (remoteTeacherStream) {
        // Some browsers require an explicit play() call after srcObject updates.
        void stageRemoteVideoRef.current.play().catch(() => {
          pushNotice('Tap the video area if playback is blocked by browser autoplay rules.');
        });
      }
    }
  }, [remoteTeacherStream]);

  // Keep the latest participant media/hand state available for heartbeat payloads.
  useEffect(() => {
    latestPresenceRef.current = {
      participant: selfParticipant,
      role: roomRole,
      muted: !micOn,
      cameraOn,
      handRaised,
    };
  }, [cameraOn, handRaised, micOn, roomRole, selfParticipant]);

  // Keep participant card status in sync with current user controls.
  useEffect(() => {
    setParticipants((previous) =>
      previous.map((participant) =>
        participant.id === selfParticipant.id
          ? {
              ...participant,
              muted: !micOn,
              cameraOn,
              handRaised,
              role: roomRole,
            }
          : participant
      )
    );
  }, [cameraOn, handRaised, micOn, roomRole, selfParticipant.id]);

  useEffect(() => {
    if (!isTeacher) {
      return;
    }

    if (typeof window === 'undefined') {
      setShowTeacherWelcome(true);
      return;
    }

    const key = `edamaa_teacher_welcome_${liveClass.id}`;
    if (!window.sessionStorage.getItem(key)) {
      setShowTeacherWelcome(true);
      window.sessionStorage.setItem(key, '1');
    }
  }, [isTeacher, liveClass.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeLiveClasswork || isTeacher) {
      return;
    }

    if (announcedClassworkIdsRef.current.has(activeLiveClasswork.id)) {
      return;
    }

    announcedClassworkIdsRef.current.add(activeLiveClasswork.id);
    setActiveClassworkPromptId(activeLiveClasswork.id);
    pushNotice(`${activeLiveClasswork.title} is now open.`);
  }, [activeLiveClasswork, isTeacher]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(GIFTING_STORAGE_KEY, String(totalGiftedCoins));
  }, [totalGiftedCoins]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(GIFT_PIN_STORAGE_KEY, JSON.stringify(pinnedGiftIds));
  }, [pinnedGiftIds]);

  useEffect(() => {
    if (visibleGifts.length === 0) {
      return;
    }

    const selectedStillVisible = visibleGifts.some((gift) => gift.id === selectedGiftId);
    if (!selectedStillVisible) {
      setSelectedGiftId(visibleGifts[0].id);
    }
  }, [selectedGiftId, visibleGifts]);

  useEffect(() => {
    return () => {
      if (giftComboTimerRef.current !== null) {
        window.clearTimeout(giftComboTimerRef.current);
        giftComboTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const chatBody = chatBodyRef.current;
    if (!chatBody) {
      return;
    }

    chatBody.scrollTop = chatBody.scrollHeight;
  }, [chatMessages]);

  // Reset classroom state when room changes.
  useEffect(() => {
    closeAllPeerConnections();
    knownPeerClientsRef.current.clear();
    stopLocalStream();
    setRemoteTeacherStream(null);

    if (isTeacher) {
      setParticipants([{ ...selfParticipant, role: 'teacher', online: true }]);
    } else {
      setParticipants([
        {
          ...teacherPlaceholder,
          online: true,
        },
        {
          ...selfParticipant,
          role: 'student',
          online: true,
        },
      ]);
    }

    setChatMessages([
      {
        id: `welcome-${liveClass.id}`,
        senderId: teacherId,
        senderName: liveClass.instructor,
        senderRole: 'teacher',
        text: `Welcome to ${liveClass.name}. Keep your mic muted unless called on.`,
        sentAt: new Date().toISOString(),
      },
    ]);

    setGiftFeed([]);
    setFloatingGifts([]);
    setGiftNotifications([]);
    setAdvancedGiftSpotlight(null);
    setOnStageParticipantIds([]);
    setPendingStageInvites([]);
    setIncomingStageInvite(null);
    setChatReplyTarget(null);
    setIsChatOpen(true);
    setMutedChatParticipantIds([]);
    setLikesCount(0);
    setStreamStatus('connecting');
    pushNotice(isTeacher ? 'Preparing your live stream room...' : 'Joining live stream...');
    setSelectedGiftId(GIFT_CATALOG[0].id);
    setSelectedRecipientId(teacherId);
    setGiftPanelTab('gifts');
    setGiftComboCount(0);
    setGiftComboGiftId(null);
    setIsRechargeOpen(false);
    setCardHolderName('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    if (giftComboTimerRef.current !== null) {
      window.clearTimeout(giftComboTimerRef.current);
      giftComboTimerRef.current = null;
    }
    pendingGiftComboRef.current = null;
    setMicOn(isTeacher);
    setCameraOn(isTeacher);
    setHandRaised(false);
    setScreenShared(false);
    setMediaError('');
  }, [
    closeAllPeerConnections,
    isTeacher,
    liveClass.id,
    liveClass.instructor,
    liveClass.name,
    selfParticipant,
    stopLocalStream,
    teacherId,
    teacherPlaceholder,
  ]);

  // Teacher media capture and rebroadcast to connected viewers.
  useEffect(() => {
    if (!isTeacher) {
      stopLocalStream();
      return;
    }

    const shouldBroadcast = cameraOn || micOn;

    if (!shouldBroadcast) {
      stopLocalStream();
      closeAllPeerConnections();
      setStreamStatus('connecting');
      pushNotice('Your stream is paused. Turn camera or mic on to go live again.');

      const eventId = `stream-status-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      rememberEventId(eventId);
      void publishSignal('stream.status', {
        eventId,
        clientId: clientIdRef.current,
        isLive: false,
        classId: liveClass.id,
      });

      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('This browser does not support camera/microphone streaming APIs.');
      return;
    }

    let cancelled = false;

    const startBroadcast = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: cameraOn,
          audio: micOn,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        stopLocalStream();
        localStreamRef.current = stream;

        if (stageLocalVideoRef.current) {
          stageLocalVideoRef.current.srcObject = stream;
        }

        setMediaError('');
        setStreamStatus('live');

        const statusEventId = `stream-status-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        rememberEventId(statusEventId);
        await publishSignal('stream.status', {
          eventId: statusEventId,
          clientId: clientIdRef.current,
          isLive: true,
          classId: liveClass.id,
        });

        const knownClients = Array.from(knownPeerClientsRef.current.entries());
        for (const [remoteClientId, details] of knownClients) {
          if (details.role === 'student') {
            await createTeacherOfferForViewer(remoteClientId);
          }
        }
      } catch {
        setMediaError('Camera/microphone permission blocked. Update browser permissions and retry.');
        setCameraOn(false);
        setMicOn(false);
        stopLocalStream();
      }
    };

    void startBroadcast();

    return () => {
      cancelled = true;
    };
  }, [
    cameraOn,
    closeAllPeerConnections,
    createTeacherOfferForViewer,
    isTeacher,
    liveClass.id,
    micOn,
    publishSignal,
    rememberEventId,
    stopLocalStream,
  ]);

  const spawnReactionBurst = useCallback((label: string, accentClass: string, amount = 1) => {
    const total = clamp(amount, 1, 12);
    const createdIds: string[] = [];

    setFloatingReactions((previous) => {
      const next = [...previous];
      for (let i = 0; i < total; i += 1) {
        const id = `reaction-${Date.now()}-${Math.floor(Math.random() * 100000)}-${i}`;
        const lane = Math.floor(Math.random() * 5);
        createdIds.push(id);
        next.push({ id, label, accentClass, lane });
      }
      return next;
    });

    window.setTimeout(() => {
      setFloatingReactions((previous) => previous.filter((item) => !createdIds.includes(item.id)));
    }, 2200);
  }, []);

  const getReactionAccent = useCallback(
    (emoji: string) =>
      reactionPalette.find((item) => item.emoji === emoji)?.accentClass || 'from-slate-400 to-slate-500',
    [reactionPalette]
  );

  // Real-time event stream: presence, chat, gifts, reactions, and WebRTC signaling.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const source = new EventSource(`${API_BASE_URL}/realtime/stream?channel=${encodeURIComponent(channelName)}`);
    eventSourceRef.current = source;

    source.onopen = () => {
      setStreamStatus((previous) => {
        if (previous === 'ended') {
          return previous;
        }
        return isTeacher ? previous : 'connecting';
      });
      pushNotice(isTeacher ? `Connected to ${liveClass.name}` : `Connected to ${liveClass.name}. Waiting for tutor media...`);
    };

    source.onmessage = (messageEvent) => {
      let parsedEnvelope: unknown;
      try {
        parsedEnvelope = JSON.parse(messageEvent.data) as unknown;
      } catch {
        return;
      }

      if (!parsedEnvelope || typeof parsedEnvelope !== 'object') {
        return;
      }

      const envelope = parsedEnvelope as Record<string, unknown>;
      const eventName = typeof envelope.event === 'string' ? envelope.event : '';
      const payload = envelope.payload;

      if (!eventName || !payload || typeof payload !== 'object') {
        return;
      }

      const data = payload as Record<string, unknown>;
      const eventId = typeof data.eventId === 'string' ? data.eventId : '';
      const senderClientId = typeof data.clientId === 'string' ? data.clientId : '';
      const targetClientId = typeof data.targetClientId === 'string' ? data.targetClientId : '';

      if (targetClientId && targetClientId !== clientIdRef.current) {
        return;
      }

      if (eventId) {
        if (seenEventIdsRef.current.has(eventId)) {
          return;
        }
        rememberEventId(eventId);
      }

      if (senderClientId && senderClientId === clientIdRef.current) {
        return;
      }

      if (eventName === 'participant.join' || eventName === 'participant.presence') {
        const participantData = data.participant;
        if (!participantData || typeof participantData !== 'object') {
          return;
        }

        const rawParticipant = participantData as Record<string, unknown>;
        const participantId = typeof rawParticipant.id === 'string' ? rawParticipant.id : '';
        if (!participantId) {
          return;
        }

        const incomingParticipant: Participant = {
          id: participantId,
          name: typeof rawParticipant.name === 'string' ? rawParticipant.name : 'Learner',
          role: rawParticipant.role === 'teacher' ? 'teacher' : 'student',
          avatar: typeof rawParticipant.avatar === 'string' ? rawParticipant.avatar : undefined,
          muted: rawParticipant.muted === true,
          cameraOn: rawParticipant.cameraOn === true,
          handRaised: rawParticipant.handRaised === true,
          online: true,
          isSelf: false,
        };

        if (senderClientId) {
          knownPeerClientsRef.current.set(senderClientId, {
            participantId: incomingParticipant.id,
            role: incomingParticipant.role,
          });
        }

        setParticipants((previous) => {
          const index = previous.findIndex((participant) => participant.id === incomingParticipant.id);
          if (index >= 0) {
            const next = [...previous];
            next[index] = { ...next[index], ...incomingParticipant, online: true };
            return next;
          }

          return [...previous, incomingParticipant];
        });

        if (eventName === 'participant.join' && senderClientId) {
          emitPresenceTo(senderClientId);

          if (isTeacher) {
            const stageSyncEventId = `stage-sync-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
            rememberEventId(stageSyncEventId);
            void publishSignal('stage.sync', {
              eventId: stageSyncEventId,
              clientId: clientIdRef.current,
              targetClientId: senderClientId,
              onStageParticipantIds,
              syncedAt: new Date().toISOString(),
            });
          }
        }

        if (
          isTeacher &&
          senderClientId &&
          incomingParticipant.role === 'student' &&
          localStreamRef.current &&
          localStreamRef.current.getTracks().length > 0
        ) {
          void createTeacherOfferForViewer(senderClientId);
        }

        return;
      }

      if (eventName === 'participant.leave') {
        const participantId = typeof data.participantId === 'string' ? data.participantId : '';
        if (!participantId) {
          return;
        }

        if (senderClientId) {
          knownPeerClientsRef.current.delete(senderClientId);
          closePeerConnection(senderClientId);
        }

        setParticipants((previous) =>
          previous.map((participant) =>
            participant.id === participantId ? { ...participant, online: false, handRaised: false } : participant
          )
        );
        setOnStageParticipantIds((previous) => previous.filter((id) => id !== participantId));
        setPendingStageInvites((previous) =>
          previous.filter((invite) => invite.studentId !== participantId || invite.status !== 'pending')
        );
        setMutedChatParticipantIds((previous) => previous.filter((id) => id !== participantId));

        if (!isTeacher && participantId === teacherId) {
          setStreamStatus('ended');
          setRemoteTeacherStream(null);
          closeAllPeerConnections();
          pushNotice('Tutor ended the live stream.');
        }

        return;
      }

      if (eventName === 'participant.hand') {
        const participantId = typeof data.participantId === 'string' ? data.participantId : '';
        const raised = data.handRaised === true;

        if (!participantId) {
          return;
        }

        setParticipants((previous) =>
          previous.map((participant) =>
            participant.id === participantId ? { ...participant, handRaised: raised } : participant
          )
        );
        return;
      }

      if (eventName === 'stage.invite') {
        const inviteId = typeof data.inviteId === 'string' ? data.inviteId : '';
        const studentId = typeof data.studentId === 'string' ? data.studentId : '';
        const hostClientId = typeof data.hostClientId === 'string' ? data.hostClientId : senderClientId;
        const hostName = typeof data.hostName === 'string' ? data.hostName : liveClass.instructor;

        if (!inviteId || !studentId || !hostClientId) {
          return;
        }

        if (!isTeacher && studentId === selfParticipant.id) {
          setIncomingStageInvite({
            inviteId,
            hostClientId,
            hostName,
            sentAt: typeof data.sentAt === 'string' ? data.sentAt : new Date().toISOString(),
          });
          pushNotice(`${hostName} invited you to join the live stage.`);
        }
        return;
      }

      if (eventName === 'stage.sync') {
        const incomingOnStage = Array.isArray(data.onStageParticipantIds)
          ? data.onStageParticipantIds.filter((value): value is string => typeof value === 'string')
          : [];
        setOnStageParticipantIds(incomingOnStage);
        return;
      }

      if (eventName === 'stage.invite-response') {
        if (!isTeacher) {
          return;
        }

        const inviteId = typeof data.inviteId === 'string' ? data.inviteId : '';
        const studentId = typeof data.studentId === 'string' ? data.studentId : '';
        const studentName = typeof data.studentName === 'string' ? data.studentName : 'Student';
        const accepted = data.accepted === true;

        if (!inviteId || !studentId) {
          return;
        }

        setPendingStageInvites((previous) =>
          previous.map((invite) =>
            invite.inviteId === inviteId
              ? { ...invite, status: accepted ? 'accepted' : 'declined' }
              : invite
          )
        );

        if (!accepted) {
          pushNotice(`${studentName} declined the stage invite.`);
          return;
        }

        setOnStageParticipantIds((previous) => (previous.includes(studentId) ? previous : [...previous, studentId]));
        setParticipants((previous) =>
          previous.map((participant) =>
            participant.id === studentId
              ? { ...participant, handRaised: false, muted: false, cameraOn: participant.cameraOn }
              : participant
          )
        );
        pushNotice(`${studentName} joined the live stage.`);

        const promoteEventId = `stage-promote-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        rememberEventId(promoteEventId);
        void publishSignal('stage.promote', {
          eventId: promoteEventId,
          clientId: clientIdRef.current,
          inviteId,
          participantId: studentId,
          participantName: studentName,
          promotedAt: new Date().toISOString(),
        });
        return;
      }

      if (eventName === 'stage.promote') {
        const participantId = typeof data.participantId === 'string' ? data.participantId : '';
        const participantName =
          typeof data.participantName === 'string' ? data.participantName : 'Student';

        if (!participantId) {
          return;
        }

        setOnStageParticipantIds((previous) => (previous.includes(participantId) ? previous : [...previous, participantId]));
        setParticipants((previous) =>
          previous.map((participant) =>
            participant.id === participantId ? { ...participant, handRaised: false } : participant
          )
        );

        if (participantId === selfParticipant.id) {
          pushNotice('You are now on stage. You can ask your question live.');
        } else {
          pushNotice(`${participantName} is now on stage.`);
        }
        return;
      }

      if (eventName === 'stage.remove') {
        const participantId = typeof data.participantId === 'string' ? data.participantId : '';
        const participantName =
          typeof data.participantName === 'string' ? data.participantName : 'Student';

        if (!participantId) {
          return;
        }

        setOnStageParticipantIds((previous) => previous.filter((id) => id !== participantId));
        if (participantId === selfParticipant.id) {
          setMicOn(false);
          setCameraOn(false);
          pushNotice('You were moved back to audience by the tutor.');
        } else {
          pushNotice(`${participantName} was moved back to audience.`);
        }
        return;
      }

      if (eventName === 'chat.settings') {
        const chatOpen = data.isOpen !== false;
        setIsChatOpen(chatOpen);

        if (!isTeacher) {
          pushNotice(chatOpen ? 'Tutor reopened chat.' : 'Tutor paused chat temporarily.');
        }
        return;
      }

      if (eventName === 'chat.moderation') {
        const participantId = typeof data.participantId === 'string' ? data.participantId : '';
        const participantName =
          typeof data.participantName === 'string' ? data.participantName : 'Student';
        const muted = data.muted === true;

        if (!participantId) {
          return;
        }

        setMutedChatParticipantIds((previous) => {
          if (muted) {
            return previous.includes(participantId) ? previous : [...previous, participantId];
          }
          return previous.filter((id) => id !== participantId);
        });

        if (!isTeacher && participantId === selfParticipant.id) {
          pushNotice(
            muted
              ? 'Tutor muted your chat for now. Keep following the lesson.'
              : 'Tutor restored your chat access.'
          );
        } else if (isTeacher) {
          pushNotice(
            muted
              ? `${participantName} was muted in chat.`
              : `${participantName} can chat again.`
          );
        }
        return;
      }

      if (eventName === 'chat.clear') {
        const actorName =
          typeof data.actorName === 'string' && data.actorName.trim()
            ? data.actorName.trim()
            : liveClass.instructor;

        setChatReplyTarget(null);
        setChatMessages([
          {
            id: `chat-clear-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            senderId: teacherId,
            senderName: actorName,
            senderRole: 'teacher',
            text: 'Chat was cleared to start a focused discussion.',
            sentAt: new Date().toISOString(),
          },
        ]);

        if (!isTeacher) {
          pushNotice(`${actorName} cleared the chat.`);
        }
        return;
      }

      if (eventName === 'chat.message') {
        const message: ChatMessage = {
          id: typeof data.messageId === 'string' ? data.messageId : `message-${Date.now()}`,
          senderId: typeof data.senderId === 'string' ? data.senderId : `sender-${Date.now()}`,
          senderName: typeof data.senderName === 'string' ? data.senderName : 'Learner',
          senderRole: data.senderRole === 'teacher' ? 'teacher' : 'student',
          text: typeof data.text === 'string' ? data.text : '',
          sentAt: typeof data.sentAt === 'string' ? data.sentAt : new Date().toISOString(),
          replyToMessageId:
            typeof data.replyToMessageId === 'string' ? data.replyToMessageId : undefined,
          replyToSenderName:
            typeof data.replyToSenderName === 'string' ? data.replyToSenderName : undefined,
          replyToText: typeof data.replyToText === 'string' ? data.replyToText : undefined,
        };

        if (message.text.trim()) {
          appendChatMessage(message);
        }

        return;
      }

      if (eventName === 'gift.sent') {
        if (!giftingEnabled) {
          return;
        }
        const incomingRecipientId = typeof data.recipientId === 'string' ? data.recipientId : teacherId;
        const incomingGiftId = typeof data.giftId === 'string' ? data.giftId : GIFT_CATALOG[0].id;
        const giftDefinition = GIFT_CATALOG.find((gift) => gift.id === incomingGiftId) || GIFT_CATALOG[0];

        const giftEvent: GiftEvent = {
          id: typeof data.giftEventId === 'string' ? data.giftEventId : `gift-${Date.now()}`,
          senderId: typeof data.senderId === 'string' ? data.senderId : 'sender',
          senderName: typeof data.senderName === 'string' ? data.senderName : 'Learner',
          recipientId: incomingRecipientId,
          recipientName:
            typeof data.recipientName === 'string'
              ? data.recipientName
              : incomingRecipientId === schoolSupportId
              ? schoolSupportName
              : liveClass.instructor,
          giftId: incomingGiftId,
          giftName: typeof data.giftName === 'string' ? data.giftName : giftDefinition.name,
          giftIconUrl: typeof data.giftIconUrl === 'string' ? data.giftIconUrl : giftDefinition.iconUrl,
          giftIconLabel:
            typeof data.giftIconLabel === 'string' ? data.giftIconLabel : giftDefinition.iconLabel,
          giftAccentClass:
            typeof data.giftAccentClass === 'string' ? data.giftAccentClass : giftDefinition.accentClass,
          giftTier:
            data.giftTier === 'advanced' || giftDefinition.tier === 'advanced' ? 'advanced' : 'standard',
          unlockBadgeLevel: Number.isFinite(Number(data.unlockBadgeLevel))
            ? clamp(Number(data.unlockBadgeLevel), 1, 5)
            : giftDefinition.unlockBadgeLevel,
          quantity: Number.isFinite(Number(data.quantity)) ? clamp(Number(data.quantity), 1, 50) : 1,
          totalCoins: Number.isFinite(Number(data.totalCoins)) ? Number(data.totalCoins) : giftDefinition.coinCost,
          sentAt: typeof data.sentAt === 'string' ? data.sentAt : new Date().toISOString(),
        };

        appendGiftEvent(giftEvent);
        return;
      }

      if (eventName === 'reaction.like') {
        const amount = Number.isFinite(Number(data.amount)) ? clamp(Number(data.amount), 1, 20) : 1;
        setLikesCount((previous) => previous + amount);
        spawnReactionBurst('❤️', 'from-rose-500 to-pink-500', amount);
        return;
      }

      if (eventName === 'reaction.emoji') {
        const emoji = typeof data.emoji === 'string' ? data.emoji : '👏';
        const amount = Number.isFinite(Number(data.amount)) ? clamp(Number(data.amount), 1, 12) : 1;
        spawnReactionBurst(emoji, getReactionAccent(emoji), amount);
        return;
      }

      if (eventName === 'question.submit') {
        const incoming = data.question;
        if (incoming && typeof incoming === 'object') {
          const raw = incoming as Record<string, unknown>;
          const questionId = typeof raw.id === 'string' ? raw.id : '';
          if (!questionId) {
            return;
          }

          const submittedAt =
            typeof raw.submittedAt === 'string' ? raw.submittedAt : new Date().toISOString();
          const lastActivityAt =
            typeof raw.lastActivityAt === 'string' ? raw.lastActivityAt : submittedAt;
          const votes = Number.isFinite(Number(raw.votes)) ? Math.max(0, Number(raw.votes)) : 0;
          const voterIds = Array.isArray(raw.voterIds)
            ? raw.voterIds.filter((value): value is string => typeof value === 'string')
            : [];
          const question: LiveQuestion = {
            id: questionId,
            studentId: typeof raw.studentId === 'string' ? raw.studentId : 'student',
            studentName: typeof raw.studentName === 'string' ? raw.studentName : 'Student',
            text: typeof raw.text === 'string' ? raw.text : '',
            status: raw.status === 'resolved' ? 'resolved' : raw.status === 'spotlight' ? 'spotlight' : 'open',
            submittedAt,
            votes,
            voterIds,
            lastActivityAt,
          };

          setQuestionQueue((previous) => {
            const exists = previous.some((item) => item.id === question.id);
            if (exists) {
              return previous;
            }
            return [question, ...previous].slice(0, 20);
          });
        }
        return;
      }

      if (eventName === 'question.spotlight') {
        const questionId = typeof data.questionId === 'string' ? data.questionId : '';
        const text = typeof data.text === 'string' ? data.text : '';
        if (!questionId) {
          return;
        }

        setQuestionQueue((previous) =>
          previous.map((item) => (item.id === questionId ? { ...item, status: 'spotlight', text } : item))
        );
        setSpotlightQuestion({
          id: questionId,
          studentId: typeof data.studentId === 'string' ? data.studentId : '',
          studentName: typeof data.studentName === 'string' ? data.studentName : 'Student',
          text,
          status: 'spotlight',
          submittedAt: new Date().toISOString(),
          votes: 0,
          voterIds: [],
          lastActivityAt: new Date().toISOString(),
        });
        return;
      }

      if (eventName === 'question.vote') {
        const questionId = typeof data.questionId === 'string' ? data.questionId : '';
        const voterId = typeof data.voterId === 'string' ? data.voterId : '';
        if (!questionId || !voterId) {
          return;
        }
        setQuestionQueue((previous) =>
          previous.map((item) => {
            if (item.id !== questionId || item.voterIds.includes(voterId)) {
              return item;
            }
            return {
              ...item,
              votes: item.votes + 1,
              voterIds: [...item.voterIds, voterId],
              lastActivityAt: new Date().toISOString(),
            };
          })
        );
        return;
      }

      if (eventName === 'question.resolve') {
        const questionId = typeof data.questionId === 'string' ? data.questionId : '';
        if (!questionId) {
          return;
        }
        setQuestionQueue((previous) =>
          previous.map((item) => (item.id === questionId ? { ...item, status: 'resolved' } : item))
        );
        setSpotlightQuestion((previous) => (previous?.id === questionId ? null : previous));
        return;
      }

      if (eventName === 'question.hot') {
        const questionId = typeof data.questionId === 'string' ? data.questionId : '';
        const expiresAt = Number.isFinite(Number(data.expiresAt)) ? Number(data.expiresAt) : Date.now() + 60000;
        if (!questionId) {
          return;
        }
        setHotQuestionId(questionId);
        setHotQuestionEndsAtMs(expiresAt);
        return;
      }

      if (eventName === 'stream.status' && !isTeacher) {
        const streamIsLive = data.isLive === true;
        if (streamIsLive) {
          setStreamStatus('live');
          pushNotice('Tutor is now live.');
        } else {
          setRemoteTeacherStream(null);
          closeAllPeerConnections();
          setStreamStatus('connecting');
          pushNotice('Tutor paused the live stream.');
        }
        return;
      }

      if (eventName === 'webrtc.offer') {
        const offer = data.sdp;
        if (offer && typeof offer === 'object' && senderClientId) {
          void handleIncomingOffer(senderClientId, offer as RTCSessionDescriptionInit);
        }
        return;
      }

      if (eventName === 'webrtc.answer') {
        const answer = data.sdp;
        if (answer && typeof answer === 'object' && senderClientId) {
          void handleIncomingAnswer(senderClientId, answer as RTCSessionDescriptionInit);
        }
        return;
      }

      if (eventName === 'webrtc.ice') {
        const candidate = data.candidate;
        if (candidate && typeof candidate === 'object' && senderClientId) {
          void handleIncomingIce(senderClientId, candidate as RTCIceCandidateInit);
        }
      }
    };

    source.onerror = () => {
      setStreamStatus((previous) => (previous === 'ended' ? previous : 'connecting'));
      pushNotice('Realtime sync is unstable. You can continue in this room while reconnecting.', 'warning');
    };

    return () => {
      source.close();
      if (eventSourceRef.current === source) {
        eventSourceRef.current = null;
      }
    };
  }, [
    appendChatMessage,
    appendGiftEvent,
    channelName,
    closeAllPeerConnections,
    closePeerConnection,
    createTeacherOfferForViewer,
    emitPresenceTo,
    handleIncomingAnswer,
    handleIncomingIce,
    handleIncomingOffer,
    isTeacher,
    liveClass.instructor,
    liveClass.name,
    onStageParticipantIds,
    publishSignal,
    rememberEventId,
    schoolSupportId,
    schoolSupportName,
    selfParticipant.id,
    spawnReactionBurst,
    getReactionAccent,
    teacherId,
    setQuestionQueue,
    setSpotlightQuestion,
    setHotQuestionId,
    setHotQuestionEndsAtMs,
  ]);

  // Join and leave should happen only once per room session.
  useEffect(() => {
    const joinEventId = `join-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(joinEventId);

    const joinSnapshot = latestPresenceRef.current;
    const joinParticipant = joinSnapshot.participant || selfParticipant;

    void publishSignal('participant.join', {
      eventId: joinEventId,
      clientId: clientIdRef.current,
      participant: {
        ...joinParticipant,
        role: joinSnapshot.role,
        muted: joinSnapshot.muted,
        cameraOn: joinSnapshot.cameraOn,
        handRaised: joinSnapshot.handRaised,
        online: true,
      },
      classId: liveClass.id,
    });

    const presenceInterval = window.setInterval(() => {
      const heartbeatId = `presence-heartbeat-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      rememberEventId(heartbeatId);

      const heartbeatSnapshot = latestPresenceRef.current;
      const heartbeatParticipant = heartbeatSnapshot.participant || selfParticipant;

      void publishSignal('participant.presence', {
        eventId: heartbeatId,
        clientId: clientIdRef.current,
        participant: {
          ...heartbeatParticipant,
          role: heartbeatSnapshot.role,
          muted: heartbeatSnapshot.muted,
          cameraOn: heartbeatSnapshot.cameraOn,
          handRaised: heartbeatSnapshot.handRaised,
          online: true,
        },
        classId: liveClass.id,
      });
    }, 25000);

    return () => {
      window.clearInterval(presenceInterval);

      const leaveEventId = `leave-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const leaveParticipant = latestPresenceRef.current.participant || selfParticipant;
      void publishSignal('participant.leave', {
        eventId: leaveEventId,
        clientId: clientIdRef.current,
        participantId: leaveParticipant.id,
        classId: liveClass.id,
      });

      if (isTeacher) {
        const endEventId = `stream-status-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        void publishSignal('stream.status', {
          eventId: endEventId,
          clientId: clientIdRef.current,
          isLive: false,
          classId: liveClass.id,
        });
      }

      stopLocalStream();
      closeAllPeerConnections();
    };
  }, [
    closeAllPeerConnections,
    isTeacher,
    liveClass.id,
    publishSignal,
    rememberEventId,
    selfParticipant,
    stopLocalStream,
  ]);

  // Broadcast immediate presence updates when local controls change.
  useEffect(() => {
    const presenceEventId = `presence-update-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(presenceEventId);

    const snapshot = latestPresenceRef.current;
    const participant = snapshot.participant || selfParticipant;

    void publishSignal('participant.presence', {
      eventId: presenceEventId,
      clientId: clientIdRef.current,
      participant: {
        ...participant,
        role: snapshot.role,
        muted: snapshot.muted,
        cameraOn: snapshot.cameraOn,
        handRaised: snapshot.handRaised,
        online: true,
      },
      classId: liveClass.id,
    });
  }, [cameraOn, handRaised, liveClass.id, micOn, publishSignal, rememberEventId, selfParticipant]);

  const sendLike = () => {
    setLikesCount((previous) => previous + 1);
    spawnReactionBurst('❤️', 'from-rose-500 to-pink-500', 1);

    const eventId = `like-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);

    void publishSignal('reaction.like', {
      eventId,
      clientId: clientIdRef.current,
      amount: 1,
      senderId: selfParticipant.id,
      senderName: selfParticipant.name,
    });
  };

  const sendReaction = (emoji: string) => {
    spawnReactionBurst(emoji, getReactionAccent(emoji), 1);

    const eventId = `reaction-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);

    void publishSignal('reaction.emoji', {
      eventId,
      clientId: clientIdRef.current,
      emoji,
      amount: 1,
      senderId: selfParticipant.id,
      senderName: selfParticipant.name,
    });
  };

  const toggleMic = () => {
    if (!isTeacher) {
      pushNotice('Tutor controls live media. Use stage invite + chat to ask questions in real time.');
      return;
    }

    setMicOn((previous) => !previous);
  };

  const toggleCamera = () => {
    if (!isTeacher) {
      pushNotice('Tutor controls live media in this stream mode.');
      return;
    }

    setCameraOn((previous) => !previous);
  };

  const toggleHandRaise = () => {
    if (isSelfOnStage) {
      pushNotice('You are already on stage.');
      return;
    }

    setHandRaised((previous) => {
      const next = !previous;

      const eventId = `hand-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      rememberEventId(eventId);

      void publishSignal('participant.hand', {
        eventId,
        clientId: clientIdRef.current,
        participantId: selfParticipant.id,
        participantName: selfParticipant.name,
        handRaised: next,
      });

      return next;
    });
  };

  const toggleScreenShare = () => {
    if (!isTeacher) {
      pushNotice('Only the tutor can share content in this livestream mode.', 'warning');
      return;
    }

    setScreenShared((previous) => !previous);
  };

  const submitLiveQuestion = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const questionId = `question-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const nowIso = new Date().toISOString();
    const payload: LiveQuestion = {
      id: questionId,
      studentId: selfParticipant.id,
      studentName: selfParticipant.name,
      text: trimmed.slice(0, 240),
      status: 'open',
      submittedAt: nowIso,
      votes: 0,
      voterIds: [],
      lastActivityAt: nowIso,
    };

    setQuestionQueue((previous) => [payload, ...previous].slice(0, 20));
    setQuestionDraft('');

    const eventId = `question-submit-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);
    void publishSignal('question.submit', {
      eventId,
      clientId: clientIdRef.current,
      question: payload,
    });
  };

  const getNextHotQuestion = useCallback((queue: LiveQuestion[]) => {
    const openQuestions = queue.filter((item) => item.status === 'open');
    if (openQuestions.length === 0) {
      return null;
    }
    const lastHot = lastHotQuestionRef.current;
    const cooldownActive =
      lastHot && Date.now() - lastHot.atMs < hotCooldownMs ? lastHot.studentId : null;
    const eligibleQuestions = cooldownActive
      ? openQuestions.filter((item) => item.studentId !== cooldownActive)
      : openQuestions;
    const ranked = (eligibleQuestions.length > 0 ? eligibleQuestions : openQuestions).sort((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    });
    return ranked[0];
  }, [hotCooldownMs]);

  const setHotQuestion = (question: LiveQuestion | null) => {
    if (!question) {
      setHotQuestionId(null);
      setHotQuestionEndsAtMs(null);
      return;
    }
    setHotQuestionId(question.id);
    setHotQuestionEndsAtMs(Date.now() + 60000);
  };

  const startHotQuestion = useCallback((candidateOverride?: LiveQuestion | null) => {
    const candidate = candidateOverride ?? getNextHotQuestion(questionQueue);
    if (!candidate) {
      pushNotice('No open questions to spotlight right now.');
      return;
    }
    setHotQuestion(candidate);
    lastHotQuestionRef.current = { studentId: candidate.studentId, atMs: Date.now() };

    const eventId = `question-hot-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);
    void publishSignal('question.hot', {
      eventId,
      clientId: clientIdRef.current,
      questionId: candidate.id,
      expiresAt: Date.now() + 60000,
    });
  }, [getNextHotQuestion, publishSignal, questionQueue, rememberEventId]);

  const spotlightLiveQuestion = (question: LiveQuestion) => {
    setSpotlightQuestion({ ...question, status: 'spotlight' });
    setQuestionQueue((previous) =>
      previous.map((item) => (item.id === question.id ? { ...item, status: 'spotlight' } : item))
    );

    const eventId = `question-spotlight-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);
    void publishSignal('question.spotlight', {
      eventId,
      clientId: clientIdRef.current,
      questionId: question.id,
      studentId: question.studentId,
      studentName: question.studentName,
      text: question.text,
    });
  };

  const resolveLiveQuestion = (question: LiveQuestion) => {
    setQuestionQueue((previous) =>
      previous.map((item) => (item.id === question.id ? { ...item, status: 'resolved' } : item))
    );
    setSpotlightQuestion((previous) => (previous?.id === question.id ? null : previous));

    const eventId = `question-resolve-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);
    void publishSignal('question.resolve', {
      eventId,
      clientId: clientIdRef.current,
      questionId: question.id,
    });
  };

  const voteForQuestion = (questionId: string) => {
    setQuestionQueue((previous) =>
      previous.map((item) => {
        if (item.id !== questionId) {
          return item;
        }
        if (item.voterIds.includes(selfParticipant.id)) {
          return item;
        }
        const updated = {
          ...item,
          votes: item.votes + 1,
          voterIds: [...item.voterIds, selfParticipant.id],
          lastActivityAt: new Date().toISOString(),
        };
        return updated;
      })
    );

    const eventId = `question-vote-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);
    void publishSignal('question.vote', {
      eventId,
      clientId: clientIdRef.current,
      questionId,
      voterId: selfParticipant.id,
    });
  };

  const toggleChatAvailability = async () => {
    if (!isTeacher) {
      return;
    }

    const nextIsChatOpen = !isChatOpen;
    setIsChatOpen(nextIsChatOpen);

    const eventId = `chat-settings-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);

    const published = await publishSignal('chat.settings', {
      eventId,
      clientId: clientIdRef.current,
      actorId: selfParticipant.id,
      actorName: selfParticipant.name,
      isOpen: nextIsChatOpen,
    });

    pushNotice(
      nextIsChatOpen
        ? 'Chat reopened for the class.'
        : 'Chat paused to keep focus on the lesson.'
    );

    if (!published) {
      pushNotice('Chat setting updated locally. Realtime sync is currently offline.', 'warning');
    }
  };

  const toggleStudentChatMute = async (studentId: string) => {
    if (!isTeacher) {
      return;
    }

    const student = participants.find(
      (participant) => participant.id === studentId && participant.role === 'student'
    );
    if (!student) {
      return;
    }

    const nextMuted = !mutedChatParticipantIds.includes(studentId);
    setMutedChatParticipantIds((previous) =>
      nextMuted ? (previous.includes(studentId) ? previous : [...previous, studentId]) : previous.filter((id) => id !== studentId)
    );

    const eventId = `chat-moderation-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);

    const published = await publishSignal('chat.moderation', {
      eventId,
      clientId: clientIdRef.current,
      actorId: selfParticipant.id,
      actorName: selfParticipant.name,
      participantId: studentId,
      participantName: student.name,
      muted: nextMuted,
    });

    pushNotice(nextMuted ? `${student.name} is muted in chat.` : `${student.name} can chat again.`);

    if (!published) {
      pushNotice('Chat moderation updated locally. Realtime sync is currently offline.', 'warning');
    }
  };

  const clearChatForEveryone = async () => {
    if (!isTeacher) {
      return;
    }

    setChatReplyTarget(null);
    setChatMessages([
      {
        id: `chat-clear-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        senderId: teacherId,
        senderName: selfParticipant.name,
        senderRole: 'teacher',
        text: 'Chat was cleared to start a focused discussion.',
        sentAt: new Date().toISOString(),
      },
    ]);

    const eventId = `chat-clear-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);

    const published = await publishSignal('chat.clear', {
      eventId,
      clientId: clientIdRef.current,
      actorId: selfParticipant.id,
      actorName: selfParticipant.name,
    });

    pushNotice('Chat cleared for everyone.');
    if (!published) {
      pushNotice('Chat cleared locally. Realtime sync is currently offline.', 'warning');
    }
  };

  const handleSendChat = (event: FormEvent) => {
    event.preventDefault();

    if (!canSendChat) {
      if (!isChatOpen) {
        pushNotice('Tutor paused chat temporarily.');
      } else if (isSelfChatMuted) {
        pushNotice('Your chat is muted right now.');
      }
      return;
    }

    const text = chatInput.trim();
    if (!text) {
      return;
    }

    const eventId = `chat-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);

    const message: ChatMessage = {
      id: `message-${eventId}`,
      senderId: selfParticipant.id,
      senderName: selfParticipant.name,
      senderRole: roomRole,
      text,
      sentAt: new Date().toISOString(),
      replyToMessageId: chatReplyTarget?.id,
      replyToSenderName: chatReplyTarget?.senderName,
      replyToText: chatReplyTarget?.text.slice(0, 120),
    };

    appendChatMessage(message);
    setChatInput('');
    setChatReplyTarget(null);

    void publishSignal('chat.message', {
      eventId,
      clientId: clientIdRef.current,
      messageId: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      text: message.text,
      sentAt: message.sentAt,
      replyToMessageId: message.replyToMessageId,
      replyToSenderName: message.replyToSenderName,
      replyToText: message.replyToText,
    });
  };

  const inviteStudentToStage = async (studentId: string) => {
    if (!isTeacher) {
      return;
    }

    const student = participants.find(
      (participant) => participant.id === studentId && participant.role === 'student' && participant.online
    );
    if (!student) {
      pushNotice('Student is offline or unavailable for stage invite.', 'warning');
      return;
    }

    const alreadyPending = pendingStageInvites.some(
      (invite) => invite.studentId === student.id && invite.status === 'pending'
    );
    if (alreadyPending) {
      pushNotice(`${student.name} already has a pending stage invite.`);
      return;
    }

    const matchedClient = Array.from(knownPeerClientsRef.current.entries()).find(
      ([, details]) => details.participantId === student.id
    );
    const targetClientId = matchedClient?.[0];
    if (!targetClientId) {
      pushNotice(`Could not find a realtime channel for ${student.name}. Ask them to rejoin the room.`, 'warning');
      return;
    }

    const inviteId = `stage-invite-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const sentAt = new Date().toISOString();
    setPendingStageInvites((previous) => [
      {
        inviteId,
        studentId: student.id,
        studentName: student.name,
        hostClientId: clientIdRef.current,
        status: 'pending',
        sentAt,
      },
      ...previous.slice(0, 9),
    ]);

    const eventId = `stage-invite-event-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);

    const published = await publishSignal('stage.invite', {
      eventId,
      clientId: clientIdRef.current,
      targetClientId,
      inviteId,
      studentId: student.id,
      studentName: student.name,
      hostClientId: clientIdRef.current,
      hostName: selfParticipant.name,
      sentAt,
    });

    if (published) {
      pushNotice(`Stage invite sent to ${student.name}.`);
    } else {
      pushNotice('Invite was created locally, but realtime sync is currently offline.', 'warning');
    }
  };

  const respondToStageInvite = async (accept: boolean) => {
    if (!incomingStageInvite) {
      return;
    }

    const invite = incomingStageInvite;
    setIncomingStageInvite(null);

    const eventId = `stage-invite-response-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);

    const published = await publishSignal('stage.invite-response', {
      eventId,
      clientId: clientIdRef.current,
      targetClientId: invite.hostClientId,
      inviteId: invite.inviteId,
      studentId: selfParticipant.id,
      studentName: selfParticipant.name,
      accepted: accept,
      respondedAt: new Date().toISOString(),
    });

    if (accept) {
      pushNotice('Stage invite accepted. Waiting for tutor confirmation...');
    } else {
      pushNotice('Stage invite declined.');
    }

    if (!published) {
      pushNotice('Could not sync stage invite response in realtime. Please retry.', 'warning');
    }
  };

  const removeStudentFromStage = async (studentId: string) => {
    if (!isTeacher) {
      return;
    }

    const student = participants.find((participant) => participant.id === studentId);
    if (!student) {
      return;
    }

    setOnStageParticipantIds((previous) => previous.filter((participantId) => participantId !== studentId));

    const eventId = `stage-remove-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);

    await publishSignal('stage.remove', {
      eventId,
      clientId: clientIdRef.current,
      participantId: studentId,
      participantName: student.name,
      removedAt: new Date().toISOString(),
    });
  };

  const togglePinnedGift = (giftId: string) => {
    if (!giftingEnabled) {
      pushNotice('Gifting is available for independent tutor classes only.', 'warning');
      return;
    }
    setPinnedGiftIds((previous) => {
      if (previous.includes(giftId)) {
        return previous.filter((id) => id !== giftId);
      }

      return [giftId, ...previous].slice(0, 8);
    });
  };

  const sendGiftBatch = async (giftId: string, quantity: number, recipientId: string) => {
    if (!giftingEnabled) {
      pushNotice('Gifting is available for independent tutor classes only.', 'warning');
      return;
    }
    const gift = GIFT_CATALOG.find((item) => item.id === giftId);
    if (!gift) {
      return;
    }

    if (gift.unlockBadgeLevel > currentBadge.level) {
      const unlockBadge = GIFTER_BADGES.find((badge) => badge.level === gift.unlockBadgeLevel) || GIFTER_BADGES[0];
      pushNotice(`Unlock ${unlockBadge.name} to send ${gift.name}.`);
      return;
    }

    const recipient = recipientOptions.find((option) => option.id === recipientId) || recipientOptions[0];
    if (!recipient) {
      pushNotice('No recipient is available for gifting right now.', 'warning');
      return;
    }

    const safeQuantity = clamp(Math.floor(quantity) || 1, 1, 99);
    const totalCoins = gift.coinCost * safeQuantity;

    if (totalCoins > coinBalance) {
      pushNotice('Not enough coins. Recharge wallet to continue gifting.', 'error');
      setIsRechargeOpen(true);
      return;
    }

    setCoinBalance((previous) => previous - totalCoins);
    setTotalGiftedCoins((previous) => previous + totalCoins);
    setIsSendingGift(true);

    const eventId = `gift-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    rememberEventId(eventId);

    const giftEvent: GiftEvent = {
      id: `gift-event-${eventId}`,
      senderId: selfParticipant.id,
      senderName: selfParticipant.name,
      recipientId: recipient.id,
      recipientName: recipient.name,
      giftId: gift.id,
      giftName: gift.name,
      giftIconUrl: gift.iconUrl,
      giftIconLabel: gift.iconLabel,
      giftAccentClass: gift.accentClass,
      giftTier: gift.tier,
      unlockBadgeLevel: gift.unlockBadgeLevel,
      quantity: safeQuantity,
      totalCoins,
      sentAt: new Date().toISOString(),
    };

    appendGiftEvent(giftEvent);
    pushNotice(`Gift sent: ${giftEvent.giftName} x${giftEvent.quantity} to ${recipient.name}.`, 'success');

    const published = await publishSignal('gift.sent', {
      eventId,
      clientId: clientIdRef.current,
      giftEventId: giftEvent.id,
      senderId: giftEvent.senderId,
      senderName: giftEvent.senderName,
      recipientId: giftEvent.recipientId,
      recipientName: giftEvent.recipientName,
      giftId: giftEvent.giftId,
      giftName: giftEvent.giftName,
      giftIconUrl: giftEvent.giftIconUrl,
      giftIconLabel: giftEvent.giftIconLabel,
      giftAccentClass: giftEvent.giftAccentClass,
      giftTier: giftEvent.giftTier,
      unlockBadgeLevel: giftEvent.unlockBadgeLevel,
      quantity: giftEvent.quantity,
      totalCoins: giftEvent.totalCoins,
      sentAt: giftEvent.sentAt,
    });

    setIsSendingGift(false);

    if (!published) {
      pushNotice('Gift recorded locally. Realtime sync is offline right now.', 'warning');
    }
  };

  // Flush the pending rapid-tap combo into one realtime gift event.
  const flushPendingGiftCombo = () => {
    const pending = pendingGiftComboRef.current;
    if (!pending) {
      return;
    }

    pendingGiftComboRef.current = null;
    setGiftComboCount(0);
    setGiftComboGiftId(null);
    void sendGiftBatch(pending.giftId, pending.quantity, pending.recipientId);
  };

  // Each tap increments the same gift combo, then auto-sends after short inactivity.
  const queueGiftTap = (giftId: string) => {
    if (!giftingEnabled) {
      pushNotice('Gifting is available for independent tutor classes only.', 'warning');
      return;
    }
    const gift = GIFT_CATALOG.find((item) => item.id === giftId);
    if (!gift) {
      return;
    }

    if (gift.unlockBadgeLevel > currentBadge.level) {
      const unlockBadge = GIFTER_BADGES.find((badge) => badge.level === gift.unlockBadgeLevel) || GIFTER_BADGES[0];
      pushNotice(`Unlock ${unlockBadge.name} to send ${gift.name}.`);
      return;
    }

    const pending = pendingGiftComboRef.current;

    if (pending && pending.giftId === giftId && pending.recipientId === selectedRecipientId) {
      pendingGiftComboRef.current = {
        ...pending,
        quantity: clamp(pending.quantity + 1, 1, 99),
      };
    } else {
      flushPendingGiftCombo();
      pendingGiftComboRef.current = {
        giftId,
        recipientId: selectedRecipientId,
        quantity: 1,
      };
    }

    const quantity = pendingGiftComboRef.current?.quantity || 1;
    setGiftComboGiftId(giftId);
    setGiftComboCount(quantity);
    setSelectedGiftId(giftId);

    if (giftComboTimerRef.current !== null) {
      window.clearTimeout(giftComboTimerRef.current);
    }

    giftComboTimerRef.current = window.setTimeout(() => {
      giftComboTimerRef.current = null;
      flushPendingGiftCombo();
    }, 650);
  };

  // Simulated checkout for local development; this credits coins after lightweight card validation.
  const handleRechargeSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const sanitizedNumber = sanitizeCardNumber(cardNumber);
    const sanitizedExpiry = sanitizeExpiry(cardExpiry);
    const sanitizedPin = sanitizeCvv(cardCvv);
    const holder = cardHolderName.trim();

    if (!holder || sanitizedNumber.length < 16 || sanitizedExpiry.length < 4 || sanitizedPin.length < 3) {
      pushNotice('Enter a valid card holder name, card number, expiry, and CVV.', 'error');
      return;
    }

    setIsProcessingRecharge(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));

    const creditedCoins = selectedCoinPack.coins + selectedCoinPack.bonusCoins;
    setCoinBalance((previous) => previous + creditedCoins);
    setIsProcessingRecharge(false);
    setIsRechargeOpen(false);
    pushNotice(`Wallet recharged: +${creditedCoins} coins (${selectedCoinPack.label}).`, 'success');

    setCardHolderName('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
  };

  const leaveClassroom = () => {
    if (giftComboTimerRef.current !== null) {
      window.clearTimeout(giftComboTimerRef.current);
      giftComboTimerRef.current = null;
    }
    flushPendingGiftCombo();
    setStreamStatus('ended');
    stopLocalStream();
    closeAllPeerConnections();
    if (typeof window !== 'undefined' && isTeacher && teacherActor === 'school') {
      window.sessionStorage.removeItem(`edamaa_teacher_access_${liveClass.id}`);
    }
    navigate(isTeacher ? (teacherActor === 'school' ? '/school-dashboard' : '/tutor-dashboard') : '/join-class');
  };

  const handleClassroomExit = () => {
    // Keep one exit flow, but present host/student intent clearly in the UI.
    if (isTeacher) {
      pushNotice('Ending class for all participants...');
    }
    leaveClassroom();
  };

  const exitButtonLabel = isTeacher ? 'End Class' : 'Leave Class';
  const teacherExitRoute = teacherActor === 'school' ? '/school-dashboard' : '/tutor-dashboard';

  const teacher = participants.find((participant) => participant.id === teacherId) || teacherPlaceholder;
  const shouldShowTeacherLocalVideo = isTeacher && cameraOn && !!localStreamRef.current;
  const shouldShowTeacherRemoteVideo = !isTeacher && !!remoteTeacherStream;
  const promptedLiveClasswork =
    activeLiveClasswork && activeClassworkPromptId === activeLiveClasswork.id ? activeLiveClasswork : null;
  const hotQuestion =
    hotQuestionId && hotQuestionEndsAtMs
      ? questionQueue.find((question) => question.id === hotQuestionId) || null
      : null;
  const hotQuestionRemainingMs = hotQuestionEndsAtMs ? Math.max(0, hotQuestionEndsAtMs - liveNowMs) : 0;
  const cooldownStudentId =
    lastHotQuestionRef.current && liveNowMs - lastHotQuestionRef.current.atMs < hotCooldownMs
      ? lastHotQuestionRef.current.studentId
      : null;
  const noticeTone = notice?.type ?? 'info';
  const noticeClass =
    noticeTone === 'success'
      ? 'border-emerald-300/40 bg-emerald-500/10 text-emerald-100'
      : noticeTone === 'warning'
      ? 'border-amber-300/40 bg-amber-500/10 text-amber-100'
      : noticeTone === 'error'
      ? 'border-red-300/40 bg-red-500/10 text-red-100'
      : 'border-[#F68C29]/40 bg-[#F68C29]/10 text-[#ffe4cf]';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(HOT_COOLDOWN_STORAGE_KEY, String(hotCooldownMs));
    window.localStorage.setItem(classCooldownKey, String(hotCooldownMs));
  }, [classCooldownKey, hotCooldownMs]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(AUTO_HOT_STORAGE_KEY, autoHotEnabled ? 'true' : 'false');
    window.localStorage.setItem(classAutoHotKey, autoHotEnabled ? 'true' : 'false');
  }, [autoHotEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(REACTION_SET_STORAGE_KEY, reactionSetKey);
    window.localStorage.setItem(classReactionSetKey, reactionSetKey);
  }, [classReactionSetKey, reactionSetKey]);

  useEffect(() => {
    if (!isTeacher || !autoHotEnabled) {
      return;
    }

    if (hotQuestionRemainingMs > 0) {
      return;
    }

    const nextCandidate = getNextHotQuestion(questionQueue);
    if (nextCandidate) {
      startHotQuestion(nextCandidate);
    }
  }, [autoHotEnabled, hotQuestionRemainingMs, isTeacher, questionQueue, startHotQuestion]);

  useEffect(() => {
    if (!settingsToastVisible) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setSettingsToastVisible(false);
    }, 2200);
    return () => window.clearTimeout(timeout);
  }, [settingsToastVisible]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    if (notice.type !== 'info' && notice.type !== 'success') {
      return;
    }
    const timeout = window.setTimeout(() => {
      clearNotice();
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  return (
    <div className="min-h-screen bg-linear-to-br from-[#080812] via-[#0f1024] to-[#15173a] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090a1a]/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-3 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(isTeacher ? teacherExitRoute : '/join-class')}
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 p-2 hover:bg-white/10 transition-colors"
              aria-label="Back to class list"
              title="Back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            {schoolBranding && (
              <div className="hidden h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-white/8 shadow-[0_10px_24px_rgba(15,23,42,0.18)] sm:flex">
                {schoolBranding.logoDataUrl ? (
                  <img
                    src={schoolBranding.logoDataUrl}
                    alt={schoolBranding.schoolName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold tracking-[0.18em] text-white/85">
                    {schoolBranding.initials}
                  </span>
                )}
              </div>
            )}
            <div className="min-w-0">
              {schoolBranding && (
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  {schoolBranding.schoolName}
                </p>
              )}
              <h1 className="truncate text-sm font-bold sm:text-base">{liveClass.name}</h1>
              <p className="truncate text-[11px] text-white/70 sm:text-xs">
                {liveClass.code} • {liveClass.subject} • {liveClass.duration}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/90 px-2.5 py-1 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></span>
              LIVE
            </span>
            <span className="hidden rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] sm:inline-flex">
              {viewerCount} watching
            </span>
            <span className="hidden rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] sm:inline-flex">
              {isTeacher ? 'Host Mode' : 'Learner Mode'}
            </span>
          </div>
        </div>
      </header>

      {isTeacher && isTeacherSubscriptionChecking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#121436] p-5 text-center">
            <p className="text-sm font-semibold text-white">Checking your teaching subscription...</p>
            <p className="mt-1 text-xs text-white/70">
              Please wait while Edamaa validates your live-class access.
            </p>
          </div>
        </div>
      )}

      {isTeacher && !isTeacherSubscriptionChecking && isTeacherSubscriptionLocked && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-[#121436] p-5">
            <h2 className="text-lg font-bold text-white">Live Class Access Locked</h2>
            <p className="mt-2 text-sm text-white/80">
              {teacherSubscriptionLockReason || 'Activate Edamaa Pro to host live classes.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate(`/subscription?actor=${teacherActor}`)}
                className="rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2c0691]"
              >
                Open Subscription
              </button>
              <button
                onClick={() => navigate(teacherExitRoute)}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {isTeacher && showTeacherWelcome && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-[#121436] p-6 text-white shadow-xl">
            <h2 className="text-lg font-bold text-white">
              Welcome, {selfParticipant.name}
            </h2>
            <p className="mt-2 text-sm text-white/80">
              You’re hosting <span className="font-semibold">{liveClass.name}</span>.
            </p>
            <p className="mt-1 text-xs text-white/60">
              {liveClass.subject} • {liveClass.duration}
            </p>

            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/70">
              <p className="font-semibold text-white/90">Quick controls</p>
              <ul className="mt-2 space-y-1">
                <li>Invite students to the stage when they raise hands.</li>
                <li>Mute or remove participants from stage if needed.</li>
                <li>Use chat + classwork prompts to keep engagement high.</li>
              </ul>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => setShowTeacherWelcome(false)}
                className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {isTeacher && isLinkedAssignmentComposerOpen && (
        <div className="fixed inset-0 z-[68] flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/15 bg-[#0f1735] text-white shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
                    Linked homework
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Create post-class task</h2>
                  <p className="mt-2 text-sm text-white/70">
                    This homework is tied to <span className="font-semibold text-white">{liveClass.name}</span> and will open when this class session ends.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeLinkedAssignmentComposer}
                  className="rounded-full border border-white/15 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close linked homework composer"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_320px]">
              <div className="space-y-4 px-5 py-5 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/85">Task title</span>
                    <input
                      value={linkedAssignmentDraft.title}
                      onChange={(event) =>
                        setLinkedAssignmentDraft((current) => ({ ...current, title: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-300/35 focus:bg-white/10"
                      placeholder="e.g. Fractions follow-up homework"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/85">Subject</span>
                    <input
                      value={linkedAssignmentDraft.subject}
                      onChange={(event) =>
                        setLinkedAssignmentDraft((current) => ({ ...current, subject: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-300/35 focus:bg-white/10"
                      placeholder="Subject"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/85">Department</span>
                    <input
                      value={linkedAssignmentDraft.department}
                      onChange={(event) =>
                        setLinkedAssignmentDraft((current) => ({ ...current, department: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-300/35 focus:bg-white/10"
                      placeholder={isLinkedAssignmentSessionLoading ? 'Loading class details...' : 'e.g. Science'}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/85">Class</span>
                    <input
                      value={linkedAssignmentDraft.classGroup}
                      onChange={(event) =>
                        setLinkedAssignmentDraft((current) => ({ ...current, classGroup: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-300/35 focus:bg-white/10"
                      placeholder={isLinkedAssignmentSessionLoading ? 'Loading class details...' : 'e.g. JSS 2A'}
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/85">Due date and time</span>
                    <input
                      type="datetime-local"
                      value={linkedAssignmentDraft.dueAt}
                      onChange={(event) =>
                        setLinkedAssignmentDraft((current) => ({ ...current, dueAt: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/35 focus:bg-white/10"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-white/85">Marks</span>
                    <input
                      type="number"
                      min={1}
                      value={linkedAssignmentDraft.points}
                      onChange={(event) =>
                        setLinkedAssignmentDraft((current) => ({
                          ...current,
                          points: Math.max(1, Number(event.target.value) || 0),
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/35 focus:bg-white/10"
                    />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white/85">Short summary</span>
                  <textarea
                    rows={3}
                    value={linkedAssignmentDraft.description}
                    onChange={(event) =>
                      setLinkedAssignmentDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-300/35 focus:bg-white/10"
                    placeholder="Tell students what this homework is about."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white/85">Homework instructions</span>
                  <textarea
                    rows={6}
                    value={linkedAssignmentDraft.content}
                    onChange={(event) =>
                      setLinkedAssignmentDraft((current) => ({ ...current, content: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-300/35 focus:bg-white/10"
                    placeholder="Explain what students should do after class."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white/85">Checklist</span>
                  <textarea
                    rows={4}
                    value={linkedAssignmentDraft.checklistText}
                    onChange={(event) =>
                      setLinkedAssignmentDraft((current) => ({ ...current, checklistText: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-300/35 focus:bg-white/10"
                    placeholder={'One item per line, for example:\nShow your working\nUpload one PDF'}
                  />
                </label>
              </div>

              <aside className="border-t border-white/10 bg-white/[0.03] px-5 py-5 lg:border-l lg:border-t-0 sm:px-6">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/75">
                    Release preview
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-white">
                    {linkedAssignmentDraft.title || 'Homework title'}
                  </h3>
                  <p className="mt-2 text-sm text-white/65">
                    {[linkedAssignmentDraft.subject || 'Subject', linkedAssignmentDraft.department || 'Department', linkedAssignmentDraft.classGroup || 'Class'].join(' • ')}
                  </p>

                  <div className="mt-4 space-y-3 text-sm text-white/75">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="font-medium text-white">Session link</p>
                      <p className="mt-1 text-white/65">{liveClass.name}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="font-medium text-white">When students see it</p>
                      <p className="mt-1 text-white/65">
                        {linkedAssignmentSession?.status === 'completed'
                          ? 'This class already ended, so students can see it as soon as you create it.'
                          : 'Students will see this automatically when the current class ends.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="font-medium text-white">Due</p>
                      <p className="mt-1 text-white/65">
                        {linkedAssignmentDraft.dueAt
                          ? formatLiveDateTime(new Date(linkedAssignmentDraft.dueAt).toISOString())
                          : 'Choose a due date'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="font-medium text-white">Submission type</p>
                      <p className="mt-1 text-white/65">{linkedAssignmentDraft.points} marks • note or file submission</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeLinkedAssignmentComposer}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateLinkedAssignment()}
                disabled={isLinkedAssignmentSaving}
                className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLinkedAssignmentSaving ? 'Creating...' : 'Create linked homework'}
              </button>
            </div>
          </div>
        </div>
      )}

      {giftingEnabled && giftNotifications.length > 0 && (
        <div className="pointer-events-none fixed right-3 top-20 z-50 w-[min(90vw,360px)] space-y-2">
          {giftNotifications.map((notification) => (
            <article
              key={notification.id}
              className={`gift-notification flex items-center gap-2 rounded-xl border border-white/20 bg-linear-to-r ${notification.accentClass} p-2 shadow-xl`}
            >
              <img src={notification.iconUrl} alt={notification.title} className="h-10 w-10 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{notification.title}</p>
                <p className="truncate text-[11px] text-white/85">{notification.subtitle}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {giftingEnabled && advancedGiftSpotlight && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"></div>
          <article
            className={`advanced-gift-spotlight relative w-[min(92vw,540px)] overflow-hidden rounded-3xl border border-white/30 bg-linear-to-br ${advancedGiftSpotlight.accentClass} p-5 text-white shadow-2xl`}
          >
            <div className="advanced-gift-aura absolute inset-0"></div>
            <div className="advanced-gift-orbit absolute inset-0">
              <span className="advanced-gift-orb advanced-gift-orb-one"></span>
              <span className="advanced-gift-orb advanced-gift-orb-two"></span>
              <span className="advanced-gift-orb advanced-gift-orb-three"></span>
            </div>
            <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-white/20 blur-2xl"></div>
            <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-black/20 blur-2xl"></div>
            <div className="relative">
              <p className="inline-flex items-center gap-1 rounded-full bg-black/30 px-3 py-1 text-[11px] font-semibold">
                <SparklesIcon className="h-3.5 w-3.5" />
                Advanced Gift Animation
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="relative">
                  <span className="advanced-gift-ping absolute inset-0 rounded-2xl border border-white/45"></span>
                  <img
                    src={advancedGiftSpotlight.iconUrl}
                    alt={advancedGiftSpotlight.giftName}
                    className="relative h-20 w-20 rounded-2xl border border-white/25 object-cover"
                  />
                </div>
                <div>
                  <p className="text-lg font-bold">{advancedGiftSpotlight.giftName}</p>
                  <p className="text-sm text-white/90">
                    {advancedGiftSpotlight.senderName} sent x{advancedGiftSpotlight.quantity} to{' '}
                    {advancedGiftSpotlight.recipientName}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      )}

      {spotlightQuestion && (
        <div className="fixed inset-x-0 top-2 z-40 flex justify-center px-3">
          <article className="w-[min(92vw,720px)] rounded-2xl border border-amber-300/40 bg-amber-500/15 px-4 py-3 text-amber-50 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/80">Spotlight Question</p>
                <p className="text-sm font-semibold">{spotlightQuestion.studentName}</p>
                <p className="mt-1 text-xs text-amber-50/90">{spotlightQuestion.text}</p>
              </div>
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => resolveLiveQuestion(spotlightQuestion)}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 px-3 py-1 text-[11px] font-semibold text-amber-50 hover:bg-amber-500/35"
                >
                  Resolve
                </button>
              )}
            </div>
          </article>
        </div>
      )}

      {hotQuestion && hotQuestionRemainingMs > 0 && (
        <div className="fixed inset-x-0 top-24 z-40 flex justify-center px-3">
          <article className="w-[min(92vw,720px)] rounded-2xl border border-sky-300/40 bg-sky-500/15 px-4 py-2.5 text-sky-50 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-sky-100/80">Hot Question</p>
                <p className="text-sm font-semibold">{hotQuestion.studentName}</p>
                <p className="mt-1 text-xs text-sky-50/90">{hotQuestion.text}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-sky-100/80">Time left</p>
                <p className="text-sm font-semibold">{formatCountdown(hotQuestionRemainingMs)}</p>
              </div>
            </div>
          </article>
        </div>
      )}

      <main className="mx-auto grid w-full max-w-[1400px] gap-5 px-3 py-5 pb-24 sm:px-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0b1f] shadow-2xl shadow-[#090b2f]/40">
            <div className="relative aspect-video overflow-hidden bg-linear-to-br from-[#26155f] via-[#191c4b] to-[#1a2a61]">
              <div className="absolute -left-14 -top-16 h-48 w-48 rounded-full bg-[#F68C29]/20 blur-3xl"></div>
              <div className="absolute -right-16 top-10 h-48 w-48 rounded-full bg-[#3D08BA]/40 blur-3xl"></div>

              {streamStatus === 'ended' ? (
                <div className="relative z-10 flex h-full items-center justify-center text-center">
                  <div>
                    <h3 className="text-xl font-bold">Class Ended</h3>
                    <p className="mt-2 text-sm text-white/70">The stream has ended for this session.</p>
                  </div>
                </div>
              ) : shouldShowTeacherLocalVideo ? (
                <video
                  ref={stageLocalVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="relative z-10 h-full w-full object-cover"
                />
              ) : shouldShowTeacherRemoteVideo ? (
                <video
                  ref={stageRemoteVideoRef}
                  autoPlay
                  playsInline
                  className="relative z-10 h-full w-full object-cover"
                />
              ) : (
                <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
                  <div className="mb-4 h-24 w-24 overflow-hidden rounded-full border-4 border-white/30 shadow-lg shadow-black/30">
                    <img
                      src={teacher.avatar || buildFallbackAvatar(teacher.name)}
                      alt={teacher.name}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = buildFallbackAvatar(teacher.name);
                      }}
                    />
                  </div>
                  <p className="text-xl font-semibold sm:text-2xl">{teacher.name}</p>
                  <p className="mt-1 text-xs text-white/75 sm:text-sm">Teaching live now: {liveClass.subject}</p>
                  <p className="mt-3 max-w-2xl text-xs text-white/65 sm:text-sm">{liveClass.description}</p>
                  <p className="mt-3 rounded-full bg-black/35 px-3 py-1 text-[11px] text-white/80">
                    {isTeacher
                      ? 'Turn on camera or microphone to start broadcasting now.'
                      : 'Waiting for tutor media feed... this connects as soon as host goes live.'}
                  </p>

                  {screenShared && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/50 bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-100">
                      <PresentationChartBarIcon className="h-4 w-4" />
                      Screen share is active
                    </div>
                  )}
                </div>
              )}

              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold">LIVE</span>
                <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/90">{viewerCount} viewers</span>
              </div>

              <div className="absolute right-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/90">
                {formatClockTime(new Date().toISOString())}
              </div>

              <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[11px] text-white/90">
                <HeartIcon className="h-3.5 w-3.5 text-rose-300" />
                {likesCount.toLocaleString()} likes
              </div>

              <div className="absolute bottom-3 right-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/35 px-2 py-1">
                    {reactionPalette.map((reaction) => (
                      <button
                        key={reaction.emoji}
                        type="button"
                        onClick={() => sendReaction(reaction.emoji)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-sm transition-transform hover:scale-105 hover:bg-white/20"
                        aria-label={reaction.label}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={sendLike}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-300/40 bg-rose-500/25 px-3 py-1 text-xs font-semibold text-rose-50 hover:bg-rose-500/35 transition-colors"
                  >
                    <HeartIcon className="h-4 w-4" />
                    Tap ❤️
                  </button>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {floatingReactions.map((reaction) => (
                  <div
                    key={reaction.id}
                    className={`gift-float absolute bottom-4 rounded-full bg-linear-to-r ${reaction.accentClass} px-2.5 py-1 text-xs font-bold text-white shadow-xl`}
                    style={{ right: `${16 + reaction.lane * 52}px` }}
                  >
                    {reaction.label}
                  </div>
                ))}
              </div>

              {giftingEnabled && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  {floatingGifts.map((gift) => (
                    <div
                      key={gift.id}
                      className={`gift-float absolute bottom-4 rounded-full bg-linear-to-r ${gift.accentClass} px-3 py-1 text-xs font-bold text-white shadow-xl`}
                      style={{ right: `${16 + gift.lane * 52}px` }}
                    >
                      {gift.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-black/25 p-3 sm:grid-cols-3 lg:grid-cols-6">
              <button
                onClick={toggleMic}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  micOn
                    ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-100'
                    : 'border-red-400/30 bg-red-400/15 text-red-100'
                } ${!isTeacher ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span className="mx-auto mb-1 block w-fit">
                  {micOn ? <MicrophoneIcon className="h-4 w-4" /> : <NoSymbolIcon className="h-4 w-4" />}
                </span>
                {micOn ? 'Mute' : 'Unmute'}
              </button>

              <button
                onClick={toggleCamera}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  cameraOn
                    ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-100'
                    : 'border-red-400/30 bg-red-400/15 text-red-100'
                } ${!isTeacher ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span className="mx-auto mb-1 block w-fit">
                  {cameraOn ? <VideoCameraIcon className="h-4 w-4" /> : <VideoCameraSlashIcon className="h-4 w-4" />}
                </span>
                {cameraOn ? 'Camera On' : 'Camera Off'}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  screenShared
                    ? 'border-cyan-400/35 bg-cyan-400/15 text-cyan-100'
                    : 'border-white/20 bg-white/10 text-white/85 hover:bg-white/15'
                } ${!isTeacher ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span className="mx-auto mb-1 block w-fit">
                  <PresentationChartBarIcon className="h-4 w-4" />
                </span>
                Share
              </button>

              <button
                onClick={toggleHandRaise}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  handRaised
                    ? 'border-amber-400/40 bg-amber-400/20 text-amber-50'
                    : 'border-white/20 bg-white/10 text-white/85 hover:bg-white/15'
                }`}
              >
                <span className="mx-auto mb-1 block w-fit">
                  <HandRaisedIcon className="h-4 w-4" />
                </span>
                {handRaised ? 'Lower Hand' : 'Raise Hand'}
              </button>

              {giftingEnabled && (
                <button
                  onClick={() => queueGiftTap(selectedGiftId)}
                  className="rounded-xl border border-[#F68C29]/40 bg-[#F68C29]/20 px-3 py-2 text-xs font-semibold text-[#ffe6cf] hover:bg-[#F68C29]/30 transition-colors"
                >
                  <span className="mx-auto mb-1 block w-fit">
                    <GiftTopIcon className="h-4 w-4" />
                  </span>
                  Quick School Gift
                </button>
              )}

              <button
                onClick={handleClassroomExit}
                className="rounded-xl border border-red-400/45 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/30 transition-colors"
              >
                <span className="mx-auto mb-1 block w-fit">
                  <PhoneXMarkIcon className="h-4 w-4" />
                </span>
                {exitButtonLabel}
              </button>
            </div>

            {!isTeacher && (
              <div className="border-t border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] text-white/65">
                Learner mode: stream controls are managed by the tutor. Use Raise Hand to request interaction.
              </div>
            )}

            {/* Session snapshot keeps the key classroom metrics visible without opening side panels. */}
            <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-white/[0.03] p-3 sm:grid-cols-4">
              <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-white/55">Audience</p>
                <p className="mt-1 text-sm font-semibold text-white">{viewerCount}</p>
              </article>
              <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-white/55">On Stage</p>
                <p className="mt-1 text-sm font-semibold text-white">{onStageParticipants.length}</p>
              </article>
              <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-white/55">Reactions</p>
                <p className="mt-1 text-sm font-semibold text-white">{likesCount.toLocaleString()} likes</p>
              </article>
              <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-white/55">Wallet</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-white">
                  <img src={GIFT_COIN_ICON_URL} alt="Coin" className="h-3.5 w-3.5" />
                  {coinBalance.toLocaleString()}
                </p>
              </article>
            </div>
          </div>

          {mediaError && (
            <div className="rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {mediaError}
            </div>
          )}

          {notice && (
            <div className={`animate-toast flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${noticeClass}`}>
              <span className="min-w-0">{notice.text}</span>
              {(notice.type === 'warning' || notice.type === 'error') && (
                <button
                  type="button"
                  onClick={clearNotice}
                  aria-label="Dismiss notice"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-white/10 text-[10px] font-semibold text-white/80 hover:bg-white/20"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {shouldShowStudentAttendanceCard && schoolAttendanceState && (
            <div
              className={`rounded-2xl border p-4 ${
                hasAttendanceCheckIn
                  ? isLateAttendance
                    ? 'border-amber-300/35 bg-amber-500/10'
                    : 'border-emerald-300/35 bg-emerald-500/10'
                  : isAttendanceWindowOpen
                    ? 'border-[#F68C29]/35 bg-[#F68C29]/10'
                    : 'border-amber-300/30 bg-amber-500/10'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Class attendance</p>
                  <h2 className="mt-2 text-sm font-semibold text-white">
                    {hasAttendanceCheckIn
                      ? isLateAttendance
                        ? 'Attendance recorded as late'
                        : 'Attendance recorded'
                      : isAttendanceWindowOpen
                        ? 'Attendance is open'
                        : 'Attendance is closed'}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-white/75">
                    {hasAttendanceCheckIn
                      ? isLateAttendance
                        ? `You checked in at ${formatClockTime(selfAttendanceRecord?.checkedInAt || new Date().toISOString())} after the ${schoolAttendanceState.window.gracePeriodMinutes}-minute grace period.`
                        : `You checked in at ${formatClockTime(selfAttendanceRecord?.checkedInAt || new Date().toISOString())}.`
                      : isAttendanceWindowOpen
                        ? `Tap once to confirm you are present in this live class. Check-ins after ${schoolAttendanceState.window.gracePeriodMinutes} minutes are marked late.`
                        : 'The attendance window has closed. Reach out to your teacher if you were missed.'}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-white/75">
                  {schoolAttendanceState.summary.checkedInCount} checked in
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Checked in</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {schoolAttendanceState.summary.checkedInCount}
                  </p>
                </article>
                <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Late</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {schoolAttendanceState.summary.lateCount}
                  </p>
                </article>
                <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Pending</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {schoolAttendanceState.summary.pendingCount}
                  </p>
                </article>
                <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Connected</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {schoolAttendanceState.summary.liveCount}
                  </p>
                </article>
                <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Coverage</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {schoolAttendanceState.summary.attendanceRate}%
                  </p>
                </article>
              </div>

              {!hasAttendanceCheckIn && isAttendanceWindowOpen && (
                <button
                  type="button"
                  onClick={() => void handleStudentAttendanceCheckIn()}
                  disabled={attendanceActionState === 'check_in'}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F68C29] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#e67e22] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <BookmarkIcon className="h-4 w-4" />
                  {attendanceActionState === 'check_in' ? 'Recording attendance...' : 'Mark present'}
                </button>
              )}
            </div>
          )}

          {!isTeacher && activeLiveClasswork && (
            <div className="rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-cyan-100 sm:text-base">{activeLiveClasswork.title}</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-400/20 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {formatCountdown(activeLiveClasswork.remainingMs || 0)} left
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-cyan-50/95 sm:text-sm">{activeLiveClasswork.content}</p>
              <ul className="mt-2 space-y-1 text-[11px] text-cyan-100/90 sm:text-xs">
                {activeLiveClasswork.checklist.map((item) => (
                  <li key={`${activeLiveClasswork.id}-${item}`} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-cyan-200"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => navigate('/assignments')}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-400/20 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition-colors hover:bg-cyan-400/30"
                >
                  Open Classwork
                </button>
              </div>
            </div>
          )}

          {!isTeacher && !activeLiveClasswork && nextLiveClasswork && streamStatus !== 'ended' && (
            <div className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-white/80">
              Next classwork starts in{' '}
              <span className="font-semibold text-cyan-100">
                {formatCountdown(nextLiveClasswork.startAtMs - liveNowMs)}
              </span>
              . Stay in class to complete it live.
            </div>
          )}

          {shouldShowLinkedAssignmentsPanel && (
            <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-emerald-100 sm:text-base">Class Homework</h2>
                <span className="rounded-full border border-emerald-300/35 bg-emerald-300/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                  {releasedLinkedAssignments.length > 0 ? 'Now available' : 'Opens after class'}
                </span>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-emerald-100/85 sm:text-sm">
                {isTeacher
                  ? releasedLinkedAssignments.length > 0
                    ? 'These are the real homework tasks linked to this class session.'
                    : 'Linked homework stays locked until this class ends, then students will see it automatically.'
                  : releasedLinkedAssignments.length > 0
                    ? 'These homework tasks are now open because the linked class has ended.'
                    : 'Homework linked to this class will open automatically once the class ends.'}
              </p>
              <div className="space-y-3">
                {isLinkedAssignmentsLoading ? (
                  <div className="rounded-xl border border-emerald-200/30 bg-black/20 p-3 text-xs text-emerald-50/95 sm:text-sm">
                    Loading linked homework...
                  </div>
                ) : linkedPostClassAssignments.length > 0 ? (
                  linkedPostClassAssignments.map((assignment) => (
                    <article
                      key={assignment.id}
                      className="rounded-xl border border-emerald-200/30 bg-black/20 p-3 text-xs text-emerald-50/95 sm:text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-emerald-100">{assignment.title}</h3>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-emerald-100/70">
                            {assignment.type === 'classwork' ? 'Classwork' : 'Homework'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            assignment.isReleased
                              ? 'border border-emerald-200/40 bg-emerald-300/20 text-emerald-50'
                              : 'border border-white/15 bg-white/10 text-emerald-100/80'
                          }`}
                        >
                          {assignment.isReleased ? 'Open now' : 'Waiting for class end'}
                        </span>
                      </div>
                      <p className="mt-2 leading-relaxed">{assignment.content}</p>
                      <ul className="mt-2 space-y-1 text-[11px] text-emerald-100/90 sm:text-xs">
                        {assignment.checklist.map((item) => (
                          <li key={`${assignment.id}-${item}`} className="flex items-start gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-200"></span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-emerald-100/80">
                        <span>Due: {formatLiveDateTime(assignment.dueAt)}</span>
                        {assignment.releaseMode === 'on_class_end' ? (
                          <span>
                            Class status:{' '}
                            {assignment.linkedSessionStatus === 'completed'
                              ? 'ended'
                              : assignment.linkedSessionStatus === 'live'
                                ? 'live'
                                : 'upcoming'}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-xl border border-emerald-200/20 bg-black/20 p-3 text-xs text-emerald-100/80 sm:text-sm">
                    No homework has been linked to this class yet.
                  </div>
                )}
              </div>
              {isTeacher ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canManageLinkedAssignments ? (
                    <>
                      <button
                        type="button"
                        onClick={openLinkedAssignmentComposer}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition-colors hover:bg-emerald-400/30"
                      >
                        {linkedPostClassAssignments.length > 0 ? 'Add linked homework' : 'Create linked homework'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(teacherActor === 'school' ? '/school-assignments' : '/tutor-assignments')
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 transition-colors hover:bg-white/15"
                      >
                        Open homework hub
                      </button>
                    </>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-[11px] text-emerald-100/85">
                      Start this class from the {teacherActor === 'school' ? 'school' : 'tutor'} dashboard if you want
                      to attach homework directly inside the live room.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/assignments?sessionId=${encodeURIComponent(liveClass.id)}`)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition-colors hover:bg-emerald-400/30"
                  >
                    Open Assignments
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold sm:text-base">Participants ({activeParticipants.length})</h2>
              <span className="text-[11px] text-white/65">Live classroom grid</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {activeParticipants.slice(0, 8).map((participant) => (
                <article
                  key={participant.id}
                  className="relative overflow-hidden rounded-xl border border-white/15 bg-black/30 p-2.5"
                >
                  <div className="mb-2 h-24 overflow-hidden rounded-lg border border-white/10 bg-[#10102a]">
                    <img
                      src={participant.avatar || buildFallbackAvatar(participant.name)}
                      alt={participant.name}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = buildFallbackAvatar(participant.name);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-white/95">{participant.name}</p>
                    <div className="flex items-center gap-1">
                      {participant.handRaised && (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/30 text-amber-100">
                          <HandRaisedIcon className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                          participant.muted ? 'bg-red-500/25 text-red-100' : 'bg-emerald-500/25 text-emerald-100'
                        }`}
                      >
                        {participant.muted ? (
                          <NoSymbolIcon className="h-3.5 w-3.5" />
                        ) : (
                          <MicrophoneIcon className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </div>
                  </div>

                  <p className="mt-1 text-[10px] uppercase tracking-wide text-white/55">
                    {participant.role === 'teacher'
                      ? 'Teacher'
                      : onStageParticipantIds.includes(participant.id)
                      ? participant.isSelf
                        ? 'You • On Stage'
                        : 'On Stage'
                      : participant.isSelf
                      ? 'You'
                      : 'Student'}
                  </p>
                </article>
              ))}
            </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold sm:text-base">Live Stage</h2>
              <span className="text-[11px] text-white/65">{onStageParticipants.length} on stage</span>
            </div>

            {isTeacher ? (
              <div className="space-y-3">
                <p className="text-[11px] text-white/70">
                  Invite students to the stage for questions and live discussion. Students with raised hands are shown first.
                </p>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-white/55">Stage Queue</p>
                    <p className="text-xs text-white/80">
                      {raisedHandStudents.length === 0
                        ? 'No hands raised'
                        : `${raisedHandStudents.length} waiting to speak`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (raisedHandStudents[0]) {
                        void inviteStudentToStage(raisedHandStudents[0].id);
                      }
                    }}
                    disabled={raisedHandStudents.length === 0}
                    className="inline-flex items-center gap-1 rounded-md bg-[#F68C29] px-2.5 py-1 text-[11px] font-semibold text-white disabled:bg-white/15 disabled:text-white/50"
                  >
                    <UserPlusIcon className="h-3.5 w-3.5" />
                    Invite Next
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                  <p className="mb-2 text-[11px] font-semibold text-white/80">Raised Hand Requests</p>
                  {raisedHandStudents.length === 0 ? (
                    <p className="text-[11px] text-white/55">No raised hands right now.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {raisedHandStudents.slice(0, 6).map((student) => (
                        <div key={student.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5">
                          <p className="truncate text-xs text-white/90">{student.name}</p>
                          <button
                            type="button"
                            onClick={() => void inviteStudentToStage(student.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-[#3D08BA] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#2b0690]"
                          >
                            <UserPlusIcon className="h-3.5 w-3.5" />
                            Invite
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                  <p className="mb-2 text-[11px] font-semibold text-white/80">On Stage</p>
                  {onStageParticipants.length === 0 ? (
                    <p className="text-[11px] text-white/55">No student is currently on stage.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {onStageParticipants.map((student) => (
                        <div key={student.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5">
                          <p className="truncate text-xs text-white/90">{student.name}</p>
                          <button
                            type="button"
                            onClick={() => void removeStudentFromStage(student.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-400/45 bg-red-500/20 px-2 py-1 text-[11px] font-semibold text-red-100 hover:bg-red-500/30"
                          >
                            <UserMinusIcon className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                  <p className="mb-2 text-[11px] font-semibold text-white/80">Pending Invites</p>
                  {pendingStageInvites.filter((invite) => invite.status === 'pending').length === 0 ? (
                    <p className="text-[11px] text-white/55">No pending stage invites.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {pendingStageInvites
                        .filter((invite) => invite.status === 'pending')
                        .slice(0, 6)
                        .map((invite) => (
                          <div key={invite.inviteId} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5">
                            <p className="truncate text-xs text-white/90">{invite.studentName}</p>
                            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                              Pending
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                  <p className="mb-2 text-[11px] font-semibold text-white/80">Invite From Audience</p>
                  {invitableStudents.length === 0 ? (
                    <p className="text-[11px] text-white/55">No additional students available to invite.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {invitableStudents.slice(0, 6).map((student) => (
                        <div key={student.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5">
                          <p className="truncate text-xs text-white/90">{student.name}</p>
                          <button
                            type="button"
                            onClick={() => void inviteStudentToStage(student.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
                          >
                            <UserPlusIcon className="h-3.5 w-3.5" />
                            Invite
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-white/70">
                  Raise your hand to request stage access. Tutor can invite you up for live questions.
                </p>
                <div className="rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-50">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-amber-100">Ask to Speak</p>
                      <p className="text-[11px] text-amber-50/85">
                        Request to join the stage for your question.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleHandRaise}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                        handRaised
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F68C29] text-white hover:bg-[#e67e22]'
                      }`}
                    >
                      <HandRaisedIcon className="h-3.5 w-3.5" />
                      {handRaised ? 'Lower' : 'Request'}
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px]">
                  {isSelfOnStage ? (
                    <p className="font-semibold text-emerald-200">You are currently on stage for Q&A.</p>
                  ) : (
                    <p className="text-white/65">You are in the audience. Tap Raise Hand to request to speak.</p>
                  )}
                </div>
                {onStageParticipants.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <p className="mb-2 text-[11px] font-semibold text-white/80">Current Stage Speakers</p>
                    <div className="space-y-1.5">
                      {onStageParticipants.map((participant) => (
                        <p key={participant.id} className="truncate rounded-lg bg-white/[0.04] px-2 py-1.5 text-xs text-white/90">
                          {participant.name}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
          <div className="rounded-2xl border border-white/10 bg-linear-to-r from-[#0f122a] via-[#161b37] to-[#1d1733] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Engagement Hub</p>
            <p className="mt-1 text-xs text-white/80">
              Manage chat{giftingEnabled ? ', gifting,' : ''} and room interactions from this panel.
            </p>
          </div>

          {shouldShowTeacherAttendanceCard && (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-100/70">
                    Live attendance
                  </p>
                  <h3 className="mt-2 text-sm font-semibold text-white">
                    {schoolAttendanceState?.window.isOpen ? 'Attendance is open' : 'Attendance is closed'}
                  </h3>
                  <p className="mt-1 text-[11px] leading-5 text-white/75">
                    Open attendance when you want students to confirm presence from inside the live room.
                    Students who confirm after {schoolAttendanceState?.window.gracePeriodMinutes || 5} minutes are
                    marked late automatically.
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    schoolAttendanceState?.window.isOpen
                      ? 'bg-emerald-400/20 text-emerald-100'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {schoolAttendanceState?.window.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Checked in</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {schoolAttendanceState?.summary.checkedInCount || 0}
                  </p>
                </article>
                <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Late</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {schoolAttendanceState?.summary.lateCount || 0}
                  </p>
                </article>
                <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Pending</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {schoolAttendanceState?.summary.pendingCount || 0}
                  </p>
                </article>
                <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Connected</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {schoolAttendanceState?.summary.liveCount || 0}
                  </p>
                </article>
                <article className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Missing</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {schoolAttendanceState?.summary.missingCount || 0}
                  </p>
                </article>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleAttendanceWindowAction('open')}
                  disabled={attendanceActionState !== null || schoolAttendanceState?.window.isOpen}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3D08BA] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#2c0691] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {attendanceActionState === 'open' ? 'Opening...' : 'Open attendance'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleAttendanceWindowAction('close')}
                  disabled={attendanceActionState !== null || !schoolAttendanceState?.window.isOpen}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {attendanceActionState === 'close' ? 'Closing...' : 'Close attendance'}
                </button>
                <button
                  type="button"
                  onClick={() => void refreshSchoolAttendanceState()}
                  disabled={isSchoolAttendanceLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-[11px] font-semibold text-white/80 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSchoolAttendanceLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {schoolAttendanceState?.window.openedAt && (
                <p className="mt-3 text-[11px] text-white/60">
                  Last opened {formatClockTime(schoolAttendanceState.window.openedAt)} by{' '}
                  {schoolAttendanceState.window.openedByName || 'teacher'}.
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                <UserGroupIcon className="h-4 w-4" />
                Question Queue
              </h3>
              <span className="text-[11px] text-white/65">
                {questionQueue.filter((q) => q.status !== 'resolved').length} open
              </span>
            </div>

            {isTeacher ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/70">
                  <p className="font-semibold text-white/85">Host guide</p>
                  <p className="mt-1">
                    Spotlight to pin a question, Invite to bring the student on stage, Resolve to close it.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
	                  <button
	                    type="button"
	                    onClick={() => startHotQuestion()}
	                    className="rounded-full bg-sky-500/30 px-3 py-1 text-[11px] font-semibold text-sky-50 hover:bg-sky-500/45"
	                  >
                    Start Hot Question (60s)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoHotEnabled((previous) => !previous)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      autoHotEnabled
                        ? 'bg-emerald-500/30 text-emerald-50'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Auto Hot: {autoHotEnabled ? 'On' : 'Off'}
                  </button>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                    <span className="text-[10px] uppercase tracking-wide text-white/50">Reactions</span>
                    <select
                      value={reactionSetKey}
                      onChange={(event) => setReactionSetKey(event.target.value)}
                      className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-white"
                    >
                      {Object.keys(REACTION_PALETTE_BY_SET).map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                    <span className="text-[10px] uppercase tracking-wide text-white/50">Cooldown</span>
                    <select
                      value={hotCooldownMs}
                      onChange={(event) => setHotCooldownMs(Number(event.target.value))}
                      className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-white"
                    >
                      {HOT_COOLDOWN_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoHotEnabled(false);
                      setHotCooldownMs(HOT_QUESTION_COOLDOWN_MS);
                      setReactionSetKey('classic');
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem(classAutoHotKey);
                        window.localStorage.removeItem(classCooldownKey);
                        window.localStorage.removeItem(classReactionSetKey);
                      }
                      setSettingsToastVisible(true);
                    }}
                    className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/75 hover:bg-white/15"
                  >
                    Reset Class Settings
                  </button>
                  {settingsToastVisible && (
                    <span className="animate-toast rounded-full border border-emerald-300/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] text-emerald-100">
                      Settings reset
                    </span>
                  )}
                  {hotQuestion && (
                    <span className="rounded-full border border-sky-300/40 bg-sky-500/15 px-2.5 py-0.5 text-[10px] text-sky-100">
                      Active • {formatCountdown(hotQuestionRemainingMs)}
                    </span>
                  )}
                  {cooldownStudentId && (
                    <span className="rounded-full border border-amber-300/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] text-amber-100">
                      Cooldown active
                    </span>
                  )}
                </div>
                {questionQueue.filter((q) => q.status !== 'resolved').length === 0 ? (
                  <p className="text-xs text-white/65">No questions yet. Encourage students to ask.</p>
                ) : (
                  questionQueue
                    .filter((q) => q.status !== 'resolved')
                    .slice(0, 6)
                    .map((question) => (
                      <article key={question.id} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-white/90">{question.studentName}</p>
                            <p className="mt-1 text-[11px] text-white/70">{question.text}</p>
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-white/60">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                                {question.votes} votes
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                                {formatClockTime(question.submittedAt)}
                              </span>
                              {cooldownStudentId === question.studentId && (
                                <span className="rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-amber-100">
                                  Cooldown
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => spotlightLiveQuestion(question)}
                              className="rounded-md bg-[#3D08BA] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#2b0690]"
                            >
                              Spotlight
                            </button>
                            <button
                              type="button"
                              onClick={() => void inviteStudentToStage(question.studentId)}
                              disabled={onStageParticipantIds.includes(question.studentId)}
                              className="rounded-md border border-amber-300/40 bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/25 disabled:bg-white/10 disabled:text-white/50"
                            >
                              {onStageParticipantIds.includes(question.studentId) ? 'On Stage' : 'Invite'}
                            </button>
                            <button
                              type="button"
                              onClick={() => resolveLiveQuestion(question)}
                              className="rounded-md border border-emerald-300/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/25"
                            >
                              Resolve
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitLiveQuestion(questionDraft);
                  }}
                  className="space-y-2"
                >
                  <textarea
                    value={questionDraft}
                    onChange={(event) => setQuestionDraft(event.target.value)}
                    placeholder="Type your question for the tutor..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-50 hover:bg-amber-500/45"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    Send Question
                  </button>
                </form>
                {questionQueue.filter((q) => q.studentId === selfParticipant.id).length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-white/70">
                    Latest status:{' '}
                    <span className="font-semibold text-white/90">
                      {questionQueue.find((q) => q.studentId === selfParticipant.id)?.status ?? 'open'}
                    </span>
                  </div>
                )}

                {questionQueue.filter((q) => q.status === 'open').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Upvote Questions</p>
                    {questionQueue
                      .filter((q) => q.status === 'open')
                      .slice(0, 4)
                      .map((question) => {
                        const hasVoted = question.voterIds.includes(selfParticipant.id);
                        return (
                          <article key={question.id} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-semibold text-white/90">{question.studentName}</p>
                                <p className="mt-1 text-[11px] text-white/70">{question.text}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => voteForQuestion(question.id)}
                                disabled={hasVoted}
                                className="rounded-md border border-sky-300/40 bg-sky-500/15 px-2 py-1 text-[10px] font-semibold text-sky-100 hover:bg-sky-500/25 disabled:bg-white/10 disabled:text-white/50"
                              >
                                {hasVoted ? 'Voted' : `Vote (${question.votes})`}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {giftingEnabled ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
              <div className="border-b border-white/10 bg-linear-to-r from-[#111429] via-[#1a1f3d] to-[#221735] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <img
                      src={selfParticipant.avatar || buildFallbackAvatar(selfParticipant.name)}
                      alt={selfParticipant.name}
                      className="h-10 w-10 rounded-full border border-white/25 object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = buildFallbackAvatar(selfParticipant.name);
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[10px] uppercase tracking-wider text-white/60">Gift Rewards</p>
                      <h3 className="truncate text-sm font-semibold text-white">Send a gift to reactivate your rewards</h3>
                      <p className="mt-0.5 text-[11px] text-white/70">Level {currentBadge.level} • {currentBadge.name}</p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0d1025] px-2.5 py-1 text-[11px] font-semibold text-[#ffe4c3]">
                    <img src={GIFT_COIN_ICON_URL} alt="Coin" className="h-3.5 w-3.5" />
                    {coinBalance.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-[#F68C29] via-[#fb7185] to-[#3D08BA]"
                    style={{ width: `${Math.round(rewardProgressToNextBadge * 100)}%` }}
                  ></div>
                </div>
                <p className="mt-1 text-[10px] text-white/65">
                  Total gifted: {totalGiftedCoins.toLocaleString()} coins
                  {nextBadge
                    ? ` • ${Math.max(0, nextBadge.minTotalGiftedCoins - totalGiftedCoins).toLocaleString()} coins to ${nextBadge.name}`
                    : ' • Max badge unlocked'}
                </p>
              </div>

              <div className="space-y-3 p-3">
                <div>
                  <label className="mb-1 block text-[11px] text-white/65">Gift Target</label>
                  <select
                    value={selectedRecipientId}
                    onChange={(event) => setSelectedRecipientId(event.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-[#0f1026] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F68C29]/60"
                  >
                    {recipientOptions.map((recipient) => (
                      <option key={recipient.id} value={recipient.id}>
                        {recipient.name} ({recipient.targetType === 'teacher' ? 'Teacher' : 'School'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-black/25 px-3 py-2 text-[11px] text-white/75">
                  <p>Pin gifts you like to the top</p>
                  <button
                    type="button"
                    onClick={() => togglePinnedGift(selectedGift.id)}
                    className="rounded-md border border-[#ff2b7a]/55 bg-[#ff2b7a]/20 px-2 py-0.5 text-[11px] font-semibold text-[#ffc2dc] hover:bg-[#ff2b7a]/30"
                  >
                    Pin
                  </button>
                </div>

                {isSendingGift && <p className="text-[11px] text-[#ffd9ba]">Sending gift combo...</p>}

                <div className="max-h-[360px] overflow-y-auto pr-1">
                  {visibleGifts.length === 0 ? (
                    <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/65">
                      No gifts available for this tab yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {visibleGifts.map((gift) => {
                        const locked = gift.unlockBadgeLevel > currentBadge.level;
                        const pinned = pinnedGiftIds.includes(gift.id);

                        return (
                          <article
                            key={gift.id}
                            className={`relative overflow-hidden rounded-xl border p-1.5 transition-all ${
                              selectedGiftId === gift.id
                                ? 'border-[#F68C29]/80 bg-[#F68C29]/18 shadow-[0_0_0_1px_rgba(246,140,41,0.4)]'
                                : 'border-white/12 bg-[#0e1026]/85 hover:bg-white/[0.08]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => queueGiftTap(gift.id)}
                              className="w-full text-left"
                            >
                              <div className="relative">
                                <img
                                  src={gift.iconUrl}
                                  alt={gift.name}
                                  className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-lg"
                                  onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = '/gifts/coin.svg';
                                  }}
                                />
                                {gift.tier === 'advanced' && (
                                  <span className="absolute -top-1 left-0 inline-flex items-center rounded-full bg-[#3D08BA] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                    ADV
                                  </span>
                                )}
                                {locked && (
                                  <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/55 text-amber-100">
                                    <LockClosedIcon className="h-4 w-4" />
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 truncate text-[11px] font-semibold">{gift.name}</p>
                              <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-white/75">
                                <img src={GIFT_COIN_ICON_URL} alt="Coin" className="h-3 w-3" />
                                {gift.coinCost}
                              </p>
                              {selectedGiftId === gift.id && !locked ? (
                                <span className="mt-1 inline-flex rounded-md bg-[#ff2b7a] px-2 py-0.5 text-[10px] font-semibold text-white">
                                  Send
                                </span>
                              ) : (
                                <span className="mt-1 inline-flex text-[10px] text-white/55">
                                  {locked ? `Badge ${gift.unlockBadgeLevel}` : 'Tap gift'}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                togglePinnedGift(gift.id);
                              }}
                              className={`absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                                pinned
                                  ? 'border-[#F68C29]/80 bg-[#F68C29]/25 text-[#ffd6a7]'
                                  : 'border-white/20 bg-black/35 text-white/65 hover:bg-black/55'
                              }`}
                              aria-label={pinned ? 'Unpin gift' : 'Pin gift'}
                            >
                              <BookmarkIcon className="h-3.5 w-3.5" />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0e1024] p-2">
                  {(['gifts', 'interactive', 'exclusive'] as GiftPanelTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setGiftPanelTab(tab)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                        giftPanelTab === tab
                          ? 'bg-white text-[#121735]'
                          : 'bg-white/8 text-white/70 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {tab === 'gifts' ? 'Gifts' : tab === 'interactive' ? 'Interactive' : 'Exclusive'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsRechargeOpen(true)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[#3D08BA]/60 bg-[#3D08BA]/25 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#3D08BA]/40"
                  >
                    <img src={GIFT_COIN_ICON_URL} alt="Coin" className="h-3.5 w-3.5" />
                    Recharge
                  </button>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-2.5 py-2">
                  <img
                    src={selectedGift.iconUrl}
                    alt={selectedGift.name}
                    className="h-11 w-11 rounded-xl border border-white/15 object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/gifts/coin.svg';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white/95">{selectedGift.name}</p>
                    <p className="truncate text-[10px] text-white/65">
                      To {selectedRecipient?.name || 'Recipient'} • {selectedGift.coinCost} coins
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => queueGiftTap(selectedGift.id)}
                    disabled={selectedGiftLocked}
                    className="rounded-lg bg-[#ff2b7a] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#ff0f68] disabled:bg-white/20 disabled:text-white/60"
                  >
                    {selectedGiftLocked ? `Badge ${selectedGift.unlockBadgeLevel}` : 'Send'}
                  </button>
                </div>

                {giftComboCount > 0 && giftComboGiftId && (
                  <div className="rounded-xl border border-[#F68C29]/40 bg-[#F68C29]/15 px-3 py-2 text-xs text-[#ffe6cf]">
                    <p className="font-semibold">
                      Combo x{giftComboCount} • {GIFT_CATALOG.find((gift) => gift.id === giftComboGiftId)?.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#ffd9ba]">Keep tapping to multiply before auto-send.</p>
                  </div>
                )}

                <p className="text-[11px] text-white/65">
                  Single tap sends once. Rapid continuous taps multiply the same gift automatically.
                </p>

                <div className="border-t border-white/10 pt-3">
                  <h4 className="mb-2 text-xs font-semibold text-white/80">Top Gifters</h4>
                  {topGifters.length === 0 ? (
                    <p className="text-xs text-white/55">No gifts yet. Be the first to support the class.</p>
                  ) : (
                    <div className="space-y-2">
                      {topGifters.map((gifter, index) => (
                        <div
                          key={gifter.senderId}
                          className="flex items-center justify-between rounded-lg bg-black/25 px-2.5 py-1.5 text-xs"
                        >
                          <span className="truncate">
                            #{index + 1} {gifter.senderName}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-[#ffd7aa]">
                            <img src={GIFT_COIN_ICON_URL} alt="Coin" className="h-3 w-3" />
                            {gifter.total}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-xs text-white/70">
              Gifting is disabled for school-hosted classes. Parents and students can still
              subscribe to class plans outside the live session.
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                Live Chat
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isChatOpen ? 'bg-emerald-400/20 text-emerald-100' : 'bg-red-400/20 text-red-100'
                  }`}
                >
                  {isChatOpen ? 'Chat On' : 'Chat Paused'}
                </span>
                <span className="text-[11px] text-white/65">{chatMessages.length} msgs</span>
              </div>
            </div>

            {isTeacher ? (
              <div className="mb-3 space-y-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleChatAvailability()}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                      isChatOpen
                        ? 'bg-red-500/20 text-red-100 hover:bg-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                    }`}
                  >
                    {isChatOpen ? 'Pause Chat' : 'Reopen Chat'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void clearChatForEveryone()}
                    className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 hover:bg-white/20"
                  >
                    Clear Chat
                  </button>
                </div>

                <div className="max-h-28 overflow-y-auto space-y-1.5">
                  {chatModerationStudents.length === 0 ? (
                    <p className="text-[11px] text-white/55">No students online for chat moderation.</p>
                  ) : (
                    chatModerationStudents.slice(0, 8).map((student) => {
                      const isMuted = mutedChatParticipantIds.includes(student.id);
                      return (
                        <div
                          key={`chat-moderation-${student.id}`}
                          className="flex items-center justify-between gap-2 rounded-md bg-white/[0.04] px-2 py-1.5"
                        >
                          <p className="truncate text-[11px] text-white/90">{student.name}</p>
                          <button
                            type="button"
                            onClick={() => void toggleStudentChatMute(student.id)}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              isMuted
                                ? 'bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
                            }`}
                          >
                            {isMuted ? 'Unmute' : 'Mute'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              (!isChatOpen || isSelfChatMuted) && (
                <div className="mb-3 rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                  {!isChatOpen
                    ? 'Tutor paused the chat to keep the class focused.'
                    : 'Tutor muted your chat temporarily.'}
                </div>
              )
            )}

            <div ref={chatBodyRef} className="h-72 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-3">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-white/60">No messages yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {chatMessages.map((message) => {
                    const isMine = message.senderId === selfParticipant.id;
                    const speakerBadge =
                      message.senderRole === 'teacher'
                        ? 'Tutor'
                        : onStageParticipantIds.includes(message.senderId)
                        ? 'On Stage'
                        : null;

                    return (
                      <article
                        key={message.id}
                        className={`rounded-lg px-2.5 py-2 text-xs ${isMine ? 'bg-[#3D08BA]/35' : 'bg-white/[0.07]'}`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-white/65">
                          <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-white/90">
                            <span className="truncate">{message.senderName}</span>
                            {speakerBadge && (
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                                  speakerBadge === 'Tutor'
                                    ? 'bg-[#F68C29]/30 text-[#ffe0c1]'
                                    : 'bg-emerald-400/20 text-emerald-100'
                                }`}
                              >
                                {speakerBadge}
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setChatReplyTarget({
                                  id: message.id,
                                  senderName: message.senderName,
                                  text: message.text,
                                })
                              }
                              className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/80 hover:bg-white/20"
                            >
                              Reply
                            </button>
                            <span>{formatClockTime(message.sentAt)}</span>
                          </div>
                        </div>
                        {message.replyToText && (
                          <div className="mb-1 rounded border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-white/70">
                            Reply to {message.replyToSenderName || 'message'}: {message.replyToText}
                          </div>
                        )}
                        <p className="leading-relaxed text-white/90">{message.text}</p>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {chatReplyTarget && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[#3D08BA]/40 bg-[#3D08BA]/15 px-2.5 py-2 text-[11px] text-white/85">
                <p className="min-w-0 truncate">
                  Replying to <span className="font-semibold">{chatReplyTarget.senderName}</span>: {chatReplyTarget.text}
                </p>
                <button
                  type="button"
                  onClick={() => setChatReplyTarget(null)}
                  className="rounded-full border border-white/20 bg-white/10 p-1 text-white/80 hover:bg-white/20"
                  aria-label="Cancel reply"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendChat} className="mt-3 flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                disabled={!canSendChat}
                placeholder={
                  !isChatOpen && !isTeacher
                    ? 'Tutor paused chat...'
                    : isSelfChatMuted && !isTeacher
                    ? 'You are muted in chat...'
                    : 'Write to the class...'
                }
                className="flex-1 rounded-lg border border-white/20 bg-[#0f1026] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA]/70"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || !canSendChat}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#3D08BA] text-white hover:bg-[#2d0692] disabled:opacity-50"
                aria-label="Send chat message"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </form>
          </div>

          {giftingEnabled && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
                <GiftTopIcon className="h-4 w-4" />
                Recent Gifts
              </h3>
              {giftFeed.length === 0 ? (
                <p className="text-xs text-white/55">Gift activity will appear here in real-time.</p>
              ) : (
                <div className="space-y-2">
                  {giftFeed.slice(0, 6).map((gift) => (
                    <article key={gift.id} className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-xs">
                      <div className="flex items-start gap-2">
                        <img src={gift.giftIconUrl} alt={gift.giftName} className="h-8 w-8 rounded-lg object-cover" />
                        <p className="font-semibold text-white/90">
                          {gift.senderName} sent {gift.giftName} x{gift.quantity}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] text-white/65">
                        To {gift.recipientName} • {gift.totalCoins} coins • {formatClockTime(gift.sentAt)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-xs text-white/70">
            <p className="inline-flex items-center gap-2 font-semibold text-white/85">
              <UserGroupIcon className="h-4 w-4" />
              Live Class Pattern
            </p>
            <p className="mt-2 leading-relaxed">
              This room combines structured live teaching with interactive class engagement. Students can chat, raise
              hands, react with likes{giftingEnabled ? ', and send school-themed gifts during the lesson.' : ' during the lesson.'}
            </p>
          </div>
        </aside>
      </main>

      {promptedLiveClasswork && !isTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-[min(94vw,460px)] rounded-2xl border border-white/20 bg-[#101231] p-4 shadow-2xl">
            <h3 className="text-base font-semibold text-white">{promptedLiveClasswork.title}</h3>
            <p className="mt-2 text-sm text-white/80">{promptedLiveClasswork.content}</p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-cyan-400/20 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
              <ClockIcon className="h-3.5 w-3.5" />
              {formatCountdown(promptedLiveClasswork.remainingMs || 0)} left
            </p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-white/75">
              {promptedLiveClasswork.checklist.map((item) => (
                <li key={`${promptedLiveClasswork.id}-${item}`} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-cyan-200"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveClassworkPromptId(null)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/20"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveClassworkPromptId(null);
                  navigate('/assignments');
                }}
                className="rounded-lg bg-linear-to-r from-[#3D08BA] to-cyan-500 px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
              >
                Open Classwork
              </button>
            </div>
          </div>
        </div>
      )}

      {incomingStageInvite && !isTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-[min(94vw,420px)] rounded-2xl border border-white/20 bg-[#101231] p-4 shadow-2xl">
            <h3 className="text-base font-semibold text-white">Live Stage Invite</h3>
            <p className="mt-2 text-sm text-white/80">
              <span className="font-semibold">{incomingStageInvite.hostName}</span> invited you to join the stage for
              live Q&A.
            </p>
            <p className="mt-1 text-[11px] text-white/60">
              Accept to appear in the stage roster and participate in tutor-led response flow.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void respondToStageInvite(false)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/20"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => void respondToStageInvite(true)}
                className="rounded-lg bg-linear-to-r from-[#3D08BA] to-[#F68C29] px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
              >
                Join Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {isRechargeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-[min(96vw,520px)] rounded-2xl border border-white/20 bg-[#0f1026] p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Recharge Coins</h3>
                <p className="mt-1 text-xs text-white/65">Add your bank card, buy coin packs, and continue gifting live.</p>
              </div>
              <button
                onClick={() => setIsRechargeOpen(false)}
                className="rounded-full border border-white/20 bg-white/5 p-1.5 text-white/80 hover:bg-white/10"
                aria-label="Close recharge modal"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {COIN_PACKS.map((pack) => {
                const isActivePack = selectedCoinPackId === pack.id;
                const creditedCoins = pack.coins + pack.bonusCoins;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedCoinPackId(pack.id)}
                    className={`rounded-xl border px-3 py-2 text-left ${
                      isActivePack
                        ? 'border-[#F68C29]/80 bg-[#F68C29]/20'
                        : 'border-white/15 bg-white/[0.03] hover:bg-white/[0.08]'
                    }`}
                  >
                    <p className="text-xs font-semibold">{pack.label}</p>
                    <p className="text-[11px] text-white/70">{creditedCoins} coins</p>
                    <p className="text-[11px] font-semibold text-[#ffd4ae]">{pack.priceLabel}</p>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleRechargeSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] text-white/65">Card holder name</label>
                <input
                  value={cardHolderName}
                  onChange={(event) => setCardHolderName(event.target.value)}
                  placeholder="Full name on card"
                  className="w-full rounded-lg border border-white/20 bg-[#121337] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA]/60"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-white/65">Card number</label>
                <input
                  value={cardNumber}
                  onChange={(event) => setCardNumber(sanitizeCardNumber(event.target.value))}
                  placeholder="1234123412341234"
                  className="w-full rounded-lg border border-white/20 bg-[#121337] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] text-white/65">Expiry</label>
                  <input
                    value={cardExpiry}
                    onChange={(event) => setCardExpiry(sanitizeExpiry(event.target.value))}
                    placeholder="MM/YY"
                    className="w-full rounded-lg border border-white/20 bg-[#121337] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA]/60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-white/65">CVV</label>
                  <input
                    value={cardCvv}
                    onChange={(event) => setCardCvv(sanitizeCvv(event.target.value))}
                    placeholder="123"
                    className="w-full rounded-lg border border-white/20 bg-[#121337] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA]/60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessingRecharge}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#3D08BA] to-[#F68C29] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                <CreditCardIcon className="h-4 w-4" />
                {isProcessingRecharge
                  ? 'Processing...'
                  : `Pay ${selectedCoinPack.priceLabel} for ${selectedCoinPack.coins + selectedCoinPack.bonusCoins} coins`}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes giftFloat {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.85);
          }
          20% {
            opacity: 1;
            transform: translateY(-12px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-180px) scale(1.08);
          }
        }

        .gift-float {
          animation: giftFloat 3.2s ease-out forwards;
        }

        @keyframes giftNotificationIn {
          0% {
            opacity: 0;
            transform: translateX(32px) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .gift-notification {
          animation: giftNotificationIn 260ms ease-out forwards;
        }

        @keyframes advancedGiftSpotlightIn {
          0% {
            opacity: 0;
            transform: scale(0.82) translateY(20px);
            filter: blur(4px);
          }
          25% {
            opacity: 1;
            transform: scale(1.03) translateY(0);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .advanced-gift-spotlight {
          animation: advancedGiftSpotlightIn 420ms ease-out forwards, giftFloat 4.3s ease-out forwards;
        }

        @keyframes advancedGiftAura {
          0% {
            opacity: 0.25;
            transform: scale(0.96);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.03);
          }
          100% {
            opacity: 0.25;
            transform: scale(0.96);
          }
        }

        @keyframes advancedGiftOrb {
          0% {
            transform: translateY(0) scale(0.85);
            opacity: 0;
          }
          25% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-130px) scale(1.15);
            opacity: 0;
          }
        }

        @keyframes advancedGiftPing {
          0% {
            transform: scale(0.9);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }

        .advanced-gift-aura {
          background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.26), transparent 55%);
          animation: advancedGiftAura 1.8s ease-in-out infinite;
        }

        .advanced-gift-orbit {
          pointer-events: none;
          overflow: hidden;
        }

        .advanced-gift-orb {
          position: absolute;
          bottom: 16px;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 18px rgba(255, 255, 255, 0.65);
          animation: advancedGiftOrb 1.6s linear infinite;
        }

        .advanced-gift-orb-one {
          left: 22%;
          animation-delay: 0ms;
        }

        .advanced-gift-orb-two {
          left: 52%;
          animation-delay: 380ms;
        }

        .advanced-gift-orb-three {
          left: 76%;
          animation-delay: 720ms;
        }

        .advanced-gift-ping {
          animation: advancedGiftPing 1.3s ease-out infinite;
        }

        .animate-toast {
          animation: fadeInUp 240ms ease-out, fadeOut 240ms ease-in 1.9s forwards;
        }

        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LiveClassroom;
