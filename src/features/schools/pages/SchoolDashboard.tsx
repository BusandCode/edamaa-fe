import { useEffect, useMemo, useState } from 'react';
import {
  FaBell,
  FaSearch,
  FaCheckCircle,
  FaChartLine,
  FaCalendarAlt,
  FaVideo,
  FaIdCard,
  FaUsers,
  FaFileAlt,
  FaCertificate,
  FaBook,
  FaCamera,
  FaMoneyBillWave,
  FaHome,
  FaSignOutAlt,
  FaThumbtack,
  FaUpload,
  FaUserShield,
  FaCog,
  FaPlayCircle,
} from 'react-icons/fa';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import type { IconType } from 'react-icons';
import NewLogo from '../../../components/common/NewLogo';
import QuickActionButton from '../components/QuickActionButton';
import RecentActivity from '../components/RecentActivity';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../../components/layout/school-layout/NavBar';
import {
  fetchTeachingSubscriptionState,
  type TeachingSubscriptionState,
} from '../../subscriptions/utils/teachingSubscriptionApi';
import {
  archiveSchoolExamNotification,
  fetchExamSubmissions,
  fetchSchoolExams,
  fetchSchoolExamNotifications,
  markAllSchoolExamNotificationsAsRead,
  markSchoolExamNotificationAsRead,
  type ExamSubmission,
  type SchoolExam,
  type SchoolExamNotification,
} from '../utils/examsApi';
import {
  fetchFreeLibraryAudiencePresets,
  fetchFreeLibraryBooks,
  fetchMyResourceUploads,
  fetchRecommendedFreeLibraryBooks,
  type FreeLibraryAudiencePreset,
  recommendFreeLibraryBook,
  removeFreeLibraryAudiencePreset,
  removeFreeLibraryRecommendation,
  saveFreeLibraryAudiencePreset,
  updateFreeLibraryAudiencePreset,
  type FreeLibraryItem,
  type FreeLibraryRecommendation,
  type RecommendationTargetSchoolLevel,
  type ResourceItem,
} from '../utils/resourcesApi';
import { fetchMyAccountRoles, switchDefaultAccountRole } from '../../auth/utils/accountRolesApi';
import { schoolManagementModules, type SchoolModule } from '../data/schoolManagementModules';
import {
  fetchSchoolScheduleAttendance,
  fetchSchoolScheduleSessions,
  type SchoolScheduleAttendanceResponse,
  type SchoolScheduleSession,
} from '../utils/schoolScheduleApi';
import {
  loadPersistedLocalDevAuthSession,
  loadPersistedAccountRoleState,
  persistAccountRoleState,
  persistLocalDevAuthSession,
} from '../../../utils/authSession';
import {
  buildSchoolWorkspaceMetadata,
  loadSchoolHasHostelPreference,
  loadSchoolProfileImage,
  persistSchoolProfileImage,
} from '../../../utils/schoolBranding';
import { signOutEverywhere } from '../../../utils/signOut';

const clampPercentage = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const readMetadataBoolean = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1 ? true : value === 0 ? false : null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', '1'].includes(normalized)) {
      return true;
    }
    if (['false', 'no', '0'].includes(normalized)) {
      return false;
    }
  }
  return null;
};

const formatPercentageValue = (value: number | null) =>
  value === null || Number.isNaN(value) ? '--' : `${clampPercentage(value)}%`;

const formatCompactDateTime = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Date pending';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

type ResultLedgerEntry = {
  exam: SchoolExam;
  submissions: ExamSubmission[];
  scoredCount: number;
  publishedCount: number;
  awaitingReviewCount: number;
  averagePercentage: number | null;
  topScorePercentage: number | null;
  laneLabel: string;
  effectiveTimestamp: number;
};

type ResourceLibraryView = 'textbooks' | 'video-lessons' | 'documents';
type DashboardRecommendationSetup = {
  note: string;
  targetSchoolLevel: RecommendationTargetSchoolLevel;
  targetDepartment: string;
  targetClassGroup: string;
};

const FREE_LIBRARY_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Computer Studies',
] as const;

const isTextbookResource = (resource: ResourceItem) =>
  resource.category === 'library' && (resource.type === 'document' || resource.type === 'pdf');
const isLiveRecordingResource = (resource: ResourceItem) =>
  resource.type === 'video' && resource.category === 'live_recording';

const createDashboardRecommendationSetup = (): DashboardRecommendationSetup => ({
  note: '',
  targetSchoolLevel: '',
  targetDepartment: '',
  targetClassGroup: '',
});

const normalizeAudienceValue = (value: string) => value.trim().toLowerCase();

const presetMatchesDashboardRecommendationSetup = (
  preset: Pick<
    FreeLibraryAudiencePreset,
    'targetSchoolLevel' | 'targetDepartment' | 'targetClassGroup'
  >,
  setup: DashboardRecommendationSetup
) =>
  preset.targetSchoolLevel === setup.targetSchoolLevel &&
  normalizeAudienceValue(preset.targetDepartment) === normalizeAudienceValue(setup.targetDepartment) &&
  normalizeAudienceValue(preset.targetClassGroup) === normalizeAudienceValue(setup.targetClassGroup);

const ResourceLibraryOverview = () => {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [recommendedFreeLibraryItems, setRecommendedFreeLibraryItems] = useState<
    FreeLibraryRecommendation[]
  >([]);
  const [recommendedFreeLibraryLoading, setRecommendedFreeLibraryLoading] = useState(false);
  const [recommendedFreeLibraryError, setRecommendedFreeLibraryError] = useState('');
  const [quickPinOpen, setQuickPinOpen] = useState(false);
  const [freeLibraryQuery, setFreeLibraryQuery] = useState('');
  const [freeLibrarySubject, setFreeLibrarySubject] = useState<string>(FREE_LIBRARY_SUBJECTS[0]);
  const [freeLibraryItems, setFreeLibraryItems] = useState<FreeLibraryItem[]>([]);
  const [freeLibraryLoading, setFreeLibraryLoading] = useState(false);
  const [freeLibraryError, setFreeLibraryError] = useState('');
  const [activeRecommendationActionId, setActiveRecommendationActionId] = useState<string | null>(
    null
  );
  const [recommendationSetup, setRecommendationSetup] = useState<DashboardRecommendationSetup>(
    createDashboardRecommendationSetup()
  );
  const [recommendationPresetLabel, setRecommendationPresetLabel] = useState('');
  const [recommendationAudiencePresets, setRecommendationAudiencePresets] = useState<
    FreeLibraryAudiencePreset[]
  >([]);
  const [recommendationAudiencePresetsLoading, setRecommendationAudiencePresetsLoading] =
    useState(false);
  const [recommendationAudiencePresetsError, setRecommendationAudiencePresetsError] = useState('');
  const [activePresetActionId, setActivePresetActionId] = useState<string | null>(null);
  const [editingRecommendationPresetId, setEditingRecommendationPresetId] = useState<string | null>(
    null
  );

  useEffect(() => {
    let active = true;

    const loadResources = async () => {
      setIsLoading(true);
      try {
        const payload = await fetchMyResourceUploads('school');
        if (!active) {
          return;
        }

        const nextUploads = Array.isArray(payload.uploads) ? payload.uploads : [];
        setUploads(nextUploads);
        setNotice(
          nextUploads.length === 0
            ? 'No study materials published yet. Upload the first textbook, video lesson, or classroom document.'
            : ''
        );
      } catch (error) {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Could not load study materials right now.';
        setUploads([]);
        setNotice(message);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadResources();
    return () => {
      active = false;
    };
  }, []);

  const refreshRecommendedFreeLibrary = async () => {
    setRecommendedFreeLibraryLoading(true);
    setRecommendedFreeLibraryError('');

    try {
      const payload = await fetchRecommendedFreeLibraryBooks('school');
      setRecommendedFreeLibraryItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      setRecommendedFreeLibraryItems([]);
      setRecommendedFreeLibraryError(
        error instanceof Error ? error.message : 'Could not load recommended free books right now.'
      );
    } finally {
      setRecommendedFreeLibraryLoading(false);
    }
  };

  const refreshFreeLibraryDiscovery = async (overrides?: { query?: string; subject?: string }) => {
    const nextQuery =
      overrides && Object.prototype.hasOwnProperty.call(overrides, 'query')
        ? overrides.query || ''
        : freeLibraryQuery;
    const nextSubject =
      overrides && Object.prototype.hasOwnProperty.call(overrides, 'subject')
        ? overrides.subject || ''
        : freeLibrarySubject;

    setFreeLibraryLoading(true);
    setFreeLibraryError('');

    try {
      const payload = await fetchFreeLibraryBooks(
        {
          q: nextQuery.trim() || undefined,
          subject: nextSubject.trim() || undefined,
          limit: 4,
        },
        'school'
      );
      setFreeLibraryItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      setFreeLibraryItems([]);
      setFreeLibraryError(
        error instanceof Error ? error.message : 'Could not load free books right now.'
      );
    } finally {
      setFreeLibraryLoading(false);
    }
  };

  const refreshRecommendationAudiencePresets = async () => {
    setRecommendationAudiencePresetsLoading(true);
    setRecommendationAudiencePresetsError('');

    try {
      const payload = await fetchFreeLibraryAudiencePresets('school');
      setRecommendationAudiencePresets(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      setRecommendationAudiencePresets([]);
      setRecommendationAudiencePresetsError(
        error instanceof Error ? error.message : 'Could not load saved audiences right now.'
      );
    } finally {
      setRecommendationAudiencePresetsLoading(false);
    }
  };

  useEffect(() => {
    void refreshRecommendedFreeLibrary();
    void refreshRecommendationAudiencePresets();
  }, []);

  useEffect(() => {
    if (!quickPinOpen || freeLibraryItems.length > 0 || freeLibraryLoading) {
      return;
    }

    void refreshFreeLibraryDiscovery();
  }, [quickPinOpen]);

  const stats = useMemo(
    () => ({
      ebooks: uploads.filter(isTextbookResource).length,
      videoLessons: uploads.filter((resource) => resource.type === 'video').length,
      liveRecordings: uploads.filter(isLiveRecordingResource).length,
      officialDocuments: uploads.filter((resource) => resource.category === 'official_document').length,
    }),
    [uploads]
  );

  const recommendedFreeLibraryLookup = useMemo(
    () => new Map(recommendedFreeLibraryItems.map((item) => [item.id, item])),
    [recommendedFreeLibraryItems]
  );

  const recentLiveRecordings = useMemo(
    () =>
      uploads
        .filter(isLiveRecordingResource)
        .sort(
          (left, right) =>
            new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()
        )
        .slice(0, 3),
    [uploads]
  );

  const cards: Array<{
    key: ResourceLibraryView;
    label: string;
    count: number;
    icon: IconType;
    tone: string;
    iconTone: string;
    helper: string;
  }> = [
    {
      key: 'textbooks',
      label: 'E-Books',
      count: stats.ebooks,
      icon: FaBook,
      tone: 'from-blue-50 to-blue-100',
      iconTone: 'text-blue-600',
      helper: 'Digital textbooks and study guides',
    },
    {
      key: 'video-lessons',
      label: 'Video Lessons',
      count: stats.videoLessons,
      icon: FaVideo,
      tone: 'from-green-50 to-green-100',
      iconTone: 'text-green-600',
      helper: 'Uploaded course videos and live recordings',
    },
    {
      key: 'documents',
      label: 'Official Documents',
      count: stats.officialDocuments,
      icon: FaFileAlt,
      tone: 'from-purple-50 to-purple-100',
      iconTone: 'text-purple-600',
      helper: 'Enrollment letters and official school files',
    },
  ];

  const handleOpenView = (view: ResourceLibraryView) => {
    navigate(`/school-resources?view=${encodeURIComponent(view)}`);
  };

  const handleOpenLiveRecordings = () => {
    navigate('/school-resources?view=video-lessons&lane=recordings');
  };

  const handleOpenFreeLibraryItem = (item: FreeLibraryItem) => {
    window.open(item.actionUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRecommendFreeLibraryItem = async (item: FreeLibraryItem) => {
    if (activeRecommendationActionId) {
      return;
    }

    setActiveRecommendationActionId(`add:${item.id}`);
    setNotice('');
    try {
      const payload = await recommendFreeLibraryBook(
        {
          item,
          note: recommendationSetup.note,
          targetSchoolLevel: recommendationSetup.targetSchoolLevel,
          targetDepartment: recommendationSetup.targetDepartment,
          targetClassGroup: recommendationSetup.targetClassGroup,
        },
        'school'
      );
      await refreshRecommendedFreeLibrary();
      setNotice(payload.message || `${item.title} is now recommended to students.`);
      setRecommendationSetup((previous) => ({
        ...previous,
        note: '',
      }));
    } catch (error) {
      setFreeLibraryError(
        error instanceof Error ? error.message : 'Could not recommend this book right now.'
      );
    } finally {
      setActiveRecommendationActionId(null);
    }
  };

  const handleRemoveRecommendation = async (item: FreeLibraryRecommendation) => {
    if (!item.recommendationId || activeRecommendationActionId) {
      return;
    }

    setActiveRecommendationActionId(`remove:${item.recommendationId}`);
    setNotice('');
    try {
      const payload = await removeFreeLibraryRecommendation(item.recommendationId, 'school');
      await refreshRecommendedFreeLibrary();
      setNotice(payload.message || `${item.title} is no longer pinned for students.`);
    } catch (error) {
      setRecommendedFreeLibraryError(
        error instanceof Error ? error.message : 'Could not remove this recommendation right now.'
      );
    } finally {
      setActiveRecommendationActionId(null);
    }
  };

  const handleApplyRecommendationPreset = (preset: FreeLibraryAudiencePreset) => {
    setRecommendationSetup((previous) => ({
      ...previous,
      targetSchoolLevel: preset.targetSchoolLevel,
      targetDepartment: preset.targetDepartment,
      targetClassGroup: preset.targetClassGroup,
    }));
    setNotice(`${preset.label} audience preset applied.`);
  };

  const handleEditRecommendationPreset = (preset: FreeLibraryAudiencePreset) => {
    setEditingRecommendationPresetId(preset.presetId);
    setRecommendationPresetLabel(preset.label);
    setRecommendationSetup((previous) => ({
      ...previous,
      targetSchoolLevel: preset.targetSchoolLevel,
      targetDepartment: preset.targetDepartment,
      targetClassGroup: preset.targetClassGroup,
    }));
    setRecommendationAudiencePresetsError('');
    setNotice(`Editing ${preset.label}.`);
  };

  const handleCancelRecommendationPresetEdit = () => {
    setEditingRecommendationPresetId(null);
    setRecommendationPresetLabel('');
    setRecommendationAudiencePresetsError('');
  };

  const handleSaveRecommendationPreset = async () => {
    if (activePresetActionId) {
      return;
    }

    const isEditingPreset = Boolean(editingRecommendationPresetId);
    setActivePresetActionId(
      isEditingPreset ? `update:${editingRecommendationPresetId}` : 'save'
    );
    setNotice('');

    try {
      const presetInput = {
        label: recommendationPresetLabel,
        targetSchoolLevel: recommendationSetup.targetSchoolLevel,
        targetDepartment: recommendationSetup.targetDepartment,
        targetClassGroup: recommendationSetup.targetClassGroup,
      };
      const payload = editingRecommendationPresetId
        ? await updateFreeLibraryAudiencePreset(
            editingRecommendationPresetId,
            presetInput,
            'school'
          )
        : await saveFreeLibraryAudiencePreset(presetInput, 'school');
      await refreshRecommendationAudiencePresets();
      setRecommendationPresetLabel('');
      setEditingRecommendationPresetId(null);
      setNotice(payload.message || `${payload.item.label} audience preset is ready to reuse.`);
    } catch (error) {
      setRecommendationAudiencePresetsError(
        error instanceof Error ? error.message : 'Could not save this audience preset right now.'
      );
    } finally {
      setActivePresetActionId(null);
    }
  };

  const handleRemoveRecommendationPreset = async (preset: FreeLibraryAudiencePreset) => {
    if (activePresetActionId) {
      return;
    }

    setActivePresetActionId(`remove:${preset.presetId}`);
    setNotice('');

    try {
      const payload = await removeFreeLibraryAudiencePreset(preset.presetId, 'school');
      await refreshRecommendationAudiencePresets();
      if (editingRecommendationPresetId === preset.presetId) {
        setEditingRecommendationPresetId(null);
        setRecommendationPresetLabel('');
      }
      setNotice(payload.message || `${preset.label} audience preset has been removed.`);
    } catch (error) {
      setRecommendationAudiencePresetsError(
        error instanceof Error ? error.message : 'Could not remove this audience preset right now.'
      );
    } finally {
      setActivePresetActionId(null);
    }
  };

  return (
    <div>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <h3 className='text-sm font-semibold text-gray-900'>Resource Library</h3>
          <p className='mt-1 text-xs text-gray-500'>
            Open the exact material view your school wants to manage.
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={() => navigate('/school-resources?view=free-library')}
            className='text-xs text-[#3D08BA] font-medium hover:underline'
          >
            Free Library
          </button>
          <button
            type='button'
            onClick={() => navigate('/school-resources')}
            className='text-xs text-[#3D08BA] font-medium hover:underline'
          >
            View All
          </button>
        </div>
      </div>
      {notice ? (
        <div className='mb-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 shadow-sm'>
          {notice}
        </div>
      ) : null}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type='button'
              onClick={() => handleOpenView(card.key)}
              className={`rounded-xl bg-linear-to-br ${card.tone} p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-xs font-semibold text-gray-900'>{card.label}</p>
                  <p className='mt-1 text-2xl font-bold text-gray-900'>
                    {isLoading ? '--' : card.count}
                  </p>
                  <p className='mt-1 text-xs text-gray-600'>{card.helper}</p>
                </div>
                <div className='rounded-lg bg-white/80 p-2 shadow-sm'>
                  <Icon className={`${card.iconTone} text-xl`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className='mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]'>
              Edamaa Free Library
            </p>
            <h4 className='mt-1 text-sm font-semibold text-gray-900'>Safe free books from approved sources</h4>
            <p className='mt-1 text-xs text-gray-600'>
              Discover open and previewable books from trusted education catalogs without sending students to unsafe download sites.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <div className='relative group'>
              <button
                type='button'
                title='Pin free book'
                aria-label='Pin free book'
                onClick={() => {
                  setQuickPinOpen(true);
                  setFreeLibraryError('');
                }}
                className='inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#3D08BA] text-white shadow-sm transition hover:bg-[#2c0686]'
              >
                <FaThumbtack className='text-sm' />
              </button>
              <div className='pointer-events-none absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg transition duration-150 group-hover:opacity-100'>
                Pin free book
              </div>
            </div>
            <button
              type='button'
              onClick={() => navigate('/school-resources?view=free-library')}
              className='inline-flex items-center gap-2 rounded-lg border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-3 py-2 text-xs font-semibold text-[#3D08BA] shadow-sm transition hover:border-[#3D08BA]/30 hover:bg-[#F7F4FF]'
            >
              <FaBook className='text-xs' />
              Discover free books
            </button>
          </div>
        </div>
      </div>
      <div className='mt-4 rounded-2xl border border-emerald-200/70 bg-linear-to-r from-emerald-50 via-white to-[#F7F4FF] p-4 shadow-sm'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700'>
              Recommended For Students
            </p>
            <h4 className='mt-1 text-sm font-semibold text-gray-900'>
              Pinned free books from the dashboard
            </h4>
            <p className='mt-1 text-xs text-gray-600'>
              {recommendedFreeLibraryItems.length > 0
                ? `${recommendedFreeLibraryItems.length} free book${recommendedFreeLibraryItems.length === 1 ? '' : 's'} currently pinned for students.`
                : 'No free books have been pinned yet. Use the quick pin button to recommend trusted titles.'}
            </p>
          </div>
          <button
            type='button'
            onClick={() => navigate('/school-resources?view=free-library')}
            className='inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50'
          >
            <FaBook className='text-xs' />
            Manage free books
          </button>
        </div>
        {recommendedFreeLibraryError ? (
          <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800'>
            {recommendedFreeLibraryError}
          </div>
        ) : null}
        {recommendedFreeLibraryLoading ? (
          <p className='mt-4 text-sm text-gray-600'>Loading pinned recommendations...</p>
        ) : recommendedFreeLibraryItems.length === 0 ? (
          <div className='mt-4 rounded-xl border border-dashed border-emerald-200 bg-white/80 px-4 py-3 text-xs text-gray-600'>
            Pin a title from the Edamaa Free Library to give students a stronger starting point in their resources workspace.
          </div>
        ) : (
          <div className='mt-4 grid gap-3 lg:grid-cols-2'>
            {recommendedFreeLibraryItems.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className='rounded-xl border border-white bg-white/90 px-4 py-3 shadow-sm'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700'>
                      {item.sourceLabel}
                    </p>
                    <p className='mt-1 truncate text-sm font-semibold text-gray-900'>{item.title}</p>
                    <p className='mt-1 text-xs text-gray-600'>{item.curatedByLabel}</p>
                  </div>
                  <span className='rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700'>
                    Pinned
                  </span>
                </div>
                {item.note ? (
                  <div className='mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-gray-700'>
                    {item.note}
                  </div>
                ) : null}
                {item.audienceLabel ? (
                  <div className='mt-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700'>
                    For {item.audienceLabel}
                  </div>
                ) : null}
                <div className='mt-3 flex gap-2'>
                  <button
                    type='button'
                    onClick={() => handleOpenFreeLibraryItem(item)}
                    className='inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3D08BA]'
                  >
                    <FaBook className='text-xs' />
                    Open book
                  </button>
                  {item.recommendationId ? (
                    <button
                      type='button'
                      onClick={() => void handleRemoveRecommendation(item)}
                      disabled={activeRecommendationActionId === `remove:${item.recommendationId}`}
                      className='inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {activeRecommendationActionId === `remove:${item.recommendationId}`
                        ? 'Removing...'
                        : 'Remove'}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className='mt-4 rounded-2xl border border-[#3D08BA]/10 bg-linear-to-r from-[#F7F4FF] via-white to-[#EEF2FF] p-4 shadow-sm'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]'>
              Live class replays
            </p>
            <h4 className='mt-1 text-sm font-semibold text-gray-900'>Recent recordings ready to reuse</h4>
            <p className='mt-1 text-xs text-gray-600'>
              {stats.liveRecordings > 0
                ? `${stats.liveRecordings} replay${stats.liveRecordings === 1 ? '' : 's'} published from recorded classes.`
                : 'No live class recordings have been published yet.'}
            </p>
          </div>
          <button
            type='button'
            onClick={handleOpenLiveRecordings}
            className='inline-flex items-center gap-2 rounded-lg border border-[#3D08BA]/15 bg-white px-3 py-2 text-xs font-semibold text-[#3D08BA] shadow-sm transition hover:border-[#3D08BA]/30 hover:bg-[#F7F4FF]'
          >
            <FaCamera className='text-xs' />
            Open recordings
          </button>
        </div>
        {isLoading ? (
          <p className='mt-4 text-sm text-gray-600'>Loading recent replays...</p>
        ) : recentLiveRecordings.length === 0 ? (
          <div className='mt-4 rounded-xl border border-dashed border-[#3D08BA]/15 bg-white/80 px-4 py-3 text-xs text-gray-600'>
            Start recording from the live classroom to automatically build a replay library for your school.
          </div>
        ) : (
          <div className='mt-4 space-y-2'>
            {recentLiveRecordings.map((recording) => (
              <button
                key={recording.id}
                type='button'
                onClick={handleOpenLiveRecordings}
                className='flex w-full items-start justify-between gap-3 rounded-xl border border-white bg-white/90 px-4 py-3 text-left shadow-sm transition hover:border-[#3D08BA]/15 hover:shadow-md'
              >
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <span className='rounded-lg bg-[#3D08BA]/8 p-2 text-[#3D08BA]'>
                      <FaVideo className='text-sm' />
                    </span>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold text-gray-900'>{recording.title}</p>
                      <p className='mt-1 text-xs text-gray-600'>
                        {recording.subject} · {recording.instructor || 'School host'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className='shrink-0 text-right'>
                  <p className='text-[11px] font-medium text-gray-500'>
                    {formatCompactDateTime(recording.uploadedAt)}
                  </p>
                  <p className='mt-1 text-[11px] text-gray-400'>{recording.sizeLabel}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {quickPinOpen && (
        <div className='fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6'>
          <div className='flex min-h-full items-center justify-center'>
            <div className='w-full max-w-4xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl'>
              <div className='max-h-[calc(100vh-3rem)] overflow-y-auto p-5'>
            <div className='flex items-start justify-between gap-4 border-b border-slate-100 pb-4'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]'>
                  Dashboard Quick Pin
                </p>
                <h3 className='mt-1 text-lg font-semibold text-gray-900'>
                  Recommend a free book without leaving the dashboard
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  Search a trusted free title, add a short note, then target it to the right learners.
                </p>
              </div>
              <button
                type='button'
                onClick={() => setQuickPinOpen(false)}
                className='rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50'
              >
                Close
              </button>
            </div>

            <div className='mt-4 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]'>
              <div className='space-y-4'>
                <div className='rounded-2xl border border-[#3D08BA]/10 bg-linear-to-r from-[#F8F5FF] via-white to-[#F5F7FF] p-4'>
                  <div className='flex flex-col gap-3 md:flex-row'>
                    <div className='relative flex-1'>
                      <FaSearch className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400' />
                      <input
                        value={freeLibraryQuery}
                        onChange={(event) => setFreeLibraryQuery(event.target.value)}
                        placeholder='Search by title, topic, or author...'
                        className='w-full rounded-2xl border border-white bg-white/90 py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#3D08BA]/20 focus:ring-4 focus:ring-[#3D08BA]/10'
                      />
                    </div>
                    <button
                      type='button'
                      onClick={() => void refreshFreeLibraryDiscovery()}
                      disabled={freeLibraryLoading}
                      className='inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3D08BA] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2c0686] disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {freeLibraryLoading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  <div className='mt-3 flex flex-wrap gap-2'>
                    {FREE_LIBRARY_SUBJECTS.map((subject) => (
                      <button
                        key={subject}
                        type='button'
                        onClick={() => {
                          setFreeLibrarySubject(subject);
                          void refreshFreeLibraryDiscovery({ subject });
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          freeLibrarySubject === subject
                            ? 'bg-[#3D08BA] text-white shadow-sm'
                            : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>
                {freeLibraryError ? (
                  <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
                    {freeLibraryError}
                  </div>
                ) : null}
                {freeLibraryLoading ? (
                  <div className='rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500'>
                    Loading free books...
                  </div>
                ) : freeLibraryItems.length === 0 ? (
                  <div className='rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500'>
                    Search a subject or title to load recommended book options here.
                  </div>
                ) : (
                  <div className='grid gap-3 md:grid-cols-2'>
                    {freeLibraryItems.map((item) => {
                      const existing = recommendedFreeLibraryLookup.get(item.id);
                      const isPinnedByCurrentUser =
                        existing?.isRecommendedByCurrentUser && existing?.recommendationId;
                      return (
                        <article
                          key={item.id}
                          className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'
                        >
                          <div className='space-y-3 p-4'>
                            <div className='flex items-start justify-between gap-3'>
                              <div className='min-w-0'>
                                <p className='text-xs font-semibold uppercase tracking-[0.14em] text-[#3D08BA]'>
                                  {item.sourceLabel}
                                </p>
                                <h4 className='mt-1 line-clamp-2 text-sm font-semibold text-gray-900'>
                                  {item.title}
                                </h4>
                                <p className='mt-1 text-xs text-gray-600'>
                                  {item.authors.length > 0 ? item.authors.join(', ') : 'Author not listed'}
                                </p>
                              </div>
                              {existing ? (
                                <span className='rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700'>
                                  Pinned
                                </span>
                              ) : null}
                            </div>
                            <p className='line-clamp-3 text-xs leading-5 text-gray-600'>{item.description}</p>
                            {existing?.audienceLabel ? (
                              <div className='rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700'>
                                For {existing.audienceLabel}
                              </div>
                            ) : null}
                            <div className='flex gap-2'>
                              <button
                                type='button'
                                onClick={() => handleOpenFreeLibraryItem(item)}
                                className='inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3D08BA]'
                              >
                                <FaBook className='text-xs' />
                                Open
                              </button>
                              {isPinnedByCurrentUser ? (
                                <button
                                  type='button'
                                  onClick={() => void handleRecommendFreeLibraryItem(item)}
                                  disabled={activeRecommendationActionId === `add:${item.id}`}
                                  className='inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA] disabled:cursor-not-allowed disabled:opacity-60'
                                >
                                  {activeRecommendationActionId === `add:${item.id}` ? 'Saving...' : 'Update'}
                                </button>
                              ) : (
                                <button
                                  type='button'
                                  onClick={() => void handleRecommendFreeLibraryItem(item)}
                                  disabled={activeRecommendationActionId === `add:${item.id}`}
                                  className='inline-flex items-center justify-center rounded-lg border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-3 py-2 text-xs font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-60'
                                >
                                  {activeRecommendationActionId === `add:${item.id}` ? 'Saving...' : 'Pin'}
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className='rounded-2xl border border-slate-200 bg-slate-50/70 p-4'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]'>
                  Recommendation Setup
                </p>
                <h4 className='mt-2 text-sm font-semibold text-gray-900'>
                  Add context before you pin
                </h4>
                <p className='mt-1 text-xs text-gray-600'>
                  Notes and audience settings apply to the next free book you pin or update from this panel.
                </p>

                <div className='mt-4 space-y-4'>
                  <div className='rounded-2xl border border-[#3D08BA]/10 bg-white p-4'>
                    <div className='flex flex-col gap-3'>
                      <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
                        <div className='flex-1'>
                          <label className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                            Audience preset name
                          </label>
                          <input
                            value={recommendationPresetLabel}
                            onChange={(event) => setRecommendationPresetLabel(event.target.value)}
                            placeholder='JSS2 Gold, SS3 Science, Holiday Revision'
                            className='mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10'
                          />
                        </div>
                        <div className='flex flex-col gap-2 sm:flex-row'>
                          <button
                            type='button'
                            onClick={() => void handleSaveRecommendationPreset()}
                            disabled={
                              activePresetActionId === 'save' ||
                              activePresetActionId === `update:${editingRecommendationPresetId}`
                            }
                            className='inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3D08BA] disabled:cursor-not-allowed disabled:opacity-60'
                          >
                            {activePresetActionId === `update:${editingRecommendationPresetId}`
                              ? 'Saving changes...'
                              : activePresetActionId === 'save'
                                ? 'Saving preset...'
                                : editingRecommendationPresetId
                                  ? 'Save changes'
                                  : 'Save current audience'}
                          </button>
                          {editingRecommendationPresetId ? (
                            <button
                              type='button'
                              onClick={handleCancelRecommendationPresetEdit}
                              disabled={Boolean(activePresetActionId)}
                              className='inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
                            >
                              Cancel edit
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className='text-xs text-slate-600'>
                        Save the audience below once, then reuse it on the next book you pin.
                      </p>
                      {editingRecommendationPresetId ? (
                        <div className='rounded-full bg-[#3D08BA]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3D08BA] w-fit'>
                          Editing saved audience
                        </div>
                      ) : null}
                      {recommendationAudiencePresetsError ? (
                        <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800'>
                          {recommendationAudiencePresetsError}
                        </div>
                      ) : null}
                      {recommendationAudiencePresetsLoading ? (
                        <div className='rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-xs text-slate-500'>
                          Loading saved audiences...
                        </div>
                      ) : recommendationAudiencePresets.length === 0 ? (
                        <div className='rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-xs text-slate-500'>
                          No saved audiences yet.
                        </div>
                      ) : (
                        <div className='flex flex-wrap gap-2'>
                          {recommendationAudiencePresets.map((preset) => {
                            const isActivePreset = presetMatchesDashboardRecommendationSetup(
                              preset,
                              recommendationSetup
                            );
                            return (
                              <div
                                key={preset.presetId}
                                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${
                                  isActivePreset
                                    ? 'border-[#3D08BA]/20 bg-[#3D08BA]/8'
                                    : 'border-slate-200 bg-white'
                                }`}
                              >
                                <button
                                  type='button'
                                  onClick={() => handleApplyRecommendationPreset(preset)}
                                  className='text-left'
                                >
                                  <p className='text-sm font-semibold text-slate-900'>{preset.label}</p>
                                  <p className='text-[11px] text-slate-500'>
                                    {preset.audienceLabel || 'All students'}
                                  </p>
                                </button>
                                <button
                                  type='button'
                                  onClick={() => handleEditRecommendationPreset(preset)}
                                  disabled={Boolean(activePresetActionId)}
                                  className='rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:border-[#3D08BA]/25 hover:text-[#3D08BA] disabled:cursor-not-allowed disabled:opacity-60'
                                >
                                  {editingRecommendationPresetId === preset.presetId ? 'Editing' : 'Edit'}
                                </button>
                                <button
                                  type='button'
                                  onClick={() => void handleRemoveRecommendationPreset(preset)}
                                  disabled={activePresetActionId === `remove:${preset.presetId}`}
                                  className='rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
                                >
                                  {activePresetActionId === `remove:${preset.presetId}`
                                    ? 'Removing'
                                    : 'Remove'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                      Recommendation note
                    </label>
                    <textarea
                      value={recommendationSetup.note}
                      onChange={(event) =>
                        setRecommendationSetup((previous) => ({
                          ...previous,
                          note: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder='Best for JSS2 revision or holiday practice.'
                      className='mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10'
                    />
                  </div>
                  <div className='grid gap-3'>
                    <label className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                      School level
                      <select
                        value={recommendationSetup.targetSchoolLevel}
                        onChange={(event) =>
                          setRecommendationSetup((previous) => ({
                            ...previous,
                            targetSchoolLevel: event.target.value as RecommendationTargetSchoolLevel,
                          }))
                        }
                        className='mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium capitalize text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10'
                      >
                        <option value=''>All levels</option>
                        <option value='primary'>Primary</option>
                        <option value='secondary'>Secondary</option>
                        <option value='tertiary'>Tertiary</option>
                      </select>
                    </label>
                    <label className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                      Department
                      <input
                        value={recommendationSetup.targetDepartment}
                        onChange={(event) =>
                          setRecommendationSetup((previous) => ({
                            ...previous,
                            targetDepartment: event.target.value,
                          }))
                        }
                        placeholder='Science, Arts...'
                        className='mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10'
                      />
                    </label>
                    <label className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                      Class group
                      <input
                        value={recommendationSetup.targetClassGroup}
                        onChange={(event) =>
                          setRecommendationSetup((previous) => ({
                            ...previous,
                            targetClassGroup: event.target.value,
                          }))
                        }
                        placeholder='JSS2 Gold, SS3...'
                        className='mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10'
                      />
                    </label>
                  </div>

                  <div className='rounded-xl border border-dashed border-[#3D08BA]/20 bg-white px-4 py-3 text-xs text-slate-600'>
                    Leave the audience fields empty to pin a free book for every student.
                  </div>
                </div>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Performance Overview Component
const PerformanceOverview = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SchoolScheduleSession[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, SchoolScheduleAttendanceResponse>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    const loadAttendanceSnapshot = async () => {
      setIsLoading(true);
      try {
        const payload = await fetchSchoolScheduleSessions({ status: 'all' });
        if (!active) {
          return;
        }

        const nextSessions = Array.isArray(payload.sessions) ? payload.sessions : [];
        setSessions(nextSessions);

        const now = Date.now();
        const attendanceCandidates = nextSessions
          .map((session) => {
            const startMs = new Date(session.startAt).getTime();
            const endMs = startMs + session.durationMinutes * 60 * 1000;
            const status =
              now >= endMs ? 'completed' : now >= startMs ? 'live' : 'upcoming';
            return { session, startMs, status };
          })
          .filter((entry) => entry.status !== 'upcoming')
          .sort((left, right) => right.startMs - left.startMs)
          .slice(0, 6);

        const attendanceResults = await Promise.allSettled(
          attendanceCandidates.map(async ({ session }) => ({
            sessionId: session.id,
            attendance: await fetchSchoolScheduleAttendance(session.id),
          }))
        );

        if (!active) {
          return;
        }

        const nextAttendanceMap: Record<string, SchoolScheduleAttendanceResponse> = {};
        attendanceResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            nextAttendanceMap[result.value.sessionId] = result.value.attendance;
          }
        });

        setAttendanceMap(nextAttendanceMap);
        setNotice(
          Object.keys(nextAttendanceMap).length === 0 && attendanceCandidates.length > 0
            ? 'Attendance has not been taken for recent classes yet.'
            : ''
        );
      } catch (error) {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'Could not load class attendance right now.';
        setNotice(message);
        setAttendanceMap({});
        setSessions([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadAttendanceSnapshot();
    return () => {
      active = false;
    };
  }, []);

  const recentAttendanceEntries = useMemo(() => {
    const now = Date.now();
    return sessions
      .map((session) => {
        const startMs = new Date(session.startAt).getTime();
        const endMs = startMs + session.durationMinutes * 60 * 1000;
        const status =
          now >= endMs ? 'completed' : now >= startMs ? 'live' : 'upcoming';

        return {
          session,
          status,
          attendance: attendanceMap[session.id] || null,
          startMs,
        };
      })
      .filter((entry) => entry.status !== 'upcoming')
      .sort((left, right) => right.startMs - left.startMs)
      .slice(0, 4);
  }, [attendanceMap, sessions]);

  const attendanceSummary = useMemo(() => {
    return recentAttendanceEntries.reduce(
      (accumulator, entry) => {
        if (!entry.attendance) {
          return accumulator;
        }

        const summary = entry.attendance.summary;
        accumulator.expected += summary.expectedStudents;
        accumulator.checkedIn += summary.checkedInCount;
        accumulator.present += summary.presentCount;
        accumulator.late += summary.lateCount;
        accumulator.pending += summary.pendingCount;
        accumulator.trackedSessions += 1;
        return accumulator;
      },
      {
        expected: 0,
        checkedIn: 0,
        present: 0,
        late: 0,
        pending: 0,
        trackedSessions: 0,
      }
    );
  }, [recentAttendanceEntries]);

  const attendanceRate =
    attendanceSummary.expected > 0
      ? (attendanceSummary.checkedIn / attendanceSummary.expected) * 100
      : 0;
  const onTimeRate =
    attendanceSummary.checkedIn > 0
      ? (attendanceSummary.present / attendanceSummary.checkedIn) * 100
      : 0;
  const lateRate =
    attendanceSummary.checkedIn > 0 ? (attendanceSummary.late / attendanceSummary.checkedIn) * 100 : 0;

  const metrics = [
    {
      label: 'Attendance rate',
      value: `${clampPercentage(attendanceRate)}%`,
      helper:
        attendanceSummary.expected > 0
          ? `${attendanceSummary.checkedIn} of ${attendanceSummary.expected} students marked attendance`
          : 'Waiting for students to mark attendance',
      progress: clampPercentage(attendanceRate),
      progressClassName: 'from-[#3D08BA] to-[#5B22E3]',
    },
    {
      label: 'On-time attendance',
      value: `${clampPercentage(onTimeRate)}%`,
      helper:
        attendanceSummary.checkedIn > 0
          ? `${attendanceSummary.present} students marked on time`
          : 'No students marked on time yet',
      progress: clampPercentage(onTimeRate),
      progressClassName: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'Late attendance',
      value: `${clampPercentage(lateRate)}%`,
      helper:
        attendanceSummary.checkedIn > 0
          ? `${attendanceSummary.late} students marked late`
          : 'No late students recorded',
      progress: clampPercentage(lateRate),
      progressClassName: 'from-amber-400 to-orange-500',
    },
  ];

  return (
    <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
      <div className='mb-4 flex items-start justify-between gap-3'>
        <div>
          <h3 className='text-base font-bold text-gray-900'>Class attendance</h3>
          <p className='mt-1 text-[11px] text-gray-500'>
            Attendance summary from your most recent classes.
          </p>
        </div>
        <button
          type='button'
          onClick={() => navigate('/school-schedule')}
          className='rounded-lg border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-1.5 text-[11px] font-semibold text-[#3D08BA] transition-colors hover:bg-[#3D08BA]/10'
        >
          Open schedule
        </button>
      </div>

      {notice && (
        <p className='mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700'>
          {notice}
        </p>
      )}

      <div className='grid gap-3 sm:grid-cols-3'>
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className='rounded-2xl border border-gray-200 bg-gray-50/80 p-4 transition-colors hover:border-[#3D08BA]/15 hover:bg-white'
          >
            <div className='mb-2 flex items-center justify-between gap-2'>
              <span className='text-xs font-semibold uppercase tracking-[0.16em] text-gray-500'>
                {metric.label}
              </span>
              <span className='text-sm font-bold text-gray-900'>{isLoading ? '--' : metric.value}</span>
            </div>
            <p className='mb-3 text-[11px] leading-5 text-gray-600'>{metric.helper}</p>
            <div className='h-2 overflow-hidden rounded-full bg-gray-200/80'>
              <div
                className={`h-full rounded-full bg-linear-to-r ${metric.progressClassName} transition-[width] duration-500`}
                style={{ width: `${metric.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className='mt-5 rounded-2xl border border-gray-200 bg-white p-4'>
        <div className='mb-3 flex items-center justify-between gap-3'>
          <div>
            <h4 className='text-sm font-semibold text-gray-900'>Recent class attendance</h4>
            <p className='mt-1 text-[11px] text-gray-500'>
              {attendanceSummary.trackedSessions > 0
                ? `${attendanceSummary.trackedSessions} recent classes with attendance taken`
                : 'Attendance will appear here once classes start taking attendance.'}
            </p>
          </div>
          <span className='rounded-full bg-[#3D08BA]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3D08BA]'>
            {recentAttendanceEntries.length} classes
          </span>
        </div>

        <div className='space-y-3'>
          {isLoading && (
            <div className='rounded-xl border border-gray-100 bg-gray-50 px-3 py-4 text-xs text-gray-500'>
              Loading class attendance...
            </div>
          )}
          {!isLoading && recentAttendanceEntries.length === 0 && (
            <div className='rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-600'>
              No recent live or completed classes yet.
            </div>
          )}
          {!isLoading &&
            recentAttendanceEntries.map((entry) => {
              const checkedIn = entry.attendance?.summary.checkedInCount ?? 0;
              const expected = entry.attendance?.summary.expectedStudents ?? entry.session.expectedStudents;
              const sessionCoverage =
                expected > 0 ? clampPercentage((checkedIn / expected) * 100) : 0;

              return (
                <div
                  key={entry.session.id}
                  className='rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-3'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        <p className='truncate text-sm font-semibold text-gray-900'>
                          {entry.session.title}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            entry.status === 'live'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {entry.status === 'live' ? 'Live' : 'Completed'}
                        </span>
                      </div>
                      <p className='mt-1 text-[11px] text-gray-500'>
                        {formatCompactDateTime(entry.session.startAt)} • {entry.session.subject}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-sm font-bold text-gray-900'>{sessionCoverage}%</p>
                      <p className='text-[10px] uppercase tracking-[0.14em] text-gray-400'>attendance rate</p>
                    </div>
                  </div>

                  <div className='mt-3 grid gap-2 text-[11px] text-gray-600 sm:grid-cols-3'>
                    <div className='rounded-lg bg-white px-2.5 py-2'>
                      <span className='block text-[10px] uppercase tracking-[0.14em] text-gray-400'>
                        Attendance marked
                      </span>
                      <span className='mt-1 block font-semibold text-gray-900'>
                        {checkedIn}/{expected || 0}
                      </span>
                    </div>
                    <div className='rounded-lg bg-white px-2.5 py-2'>
                      <span className='block text-[10px] uppercase tracking-[0.14em] text-gray-400'>
                        Late
                      </span>
                      <span className='mt-1 block font-semibold text-gray-900'>
                        {entry.attendance?.summary.lateCount ?? 0}
                      </span>
                    </div>
                    <div className='rounded-lg bg-white px-2.5 py-2'>
                      <span className='block text-[10px] uppercase tracking-[0.14em] text-gray-400'>
                        Pending
                      </span>
                      <span className='mt-1 block font-semibold text-gray-900'>
                        {entry.attendance?.summary.pendingCount ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

const ResultLedgerOverview = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ResultLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    const loadResultLedger = async () => {
      setIsLoading(true);
      try {
        const payload = await fetchSchoolExams();
        if (!active) {
          return;
        }

        const examCandidates = (Array.isArray(payload.exams) ? payload.exams : [])
          .map((exam) => {
            const timestamp = new Date(exam.publishedAt || exam.startAt || exam.createdAt).getTime();
            return {
              exam,
              timestamp: Number.isFinite(timestamp) ? timestamp : 0,
            };
          })
          .sort((left, right) => right.timestamp - left.timestamp)
          .slice(0, 6);

        const submissionResults = await Promise.allSettled(
          examCandidates.map(async ({ exam, timestamp }) => {
            const submissionPayload = await fetchExamSubmissions(exam.id);
            const submissions = Array.isArray(submissionPayload.submissions)
              ? submissionPayload.submissions
              : [];
            const scoredSubmissions = submissions.filter(
              (submission) =>
                typeof submission.score === 'number' &&
                Number.isFinite(submission.score) &&
                submission.maxScore > 0 &&
                (submission.status === 'graded' || submission.status === 'published')
            );
            const publishedCount = submissions.filter((submission) => submission.status === 'published').length;
            const awaitingReviewCount = submissions.filter((submission) => submission.status === 'submitted').length;
            const averagePercentage =
              scoredSubmissions.length > 0
                ? scoredSubmissions.reduce(
                    (total, submission) => total + ((submission.score || 0) / submission.maxScore) * 100,
                    0
                  ) / scoredSubmissions.length
                : null;
            const topScorePercentage =
              scoredSubmissions.length > 0
                ? Math.max(
                    ...scoredSubmissions.map((submission) =>
                      ((submission.score || 0) / submission.maxScore) * 100
                    )
                  )
                : null;

            return {
              exam,
              submissions,
              scoredCount: scoredSubmissions.length,
              publishedCount,
              awaitingReviewCount,
              averagePercentage,
              topScorePercentage,
              laneLabel:
                [exam.department, exam.classGroup].filter(Boolean).join(' • ') || 'Class lane pending',
              effectiveTimestamp: timestamp,
            };
          })
        );

        if (!active) {
          return;
        }

        const nextEntries = submissionResults
          .flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
          .sort((left, right) => right.effectiveTimestamp - left.effectiveTimestamp)
          .slice(0, 4);

        setEntries(nextEntries);
        setNotice(
          nextEntries.length === 0
            ? 'Create and grade exams in the exam center to see your result ledger here.'
            : ''
        );
      } catch (error) {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Could not load result reporting right now.';
        setNotice(message);
        setEntries([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadResultLedger();
    return () => {
      active = false;
    };
  }, []);

  const resultSummary = useMemo(() => {
    return entries.reduce(
      (accumulator, entry) => {
        accumulator.exams += 1;
        accumulator.submissions += entry.submissions.length;
        accumulator.published += entry.publishedCount;
        accumulator.awaitingReview += entry.awaitingReviewCount;
        if (entry.averagePercentage !== null) {
          accumulator.averageTotal += entry.averagePercentage;
          accumulator.averageCount += 1;
        }
        return accumulator;
      },
      {
        exams: 0,
        submissions: 0,
        published: 0,
        awaitingReview: 0,
        averageTotal: 0,
        averageCount: 0,
      }
    );
  }, [entries]);

  const overallAverage =
    resultSummary.averageCount > 0
      ? resultSummary.averageTotal / resultSummary.averageCount
      : null;

  const classPerformance = useMemo(() => {
    const laneMap = new Map<
      string,
      {
        laneLabel: string;
        exams: number;
        scoredTotal: number;
        scoredCount: number;
        publishedCount: number;
      }
    >();

    entries.forEach((entry) => {
      const current = laneMap.get(entry.laneLabel) || {
        laneLabel: entry.laneLabel,
        exams: 0,
        scoredTotal: 0,
        scoredCount: 0,
        publishedCount: 0,
      };
      current.exams += 1;
      current.publishedCount += entry.publishedCount;
      if (entry.averagePercentage !== null) {
        current.scoredTotal += entry.averagePercentage;
        current.scoredCount += 1;
      }
      laneMap.set(entry.laneLabel, current);
    });

    return Array.from(laneMap.values())
      .map((item) => ({
        ...item,
        averagePercentage: item.scoredCount > 0 ? item.scoredTotal / item.scoredCount : null,
      }))
      .sort((left, right) => (right.averagePercentage || 0) - (left.averagePercentage || 0))
      .slice(0, 3);
  }, [entries]);

  return (
    <div className='rounded-2xl border border-gray-200 bg-white p-5 shadow-sm'>
      <div className='mb-4 flex items-start justify-between gap-3'>
        <div>
          <h3 className='text-base font-bold text-gray-900'>Result ledger</h3>
          <p className='mt-1 text-[11px] text-gray-500'>
            Recent exam outcomes across classes, including released results and pending review.
          </p>
        </div>
        <button
          type='button'
          onClick={() => navigate('/school-exams')}
          className='rounded-lg border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-1.5 text-[11px] font-semibold text-[#3D08BA] transition-colors hover:bg-[#3D08BA]/10'
        >
          Open exam center
        </button>
      </div>

      {notice && (
        <p className='mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700'>
          {notice}
        </p>
      )}

      <div className='grid gap-3 sm:grid-cols-4'>
        <div className='rounded-2xl border border-gray-200 bg-gray-50/80 p-4'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500'>
            Average result
          </p>
          <p className='mt-2 text-2xl font-bold text-gray-900'>{formatPercentageValue(overallAverage)}</p>
          <p className='mt-1 text-[11px] text-gray-500'>Across the latest graded exam sets</p>
        </div>
        <div className='rounded-2xl border border-gray-200 bg-gray-50/80 p-4'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500'>
            Released results
          </p>
          <p className='mt-2 text-2xl font-bold text-gray-900'>{resultSummary.published}</p>
          <p className='mt-1 text-[11px] text-gray-500'>Already visible to students</p>
        </div>
        <div className='rounded-2xl border border-gray-200 bg-gray-50/80 p-4'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500'>
            Awaiting review
          </p>
          <p className='mt-2 text-2xl font-bold text-gray-900'>{resultSummary.awaitingReview}</p>
          <p className='mt-1 text-[11px] text-gray-500'>Submissions still pending grading</p>
        </div>
        <div className='rounded-2xl border border-gray-200 bg-gray-50/80 p-4'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500'>
            Tracked exams
          </p>
          <p className='mt-2 text-2xl font-bold text-gray-900'>{resultSummary.exams}</p>
          <p className='mt-1 text-[11px] text-gray-500'>Recent exams included in this ledger</p>
        </div>
      </div>

      <div className='mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]'>
        <div className='rounded-2xl border border-gray-200 bg-white p-4'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div>
              <h4 className='text-sm font-semibold text-gray-900'>Recent exam reporting</h4>
              <p className='mt-1 text-[11px] text-gray-500'>
                Latest reviewed exams with release and score status.
              </p>
            </div>
            <span className='rounded-full bg-[#3D08BA]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3D08BA]'>
              {entries.length} exams
            </span>
          </div>

          <div className='space-y-3'>
            {isLoading && (
              <div className='rounded-xl border border-gray-100 bg-gray-50 px-3 py-4 text-xs text-gray-500'>
                Loading result ledger...
              </div>
            )}
            {!isLoading && entries.length === 0 && !notice && (
              <div className='rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-600'>
                No exam reporting available yet.
              </div>
            )}
            {!isLoading &&
              entries.map((entry) => (
                <div
                  key={entry.exam.id}
                  className='rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-3'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        <p className='truncate text-sm font-semibold text-gray-900'>{entry.exam.title}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            entry.publishedCount > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {entry.publishedCount > 0 ? 'Released' : 'In review'}
                        </span>
                      </div>
                      <p className='mt-1 text-[11px] text-gray-500'>
                        {entry.exam.subject} • {entry.laneLabel} • {formatCompactDateTime(entry.exam.startAt)}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-sm font-bold text-gray-900'>
                        {formatPercentageValue(entry.averagePercentage)}
                      </p>
                      <p className='text-[10px] uppercase tracking-[0.14em] text-gray-400'>avg score</p>
                    </div>
                  </div>

                  <div className='mt-3 grid gap-2 text-[11px] text-gray-600 sm:grid-cols-4'>
                    <div className='rounded-lg bg-white px-2.5 py-2'>
                      <span className='block text-[10px] uppercase tracking-[0.14em] text-gray-400'>
                        Submitted
                      </span>
                      <span className='mt-1 block font-semibold text-gray-900'>{entry.submissions.length}</span>
                    </div>
                    <div className='rounded-lg bg-white px-2.5 py-2'>
                      <span className='block text-[10px] uppercase tracking-[0.14em] text-gray-400'>
                        Reviewed
                      </span>
                      <span className='mt-1 block font-semibold text-gray-900'>{entry.scoredCount}</span>
                    </div>
                    <div className='rounded-lg bg-white px-2.5 py-2'>
                      <span className='block text-[10px] uppercase tracking-[0.14em] text-gray-400'>
                        Released
                      </span>
                      <span className='mt-1 block font-semibold text-gray-900'>{entry.publishedCount}</span>
                    </div>
                    <div className='rounded-lg bg-white px-2.5 py-2'>
                      <span className='block text-[10px] uppercase tracking-[0.14em] text-gray-400'>
                        Top score
                      </span>
                      <span className='mt-1 block font-semibold text-gray-900'>
                        {formatPercentageValue(entry.topScorePercentage)}
                      </span>
                    </div>
                  </div>

                  {entry.awaitingReviewCount > 0 && (
                    <p className='mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700'>
                      {entry.awaitingReviewCount} submission{entry.awaitingReviewCount === 1 ? '' : 's'} still awaiting review.
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>

        <div className='rounded-2xl border border-gray-200 bg-white p-4'>
          <div className='mb-3'>
            <h4 className='text-sm font-semibold text-gray-900'>Class performance leaders</h4>
            <p className='mt-1 text-[11px] text-gray-500'>
              Best-performing lanes from the exams already tracked in this ledger.
            </p>
          </div>

          <div className='space-y-3'>
            {classPerformance.length === 0 && (
              <div className='rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-600'>
                Class performance will appear after graded results are available.
              </div>
            )}
            {classPerformance.map((lane, index) => (
              <div
                key={lane.laneLabel}
                className='rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-3'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-gray-900'>{lane.laneLabel}</p>
                    <p className='mt-1 text-[11px] text-gray-500'>
                      {lane.exams} exam{lane.exams === 1 ? '' : 's'} • {lane.publishedCount} released result{lane.publishedCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#3D08BA]/10 text-xs font-bold text-[#3D08BA]'>
                    {index + 1}
                  </span>
                </div>

                <div className='mt-3 flex items-center justify-between gap-3'>
                  <div className='h-2 flex-1 overflow-hidden rounded-full bg-gray-200/80'>
                    <div
                      className='h-full rounded-full bg-linear-to-r from-[#3D08BA] to-[#5B22E3]'
                      style={{ width: `${clampPercentage(lane.averagePercentage || 0)}%` }}
                    />
                  </div>
                  <span className='text-sm font-bold text-gray-900'>
                    {formatPercentageValue(lane.averagePercentage)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Upcoming Events Component
const UpcomingEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<SchoolScheduleSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const payload = await fetchSchoolScheduleSessions();
        if (!active) {
          return;
        }
        setEvents(Array.isArray(payload.sessions) ? payload.sessions : []);
        setNotice('');
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Could not load upcoming schedule events.';
        setNotice(message);
        setEvents([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadEvents();
    return () => {
      active = false;
    };
  }, []);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    const withStatus = events
      .map((session) => {
        const startMs = new Date(session.startAt).getTime();
        const endMs = startMs + session.durationMinutes * 60 * 1000;
        let status: 'upcoming' | 'live' | 'completed' = 'upcoming';
        if (Number.isFinite(startMs)) {
          if (now >= startMs && now < endMs) {
            status = 'live';
          } else if (now >= endMs) {
            status = 'completed';
          }
        }
        return { session, status, startMs };
      })
      .filter((entry) => entry.status !== 'completed')
      .sort((a, b) => a.startMs - b.startMs);

    return withStatus.slice(0, 3);
  }, [events]);

  const formatEventDate = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatEventTime = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return '--:--';
    }
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className='bg-white rounded-2xl p-5 shadow-sm'>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <h3 className='text-base font-bold text-gray-900'>Upcoming classes</h3>
          <p className='text-[11px] text-gray-500'>Quick add creates a class; full schedule is for edits and management.</p>
        </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => navigate('/school-schedule')}
              className='text-xs text-gray-500 font-semibold hover:text-gray-700'
            >
              Full schedule
            </button>
            <button
              onClick={() => navigate('/school-schedule', { state: { openCreate: true } })}
              className='text-xs text-[#3D08BA] font-medium hover:underline'
            >
              Quick add class
            </button>
          </div>
      </div>
      {notice && (
        <p className='mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700'>
          {notice}
        </p>
      )}
      <div className='space-y-3'>
        {isLoading && (
          <div className='rounded-lg border border-gray-100 bg-gray-50 px-3 py-4 text-xs text-gray-500'>
            Fetching your next classes...
          </div>
        )}
        {!isLoading && upcomingEvents.length === 0 && (
          <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-600'>
            No classes scheduled yet. Use Quick add to create your first class.
          </div>
        )}
        {!isLoading &&
          upcomingEvents.map(({ session, status }) => (
            <div
              key={session.id}
              className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'
            >
              <div className='w-12 h-12 bg-linear-to-br from-[#3D08BA] to-[#5010E0] rounded-lg flex items-center justify-center shrink-0'>
                <FaCalendarAlt className='text-white text-sm' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <p className='text-sm font-semibold text-gray-900'>{session.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      status === 'live' ? 'bg-red-100 text-red-700' : 'bg-[#3D08BA]/10 text-[#3D08BA]'
                    }`}
                  >
                    {status === 'live' ? 'Live now' : 'Upcoming'}
                  </span>
                </div>
                <p className='text-xs text-gray-600'>
                  {formatEventDate(session.startAt)} • {formatEventTime(session.startAt)} •{' '}
                  {session.subject}
                </p>
                <p className='text-[11px] text-gray-500'>Instructor: {session.instructor}</p>
              </div>
              <button
                onClick={() =>
                  navigate('/school-schedule', { state: { highlightSessionId: session.id } })
                }
                className='text-[11px] font-semibold text-[#3D08BA] hover:underline'
              >
                Open
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};

const ReleaseInbox = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<SchoolExamNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [busyId, setBusyId] = useState<string | 'all' | null>(null);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        const payload = await fetchSchoolExamNotifications();
        if (!active) {
          return;
        }
        setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
        setNotice('');
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Could not load release updates right now.';
        setNotice(message);
        setNotifications([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadNotifications();
    return () => {
      active = false;
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    const scoped =
      filter === 'unread'
        ? notifications.filter((notification) => !notification.isRead)
        : notifications;
    return scoped.slice(0, 4);
  }, [filter, notifications]);

  const formatRelativeTime = (isoDate: string) => {
    const timestamp = new Date(isoDate).getTime();
    if (!Number.isFinite(timestamp)) {
      return 'Recently';
    }
    const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (diffMinutes < 1) {
      return 'Just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hr ago`;
    }
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  const handleMarkAsRead = async (notificationId: string) => {
    setNotice('');
    setBusyId(notificationId);
    try {
      await markSchoolExamNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification
        )
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark this update as read.');
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (notificationId: string) => {
    setNotice('');
    setBusyId(notificationId);
    try {
      await archiveSchoolExamNotification(notificationId);
      setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not remove this update.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    setNotice('');
    setBusyId('all');
    try {
      await markAllSchoolExamNotificationsAsRead();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark all updates as read.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className='bg-white rounded-2xl p-5 shadow-sm'>
      <div className='flex items-start justify-between gap-3 mb-4'>
        <div>
          <div className='flex items-center gap-2'>
            <FaBell className='text-[#3D08BA]' size={13} />
            <h3 className='text-base font-bold text-gray-900'>Release inbox</h3>
          </div>
          <p className='mt-1 text-[11px] text-gray-500'>
            Published exam result updates stay here until you clear them.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <span className='rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700'>
            {unreadCount} unread
          </span>
          <button
            type='button'
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || busyId === 'all'}
            className='rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className='mb-3 flex flex-wrap gap-2'>
        {([
          { value: 'all', label: 'All updates' },
          { value: 'unread', label: 'Unread only' },
        ] as const).map((option) => (
          <button
            key={option.value}
            type='button'
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              filter === option.value
                ? 'bg-[#3D08BA] text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {notice && (
        <p className='mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700'>
          {notice}
        </p>
      )}

      <div className='space-y-3'>
        {isLoading && (
          <div className='rounded-lg border border-gray-100 bg-gray-50 px-3 py-4 text-xs text-gray-500'>
            Loading release updates...
          </div>
        )}
        {!isLoading && notifications.length === 0 && (
          <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-600'>
            No release updates yet. Published exam results will appear here.
          </div>
        )}
        {!isLoading && notifications.length > 0 && visibleNotifications.length === 0 && (
          <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-600'>
            No release updates match this filter.
          </div>
        )}
        {!isLoading &&
          visibleNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-xl border p-3 ${
                notification.isRead
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-amber-200 bg-amber-50/70'
              }`}
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    {!notification.isRead && <span className='h-2 w-2 rounded-full bg-amber-500' />}
                    <p className='text-sm font-semibold text-gray-900'>{notification.title}</p>
                  </div>
                  <p className='mt-1 text-xs leading-5 text-gray-600'>{notification.message}</p>
                  <p className='mt-2 text-[11px] text-gray-400'>{formatRelativeTime(notification.createdAt)}</p>
                </div>
                <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700'>
                  <FaCheckCircle size={12} />
                </span>
              </div>

              <div className='mt-3 flex flex-wrap justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => navigate('/school-exams')}
                  className='rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50'
                >
                  Open exams
                </button>
                {!notification.isRead && (
                  <button
                    type='button'
                    onClick={() => void handleMarkAsRead(notification.id)}
                    disabled={busyId === notification.id}
                    className='rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60'
                  >
                    Mark as read
                  </button>
                )}
                <button
                  type='button'
                  onClick={() => void handleArchive(notification.id)}
                  disabled={busyId === notification.id}
                  className='rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60'
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

const schoolModuleIcons: Record<SchoolModule['iconKey'], IconType> = {
  fees: FaMoneyBillWave,
  timetable: FaCalendarAlt,
  exams: FaFileAlt,
  homework: FaBook,
  certificates: FaCertificate,
  onlineCourses: FaVideo,
  branches: FaUsers,
  library: FaBook,
  attendance: FaCheckCircle,
  hostel: FaHome,
};

const deriveNameFromEmail = (emailValue: string) => {
  const normalizedEmail = String(emailValue || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return '';
  }

  const prefix = normalizedEmail.split('@')[0] || '';
  return prefix
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
};

const deriveInitials = (value: string) => {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return 'SC';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

type IconActionButtonProps = {
  label: string;
  icon: IconType;
  onClick: () => void;
  disabled?: boolean;
};

const IconActionButton = ({ label, icon: Icon, onClick, disabled = false }: IconActionButtonProps) => (
  <button
    type='button'
    onClick={onClick}
    disabled={disabled}
    className='group relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 text-[#3D08BA] transition-colors hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-60'
    aria-label={label}
    title={label}
  >
    <Icon size={14} />
    <span className='pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'>
      {label}
    </span>
  </button>
);

const SchoolDashboard = () => {
  const [profileImage, setProfileImage] = useState<string>('');
  const [schoolDisplayName, setSchoolDisplayName] = useState<string>('School');
  const [adminDisplayName, setAdminDisplayName] = useState<string>('School Admin');
  const [schoolHasHostel, setSchoolHasHostel] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOpeningInternalAdmin, setIsOpeningInternalAdmin] = useState(false);
  const [subscriptionState, setSubscriptionState] = useState<TeachingSubscriptionState | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [gateNotice, setGateNotice] = useState('');
  const [isModuleDetailsOpen, setIsModuleDetailsOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState(schoolManagementModules[0]?.id ?? '');
  const navigate = useNavigate();
  const isSubscriptionActive = Boolean(subscriptionState?.isActive);
  const canOpenInternalAdmin = Boolean(
    loadPersistedAccountRoleState()?.activeRoles?.includes('admin')
  );
  const visibleSchoolModules = useMemo(
    () =>
      schoolManagementModules.filter(
        (module) => module.id !== 'hostel-management' || schoolHasHostel
      ),
    [schoolHasHostel]
  );
  const activeSchoolModule =
    visibleSchoolModules.find((module) => module.id === activeModuleId) || visibleSchoolModules[0] || null;

  const loadSubscription = async () => {
    setIsSubscriptionLoading(true);
    try {
      const payload = await fetchTeachingSubscriptionState('school');
      setSubscriptionState(payload);
    } catch {
      setSubscriptionState(null);
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    void loadSubscription();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const localStorageSchoolName = (window.localStorage.getItem('edamaa_school_display_name') || '').trim();
    const localStorageAdminName = (window.localStorage.getItem('edamaa_school_admin_name') || '').trim();
    const localDevSession = loadPersistedLocalDevAuthSession();
    const fallbackFromEmail = deriveNameFromEmail(localDevSession?.email || '');
    const effectiveSchoolName = localStorageSchoolName || fallbackFromEmail || 'School';
    const resolvedSchoolHasHostel =
      readMetadataBoolean(localDevSession?.userMetadata?.school_has_hostel) ??
      readMetadataBoolean(localDevSession?.appMetadata?.school_has_hostel) ??
      loadSchoolHasHostelPreference();
    setSchoolDisplayName(effectiveSchoolName);
    setAdminDisplayName(localStorageAdminName || fallbackFromEmail || 'School Admin');
    setProfileImage(loadSchoolProfileImage(localDevSession?.email || ''));
    setSchoolHasHostel(resolvedSchoolHasHostel);
    const readMetadataString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const isSchoolLocalDevSession =
      localDevSession?.defaultRole === 'school' ||
      localDevSession?.role === 'school' ||
      Boolean(localDevSession?.activeRoles?.includes('school'));

    if (localDevSession?.email && isSchoolLocalDevSession) {
      const schoolWorkspaceMetadata = buildSchoolWorkspaceMetadata({
        schoolName: effectiveSchoolName,
        email: localDevSession.email,
        preferredKey:
          readMetadataString(localDevSession.userMetadata?.school_workspace_key) ||
          readMetadataString(localDevSession.appMetadata?.school_workspace_key),
        hasHostel: resolvedSchoolHasHostel,
      });
      const nextUserMetadata = {
        ...(localDevSession.userMetadata || {}),
        ...schoolWorkspaceMetadata,
      };
      const nextAppMetadata = {
        ...(localDevSession.appMetadata || {}),
        ...schoolWorkspaceMetadata,
      };
      const needsWorkspaceBackfill =
        readMetadataString(localDevSession.userMetadata?.school_workspace_key) !==
          schoolWorkspaceMetadata.school_workspace_key ||
        readMetadataString(localDevSession.appMetadata?.school_workspace_key) !==
          schoolWorkspaceMetadata.school_workspace_key ||
        readMetadataString(localDevSession.userMetadata?.school_name) !== schoolWorkspaceMetadata.school_name ||
        readMetadataString(localDevSession.appMetadata?.school_name) !== schoolWorkspaceMetadata.school_name ||
        readMetadataBoolean(localDevSession.userMetadata?.school_has_hostel) !==
          schoolWorkspaceMetadata.school_has_hostel ||
        readMetadataBoolean(localDevSession.appMetadata?.school_has_hostel) !==
          schoolWorkspaceMetadata.school_has_hostel;

      if (needsWorkspaceBackfill) {
        persistLocalDevAuthSession(localDevSession.email, localDevSession.defaultRole, {
          defaultRole: localDevSession.defaultRole,
          activeRoles: localDevSession.activeRoles,
          userMetadata: nextUserMetadata,
          appMetadata: nextAppMetadata,
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!visibleSchoolModules.some((module) => module.id === activeModuleId)) {
      setActiveModuleId(visibleSchoolModules[0]?.id ?? '');
    }
  }, [activeModuleId, visibleSchoolModules]);

  useEffect(() => {
    let active = true;

    const syncRoleState = async () => {
      try {
        const payload = await fetchMyAccountRoles();
        if (!active) {
          return;
        }

        persistAccountRoleState({
          defaultRole: payload.user.defaultRole,
          activeRoles: payload.activeRoles,
          source: 'backend',
        });

        const localDevSession = loadPersistedLocalDevAuthSession();
        if (localDevSession?.email) {
          persistLocalDevAuthSession(localDevSession.email, payload.user.defaultRole, {
            defaultRole: payload.user.defaultRole,
            activeRoles: payload.activeRoles,
          });
        }
      } catch {
        // Keep existing role cache when backend sync is unavailable.
      }
    };

    void syncRoleState();

    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
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
  };

  const goToSubscription = (message: string) => {
    setGateNotice(message);
    navigate('/subscription?actor=school');
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageDataUrl = String(reader.result || '');
        setProfileImage(imageDataUrl);
        persistSchoolProfileImage(imageDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleStudentListClick = () => {
    navigate('/student-list-school');
  };

  const handleTutorListClick = () => {
    navigate('/tutor-list-school');
  };

  const handleLiveClassesClick = () => {
    if (!isSubscriptionActive) {
      goToSubscription('Live classes are unlocked when your school activates Edamaa Pro.');
      return;
    }

    const liveClassId = `school-live-${Date.now().toString().slice(-6)}`;
    const liveInstructorName = schoolDisplayName || 'School';
    const classItem = {
      id: liveClassId,
      code: 'SCH101',
      name: `${liveInstructorName} Live Class`,
      subject: 'School Session',
      instructor: liveInstructorName,
      schedule: 'Live now',
      students: 40,
      description: 'Live class room managed by school administrators and teachers.',
      level: 'Intermediate' as const,
      duration: '90 mins',
    };

    navigate(`/live-class/${liveClassId}?role=teacher&actor=school`, { state: { classItem } });
  };

  const handleScheduleClick = () => {
    navigate('/school-schedule');
  };

  const handleExamManagementClick = () => {
    navigate('/school-exams');
  };

  const handleAssignmentsClick = () => {
    navigate('/school-assignments');
  };

  const handleLibraryClick = () => {
    navigate('/school-library');
  };

  const handleOnlineCoursesClick = () => {
    navigate('/school-online-courses');
  };

  const handleHostelClick = () => {
    navigate('/school-hostel');
  };

  const handleCertificatesClick = () => {
    navigate('/school-certificates');
  };

  const handleResourceUploadClick = () => {
    navigate('/school-resources?mode=upload');
  };

  const handleOpenInternalAdmin = async () => {
    if (isOpeningInternalAdmin) {
      return;
    }

    setIsOpeningInternalAdmin(true);
    setGateNotice('');
    try {
      const payload = await switchDefaultAccountRole('admin');
      persistAccountRoleState({
        defaultRole: payload.roleState.user.defaultRole,
        activeRoles: payload.roleState.activeRoles,
        source: 'backend',
      });

      const localDevSession = loadPersistedLocalDevAuthSession();
      if (localDevSession?.email) {
        persistLocalDevAuthSession(localDevSession.email, payload.roleState.user.defaultRole, {
          defaultRole: payload.roleState.user.defaultRole,
          activeRoles: payload.roleState.activeRoles,
        });
      }

      navigate('/internal-admin/payouts');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not open internal admin. Please switch role from Account Roles.';
      setGateNotice(message);
      navigate('/account-roles');
    } finally {
      setIsOpeningInternalAdmin(false);
    }
  };

  const handleFinanceClick = () => {
    navigate('/school-finance');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const openModuleDetails = (moduleId?: string) => {
    if (moduleId) {
      setActiveModuleId(moduleId);
    }
    setIsModuleDetailsOpen(true);
  };

  const closeModuleDetails = () => {
    setIsModuleDetailsOpen(false);
  };

  return (
    <div className='min-h-screen bg-gray-50 pb-20'>
      {/* Header */}
      <header className='bg-white shadow-sm sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 py-4'>
          <div className='flex items-center justify-between gap-3'>
            {/* Logo */}
            <div className='shrink-0'>
              <NewLogo logoWidth={50} logoHeight={50} textSize="text-[13px]" gap="gap-2" centered={false} />
            </div>
            
            {/* Search Bar */}
            <div className='flex-1 min-w-0 max-w-md'>
              <div className='relative'>
                <FaSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={14} />
                <input
                  type='text'
                  placeholder='Search students, tutors, courses...'
                  className='w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] text-sm'
                />
              </div>
            </div>

            <button
              type='button'
              onClick={handleSettingsClick}
              title='Settings'
              aria-label='Settings'
              className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50'
            >
              <FaCog size={14} />
            </button>

            <button
              type='button'
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              className='inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
            >
              <FaSignOutAlt size={12} />
              {isSigningOut ? 'Signing out...' : 'Log out'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 py-6'>
        {/* Welcome Section */}
        <div className='bg-white rounded-2xl p-5 mb-6 shadow-sm'>
          <div className='flex items-start gap-4'>
            <div className='relative shrink-0'>
              <div className='w-16 h-16 rounded-full overflow-hidden bg-linear-to-br from-purple-400 to-purple-600'>
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt='School Profile' 
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center text-white text-2xl font-bold'>
                    {deriveInitials(schoolDisplayName)}
                  </div>
                )}
              </div>
              <div className='absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white'></div>
              
              {/* Camera Icon for Upload */}
              <label className='absolute -bottom-1 -right-1 w-6 h-6 bg-[#3D08BA] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#5010E0] transition-colors'>
                <FaCamera className='text-white text-xs' />
                <input 
                  type='file' 
                  accept='image/*' 
                  onChange={handleImageChange}
                  className='hidden'
                />
              </label>
            </div>
            
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h2 className='text-lg sm:text-xl font-bold text-gray-900'>Welcome, {schoolDisplayName}</h2>
                <CheckBadgeIcon className='h-[18px] w-[18px] shrink-0 text-orange-500' />
              </div>
              <p className='text-sm text-gray-600 mt-1'>
                Admin: {adminDisplayName}
              </p>
              <p className='text-xs text-gray-500 mt-0.5'>
                Manage classes, students, and finances from one connected school workspace.
              </p>
            </div>
          </div>
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3'>
            {isSubscriptionLoading ? (
              <p className='text-xs text-gray-600'>Checking school subscription access...</p>
            ) : isSubscriptionActive ? (
              <>
                <p className='text-xs text-emerald-700 font-semibold'>
                  Edamaa Pro active: live teaching and unlimited offline classes are enabled.
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                  <IconActionButton
                    label='Study Materials'
                    icon={FaUpload}
                    onClick={handleResourceUploadClick}
                  />
                  {canOpenInternalAdmin && (
                    <IconActionButton
                      label={isOpeningInternalAdmin ? 'Opening Internal Admin...' : 'Internal Admin'}
                      icon={FaUserShield}
                      onClick={() => void handleOpenInternalAdmin()}
                      disabled={isOpeningInternalAdmin}
                    />
                  )}
                  <button
                    onClick={() => navigate('/edamaa3d-verified?actor=school')}
                    className='rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100'
                  >
                    View Edamaa3D Verify
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className='text-xs text-[#3D08BA] font-semibold'>
                  Free mode active: live classes are locked until subscription is active.
                </p>
                <div className='flex flex-wrap items-center gap-2'>
                  <IconActionButton
                    label='Study Materials'
                    icon={FaUpload}
                    onClick={handleResourceUploadClick}
                  />
                  {canOpenInternalAdmin && (
                    <IconActionButton
                      label={isOpeningInternalAdmin ? 'Opening Internal Admin...' : 'Internal Admin'}
                      icon={FaUserShield}
                      onClick={() => void handleOpenInternalAdmin()}
                      disabled={isOpeningInternalAdmin}
                    />
                  )}
                  <button
                    onClick={() => navigate('/subscription?actor=school')}
                    className='rounded-lg bg-[#3D08BA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2c0691]'
                  >
                    Upgrade School Plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {!isSubscriptionLoading && (
          <section className='mb-6'>
            {isSubscriptionActive ? (
              <div className='bg-white rounded-2xl p-5 shadow-sm'>
                <div className='mb-4 flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <h3 className='text-base font-bold text-gray-900'>School Management Platform</h3>
                    <p className='mt-1 text-xs text-gray-600'>
                      Run your entire school from one connected system. Clear. Fast. Organized.
                    </p>
                  </div>
                  <button
                    onClick={() => openModuleDetails(activeSchoolModule?.id)}
                    className='rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                  >
                    View Module Details
                  </button>
                </div>

                <p className='mb-3 text-xs font-semibold text-gray-700'>Core Modules</p>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  {visibleSchoolModules.map((module) => {
                    const ModuleIcon = schoolModuleIcons[module.iconKey];
                    return (
                      <button
                        type='button'
                        key={module.id}
                        onClick={() => openModuleDetails(module.id)}
                        className='rounded-xl border border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100'
                      >
                        <div className='flex items-start gap-3'>
                          <div className='mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#3D08BA]/10'>
                            <ModuleIcon className='text-[#3D08BA]' size={16} />
                          </div>
                          <div className='min-w-0'>
                            <p className='text-sm font-semibold text-gray-900'>{module.title}</p>
                            <p className='mt-1 text-xs leading-relaxed text-gray-600'>{module.summary}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className='bg-white rounded-2xl border border-gray-200 p-4 shadow-sm'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <h3 className='text-sm font-semibold text-gray-900'>School Management Platform</h3>
                    <p className='mt-1 text-xs text-gray-600'>
                      Activate your school plan to access the complete module workspace.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/subscription?actor=school')}
                    className='rounded-lg bg-[#3D08BA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2c0691]'
                  >
                    Upgrade School Plan
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {gateNotice && (
          <p className='mb-6 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700'>
            {gateNotice}
          </p>
        )}

        {/* Quick Actions */}
        <div className='mb-6'>
          <h3 className='text-base font-bold text-gray-900 mb-4'>Quick Actions</h3>
          <div className='grid grid-cols-3 gap-3'>
            <QuickActionButton icon={FaIdCard} label="Student Lists" onClick={handleStudentListClick}/>
            <QuickActionButton icon={FaUsers} label="Find Tutors" onClick={handleTutorListClick} />
            <QuickActionButton icon={FaCertificate} label="Certificates" badge="NEW" onClick={handleCertificatesClick} />
            <QuickActionButton icon={FaChartLine} label="Revenue" onClick={handleFinanceClick} />
            <QuickActionButton icon={FaCalendarAlt} label="Schedule" onClick={handleScheduleClick} />
            <QuickActionButton icon={FaFileAlt} label="Exams" onClick={handleExamManagementClick} />
            <QuickActionButton icon={FaFileAlt} label="Homework" onClick={handleAssignmentsClick} />
            <QuickActionButton icon={FaBook} label="Library" onClick={handleLibraryClick} />
            <QuickActionButton icon={FaPlayCircle} label="Online Courses" onClick={handleOnlineCoursesClick} />
            <QuickActionButton icon={FaVideo} label="Live Classes" badge="8" onClick={handleLiveClassesClick} />
            <QuickActionButton icon={FaFileAlt} label="Study Materials" onClick={handleResourceUploadClick} />
          </div>
          <div className='mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700'>
            Use <span className='font-semibold'>Schedule</span> for your internal school teachers. Use{' '}
            <span className='font-semibold'>Find Tutors</span> only when you want to hire external independent tutors.
          </div>
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
          <RecentActivity />
          <PerformanceOverview />
        </div>

        <div className='mb-6'>
          <ResultLedgerOverview />
        </div>

        <div className='mb-6'>
          <ReleaseInbox />
        </div>

        {/* Upcoming Events */}
        <div className='mb-6'>
          <UpcomingEvents />
        </div>

        {/* WAEC & International Module */}
        <div className='bg-white rounded-2xl shadow-sm overflow-hidden mb-6'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <h3 className='text-sm font-semibold text-gray-900'>WAEC & International Module</h3>
            <button
              type="button"
              onClick={handleExamManagementClick}
              className='text-xs text-[#3D08BA] font-medium hover:underline'
            >
              Open exams
            </button>
          </div>
          <div className='p-4'>
            <div className='bg-linear-to-r from-[#3D08BA] to-[#5010E0] rounded-2xl p-5 text-white relative overflow-hidden'>
              <h4 className='text-base font-bold mb-2'>Past Questions & Mock Exams</h4>
              <p className='text-xs mb-4 max-w-md'>
                Prepare mock exams and structured revision from the school exams workspace. This keeps exam prep inside the working MVP flow instead of a separate premium module.
              </p>
              <button
                type="button"
                onClick={handleExamManagementClick}
                className='bg-white text-[#3D08BA] px-5 py-2 rounded-lg font-semibold text-xs hover:bg-gray-100 transition-colors'
              >
                Manage Exams
              </button>
            </div>
          </div>
        </div>

        {/* Resource Library */}
        <div>
          <ResourceLibraryOverview />
        </div>
      </main>

      {isModuleDetailsOpen && activeSchoolModule && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6'>
          <div className='w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-xl'>
            <div className='flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3'>
              <div>
                <h3 className='text-sm font-semibold text-gray-900'>School Module Details</h3>
                <p className='mt-1 text-xs text-gray-600'>
                  Explore how each module supports your school&apos;s day-to-day operations.
                </p>
              </div>
              <button
                type='button'
                onClick={closeModuleDetails}
                className='rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50'
              >
                Close
              </button>
            </div>

            <div className='grid grid-cols-1 gap-4 p-4 md:grid-cols-[230px_minmax(0,1fr)]'>
              <div className='max-h-[360px] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2'>
                <div className='space-y-1.5'>
                  {visibleSchoolModules.map((module) => {
                    const ModuleIcon = schoolModuleIcons[module.iconKey];
                    const isActive = activeSchoolModule.id === module.id;
                    return (
                      <button
                        key={module.id}
                        type='button'
                        onClick={() => setActiveModuleId(module.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                          isActive
                            ? 'bg-[#3D08BA] text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <ModuleIcon size={14} />
                        <span className='font-medium'>{module.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className='rounded-xl border border-gray-200 p-4'>
                <h4 className='text-base font-bold text-gray-900'>{activeSchoolModule.title}</h4>
                <p className='mt-2 text-sm leading-relaxed text-gray-600'>{activeSchoolModule.summary}</p>

                <div className='mt-4 space-y-3'>
                  <div className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
                    <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>What it solves</p>
                    <p className='mt-1 text-sm leading-relaxed text-gray-700'>{activeSchoolModule.solves}</p>
                  </div>
                  <div className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
                    <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>What you can do</p>
                    <p className='mt-1 text-sm leading-relaxed text-gray-700'>{activeSchoolModule.action}</p>
                  </div>
                </div>

                <div className='mt-4 flex flex-wrap justify-end gap-2'>
                  {activeSchoolModule.id === 'fees-management' && (
                    <button
                      type='button'
                      onClick={() => navigate('/school-finance')}
                      className='rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                    >
                      Open
                    </button>
                  )}
                  {activeSchoolModule.id === 'exam-result-management' && (
                    <button
                      type='button'
                      onClick={() => navigate('/school-exams')}
                      className='rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                    >
                      Open
                    </button>
                  )}
                  {activeSchoolModule.id === 'homework-study-materials' && (
                    <button
                      type='button'
                      onClick={() => navigate('/school-assignments')}
                      className='rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                    >
                      Open
                    </button>
                  )}
                  {activeSchoolModule.id === 'library-management' && (
                    <button
                      type='button'
                      onClick={() => navigate('/school-library')}
                      className='rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                    >
                      Open
                    </button>
                  )}
                  {activeSchoolModule.id === 'online-courses' && (
                    <button
                      type='button'
                      onClick={handleOnlineCoursesClick}
                      className='rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                    >
                      Open
                    </button>
                  )}
                  {activeSchoolModule.id === 'hostel-management' && (
                    <button
                      type='button'
                      onClick={handleHostelClick}
                      className='rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                    >
                      Open
                    </button>
                  )}
                  {activeSchoolModule.id === 'student-certificates' && (
                    <button
                      type='button'
                      onClick={() => navigate('/school-certificates')}
                      className='rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10'
                    >
                      Open
                    </button>
                  )}
                  <button
                    type='button'
                    onClick={closeModuleDetails}
                    className='rounded-lg bg-[#3D08BA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2c0691]'
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <NavBar />
    </div>
  );
};

export default SchoolDashboard;
