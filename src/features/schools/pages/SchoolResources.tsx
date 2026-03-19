import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  BookOpenIcon,
  CloudArrowUpIcon,
  ClockIcon,
  DocumentTextIcon,
  EyeIcon,
  FolderIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  VideoCameraIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  deleteResourceForActor,
  fetchFreeLibraryBooks,
  fetchRecommendedFreeLibraryBooks,
  fetchMyResourceUploads,
  fetchResourceDownload,
  fetchResourcesFeed,
  type FreeLibraryItem,
  type FreeLibraryRecommendation,
  type FreeLibraryProviderStatus,
  markAllResourceNotificationsAsRead,
  markResourceNotificationAsRead,
  parseFilenameFromContentDisposition,
  recommendFreeLibraryBook,
  removeFreeLibraryRecommendation,
  type ResourceCategory,
  type ResourceItem,
  type ResourceNotification,
  type ResourcePricingType,
  type ResourceType,
  updateResourceForActor,
  uploadResourceForActor,
} from '../utils/resourcesApi';

type UploadFormState = {
  title: string;
  description: string;
  subject: string;
  type: ResourceType;
  category: ResourceCategory;
  pricingType: ResourcePricingType;
  price: string;
  instructorName: string;
};

type ResourceWorkspaceView = 'all' | 'textbooks' | 'video-lessons' | 'documents' | 'free-library';
type VideoLibraryLane = 'all' | 'uploaded' | 'recordings';
type OfficialDocumentTemplateId = (typeof OFFICIAL_DOCUMENT_TEMPLATES)[number]['id'] | '';

const FREE_LIBRARY_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Computer Studies',
] as const;

const OFFICIAL_DOCUMENT_TEMPLATES = [
  {
    id: 'enrollment-letter',
    label: 'Enrollment letter',
    title: 'Enrollment Letter',
    subject: 'School Admin',
    description:
      'Official enrollment confirmation letter for a newly admitted student, ready for download and printing.',
  },
  {
    id: 'admission-letter',
    label: 'Admission letter',
    title: 'Admission Letter',
    subject: 'School Admin',
    description:
      'Official admission letter issued to confirm acceptance into the school or programme.',
  },
  {
    id: 'completion-letter',
    label: 'Completion letter',
    title: 'Completion Letter',
    subject: 'School Admin',
    description:
      'Official completion letter issued after a student finishes a programme, course, or school session.',
  },
] as const;

type OfficialDocumentDraftState = {
  templateId: OfficialDocumentTemplateId;
  studentName: string;
  admissionNumber: string;
  classGroup: string;
  programme: string;
  academicSession: string;
  issueDate: string;
  referenceCode: string;
  signatoryName: string;
  signatoryTitle: string;
};

const createOfficialDocumentDraft = (): OfficialDocumentDraftState => ({
  templateId: '',
  studentName: '',
  admissionNumber: '',
  classGroup: '',
  programme: '',
  academicSession: '',
  issueDate: new Date().toISOString().slice(0, 10),
  referenceCode: '',
  signatoryName: '',
  signatoryTitle: 'Registrar',
});

const getProviderStatusTone = (status: FreeLibraryProviderStatus['status']) =>
  status === 'ok'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDocumentDate = (value: string) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const slugifyFilePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document';

const buildOfficialDocumentHtml = (
  templateId: Exclude<OfficialDocumentTemplateId, ''>,
  draft: OfficialDocumentDraftState,
  schoolName: string,
  title: string
) => {
  const studentName = escapeHtml(draft.studentName.trim());
  const admissionNumber = escapeHtml(draft.admissionNumber.trim());
  const classGroup = escapeHtml(draft.classGroup.trim());
  const programme = escapeHtml(draft.programme.trim());
  const academicSession = escapeHtml(draft.academicSession.trim());
  const issueDate = escapeHtml(formatDocumentDate(draft.issueDate));
  const referenceCode = escapeHtml(draft.referenceCode.trim());
  const issuerName = escapeHtml(schoolName.trim() || 'School Administration');
  const signatoryName = escapeHtml(draft.signatoryName.trim() || schoolName.trim() || 'School Administration');
  const signatoryTitle = escapeHtml(draft.signatoryTitle.trim() || 'Registrar');

  const bodyByTemplate: Record<Exclude<OfficialDocumentTemplateId, ''>, string> = {
    'enrollment-letter': `
      <p>This letter confirms that <strong>${studentName}</strong> has been enrolled in <strong>${programme || classGroup || 'the school programme'}</strong> for the <strong>${academicSession || 'current academic session'}</strong>.</p>
      <p>${studentName} is recorded under admission number <strong>${admissionNumber || 'Pending'}</strong>${classGroup ? ` and assigned to <strong>${classGroup}</strong>.` : '.'}</p>
      <p>Please keep this letter for onboarding, student verification, and other official school processes.</p>
    `,
    'admission-letter': `
      <p>We are pleased to inform you that <strong>${studentName}</strong> has been offered admission into <strong>${programme || classGroup || 'the school programme'}</strong>.</p>
      <p>The admission reference for this offer is <strong>${admissionNumber || referenceCode || 'Pending'}</strong>${academicSession ? ` for the <strong>${academicSession}</strong> session.` : '.'}</p>
      <p>Please complete the remaining registration requirements and report to the school with this letter for confirmation.</p>
    `,
    'completion-letter': `
      <p>This letter confirms that <strong>${studentName}</strong> has successfully completed <strong>${programme || classGroup || 'the required programme'}</strong>.</p>
      <p>The completion was recorded for the <strong>${academicSession || 'current academic session'}</strong>${admissionNumber ? ` under student record <strong>${admissionNumber}</strong>` : ''}.</p>
      <p>This document may be used as an official school confirmation of programme completion where required.</p>
    `,
  };

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Georgia, "Times New Roman", serif; margin: 0; background: #f8fafc; color: #0f172a; }
      .sheet { max-width: 840px; margin: 32px auto; background: white; border: 1px solid #e2e8f0; border-radius: 24px; padding: 48px; box-shadow: 0 30px 80px rgba(15,23,42,0.08); }
      .eyebrow { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #3D08BA; font-weight: 700; margin-bottom: 12px; }
      h1 { margin: 0 0 8px; font-size: 34px; line-height: 1.15; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 20px; margin: 24px 0 32px; font-size: 14px; }
      .meta div { padding: 12px 14px; background: #f8fafc; border-radius: 16px; }
      .meta strong { display: block; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
      .content { font-size: 17px; line-height: 1.8; }
      .signature { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
      .signature-line { font-weight: 700; margin-top: 24px; }
      .signature-role { color: #475569; margin-top: 4px; }
      .footer { margin-top: 36px; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="eyebrow">Official School Document</div>
      <h1>${escapeHtml(title)}</h1>
      <div style="font-size: 18px; color: #475569;">${issuerName}</div>
      <div class="meta">
        <div><strong>Student</strong>${studentName || 'Pending'}</div>
        <div><strong>Issue date</strong>${issueDate || 'Pending'}</div>
        <div><strong>Admission / Record No.</strong>${admissionNumber || 'Pending'}</div>
        <div><strong>Reference</strong>${referenceCode || 'Pending'}</div>
      </div>
      <div class="content">
        ${bodyByTemplate[templateId]}
      </div>
      <div class="signature">
        <div class="signature-line">${signatoryName}</div>
        <div class="signature-role">${signatoryTitle}</div>
      </div>
      <div class="footer">
        Generated from the school resources workspace for secure student distribution.
      </div>
    </div>
  </body>
</html>`;
};

const formatResourceCategoryLabel = (category: ResourceCategory) => {
  switch (category) {
    case 'assignment':
      return 'Assignment support';
    case 'classwork':
      return 'Classwork support';
    case 'library':
      return 'E-Book';
    case 'live_recording':
      return 'Live recording';
    case 'official_document':
      return 'Official document';
    case 'note':
    default:
      return 'Class notes';
  }
};

const isEbookResource = (resource: ResourceItem) =>
  resource.category === 'library' && (resource.type === 'document' || resource.type === 'pdf');

const isVideoLessonResource = (resource: ResourceItem) => resource.type === 'video';
const isLiveRecordingResource = (resource: ResourceItem) =>
  resource.type === 'video' && resource.category === 'live_recording';
const isUploadedVideoResource = (resource: ResourceItem) =>
  resource.type === 'video' && resource.category !== 'live_recording';

const isOfficialDocumentResource = (resource: ResourceItem) =>
  resource.category === 'official_document';

const createUploadForm = (): UploadFormState => ({
  title: '',
  description: '',
  subject: '',
  type: 'document',
  category: 'note',
  pricingType: 'free',
  price: '',
  instructorName: '',
});

const toUploadFormState = (resource: ResourceItem): UploadFormState => ({
  title: resource.title,
  description: resource.description,
  subject: resource.subject,
  type: resource.type,
  category: resource.category,
  pricingType: resource.pricingType,
  price:
    resource.pricingType === 'paid' && resource.priceLabel
      ? resource.priceLabel.replace(/[^\d.]/g, '')
      : '',
  instructorName: resource.instructor,
});

const getResourceIcon = (type: ResourceType) => {
  switch (type) {
    case 'pdf':
    case 'document':
      return DocumentTextIcon;
    case 'video':
      return VideoCameraIcon;
    case 'image':
      return PhotoIcon;
    case 'audio':
      return MusicalNoteIcon;
    default:
      return FolderIcon;
  }
};

const getResourceColor = (type: ResourceType) => {
  switch (type) {
    case 'pdf':
      return 'from-red-500 to-red-600';
    case 'video':
      return 'from-[#3D08BA] to-[#5d2de0]';
    case 'image':
      return 'from-emerald-500 to-teal-500';
    case 'audio':
      return 'from-amber-500 to-orange-500';
    case 'document':
      return 'from-sky-500 to-blue-500';
    default:
      return 'from-slate-500 to-slate-600';
  }
};

const resolveWorkspaceView = (value: string): ResourceWorkspaceView => {
  switch (value) {
    case 'textbooks':
    case 'video-lessons':
    case 'documents':
    case 'free-library':
      return value;
    default:
      return 'all';
  }
};

const resolveVideoLane = (value: string): VideoLibraryLane => {
  switch (value) {
    case 'uploaded':
    case 'recordings':
      return value;
    default:
      return 'all';
  }
};

const matchesWorkspaceView = (resource: ResourceItem, view: ResourceWorkspaceView) => {
  switch (view) {
    case 'textbooks':
      return isEbookResource(resource);
    case 'video-lessons':
      return isVideoLessonResource(resource);
    case 'documents':
      return isOfficialDocumentResource(resource);
    case 'free-library':
      return true;
    case 'all':
    default:
      return true;
  }
};

const workspaceViewLabel: Record<Exclude<ResourceWorkspaceView, 'all'>, string> = {
  textbooks: 'E-Books',
  'video-lessons': 'Video lessons',
  documents: 'Official documents',
  'free-library': 'Edamaa Free Library',
};

const SchoolResources = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [libraryResources, setLibraryResources] = useState<ResourceItem[]>([]);
  const [uploads, setUploads] = useState<ResourceItem[]>([]);
  const [notifications, setNotifications] = useState<ResourceNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [freeLibraryQuery, setFreeLibraryQuery] = useState('');
  const [freeLibrarySubject, setFreeLibrarySubject] = useState<string>(FREE_LIBRARY_SUBJECTS[0]);
  const [freeLibraryItems, setFreeLibraryItems] = useState<FreeLibraryItem[]>([]);
  const [freeLibraryProviders, setFreeLibraryProviders] = useState<FreeLibraryProviderStatus[]>([]);
  const [freeLibraryLoading, setFreeLibraryLoading] = useState(true);
  const [freeLibraryError, setFreeLibraryError] = useState<string | null>(null);
  const [recommendedFreeLibraryItems, setRecommendedFreeLibraryItems] = useState<
    FreeLibraryRecommendation[]
  >([]);
  const [recommendedFreeLibraryLoading, setRecommendedFreeLibraryLoading] = useState(true);
  const [recommendedFreeLibraryError, setRecommendedFreeLibraryError] = useState<string | null>(
    null
  );
  const [activeRecommendationActionId, setActiveRecommendationActionId] = useState<string | null>(
    null
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ResourceCategory>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | ResourcePricingType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<ResourceWorkspaceView>('all');
  const [videoLane, setVideoLane] = useState<VideoLibraryLane>('all');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(createUploadForm());
  const [officialDocumentDraft, setOfficialDocumentDraft] = useState<OfficialDocumentDraftState>(
    createOfficialDocumentDraft()
  );
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);
  const [activeNotificationId, setActiveNotificationId] = useState<string | 'all' | null>(null);

  const modeParam = (searchParams.get('mode') || '').trim().toLowerCase();
  const viewParam = resolveWorkspaceView((searchParams.get('view') || '').trim().toLowerCase());
  const laneParam = resolveVideoLane((searchParams.get('lane') || '').trim().toLowerCase());

  const refreshWorkspace = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);

    try {
      const [feedPayload, uploadsPayload] = await Promise.all([
        fetchResourcesFeed('school'),
        fetchMyResourceUploads('school'),
      ]);
      setLibraryResources(Array.isArray(feedPayload.resources) ? feedPayload.resources : []);
      setNotifications(Array.isArray(feedPayload.notifications) ? feedPayload.notifications : []);
      setUploads(Array.isArray(uploadsPayload.uploads) ? uploadsPayload.uploads : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load study materials right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshFreeLibrary = async (overrides?: { query?: string; subject?: string }) => {
    const nextQuery =
      overrides && Object.prototype.hasOwnProperty.call(overrides, 'query')
        ? overrides.query || ''
        : freeLibraryQuery;
    const nextSubject =
      overrides && Object.prototype.hasOwnProperty.call(overrides, 'subject')
        ? overrides.subject || ''
        : freeLibrarySubject;

    setFreeLibraryLoading(true);
    setFreeLibraryError(null);

    try {
      const payload = await fetchFreeLibraryBooks(
        {
          q: nextQuery.trim() || undefined,
          subject: nextSubject.trim() || undefined,
          limit: 6,
        },
        'school'
      );
      setFreeLibraryItems(Array.isArray(payload.items) ? payload.items : []);
      setFreeLibraryProviders(Array.isArray(payload.providers) ? payload.providers : []);
    } catch (error) {
      setFreeLibraryItems([]);
      setFreeLibraryProviders([]);
      setFreeLibraryError(
        error instanceof Error ? error.message : 'Could not load the free-library shelf right now.'
      );
    } finally {
      setFreeLibraryLoading(false);
    }
  };

  const refreshRecommendedFreeLibrary = async () => {
    setRecommendedFreeLibraryLoading(true);
    setRecommendedFreeLibraryError(null);

    try {
      const payload = await fetchRecommendedFreeLibraryBooks('school');
      setRecommendedFreeLibraryItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      setRecommendedFreeLibraryItems([]);
      setRecommendedFreeLibraryError(
        error instanceof Error
          ? error.message
          : 'Could not load school recommendations right now.'
      );
    } finally {
      setRecommendedFreeLibraryLoading(false);
    }
  };

  useEffect(() => {
    void refreshWorkspace(false);
    void refreshFreeLibrary();
    void refreshRecommendedFreeLibrary();
  }, []);

  useEffect(() => {
    if (modeParam === 'upload') {
      setUploadOpen(true);
      setUploadError(null);
      setNotice(null);
    }
  }, [modeParam]);

  useEffect(() => {
    setWorkspaceView(viewParam);
  }, [viewParam]);

  useEffect(() => {
    if (workspaceView === 'video-lessons') {
      setVideoLane(laneParam);
    } else {
      setVideoLane('all');
    }
  }, [laneParam, workspaceView]);

  const filteredUploads = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return uploads.filter((resource) => {
      const matchesSearch =
        !normalizedSearch ||
        resource.title.toLowerCase().includes(normalizedSearch) ||
        resource.subject.toLowerCase().includes(normalizedSearch) ||
        resource.description.toLowerCase().includes(normalizedSearch);

      const matchesType = typeFilter === 'all' || resource.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || resource.category === categoryFilter;
      const matchesPricing = pricingFilter === 'all' || resource.pricingType === pricingFilter;
      const matchesWorkspacePreset = matchesWorkspaceView(resource, workspaceView);
      const matchesVideoLane =
        workspaceView !== 'video-lessons' || videoLane === 'all'
          ? true
          : videoLane === 'uploaded'
          ? isUploadedVideoResource(resource)
          : isLiveRecordingResource(resource);

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesPricing &&
        matchesWorkspacePreset &&
        matchesVideoLane
      );
    });
  }, [uploads, searchQuery, typeFilter, categoryFilter, pricingFilter, workspaceView, videoLane]);

  const recommendedFreeLibraryLookup = useMemo(
    () => new Map(recommendedFreeLibraryItems.map((item) => [item.id, item])),
    [recommendedFreeLibraryItems]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead),
    [notifications]
  );

  const myStats = useMemo(
    () => ({
      total: uploads.length,
      ebooks: uploads.filter(isEbookResource).length,
      videos: uploads.filter(isVideoLessonResource).length,
      uploadedVideos: uploads.filter(isUploadedVideoResource).length,
      liveRecordings: uploads.filter(isLiveRecordingResource).length,
      officialDocuments: uploads.filter(isOfficialDocumentResource).length,
      unread: unreadNotifications.length,
    }),
    [uploads, unreadNotifications.length]
  );

  const applyOfficialDocumentTemplate = (templateId: (typeof OFFICIAL_DOCUMENT_TEMPLATES)[number]['id']) => {
    const template = OFFICIAL_DOCUMENT_TEMPLATES.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setOfficialDocumentDraft((previous) => ({
      ...previous,
      templateId,
    }));
    setUploadForm((previous) => ({
      ...previous,
      category: 'official_document',
      type: 'document',
      pricingType: 'free',
      price: '',
      title: previous.title.trim() ? previous.title : template.title,
      subject: previous.subject.trim() ? previous.subject : template.subject,
      description: previous.description.trim() ? previous.description : template.description,
    }));
  };

  const libraryPreview = useMemo(() => libraryResources.slice(0, 4), [libraryResources]);

  const isEditing = editingResource !== null;

  const handleFreeLibrarySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await refreshFreeLibrary();
  };

  const handleOpenFreeLibraryItem = (item: FreeLibraryItem) => {
    window.open(item.actionUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRecommendFreeLibraryItem = async (item: FreeLibraryItem) => {
    if (activeRecommendationActionId) {
      return;
    }

    setActiveRecommendationActionId(`add:${item.id}`);
    setNotice(null);

    try {
      const payload = await recommendFreeLibraryBook(item, 'school');
      await refreshRecommendedFreeLibrary();
      setNotice(payload.message || `${item.title} is now recommended to students.`);
    } catch (error) {
      setFreeLibraryError(
        error instanceof Error
          ? error.message
          : 'Could not recommend this free book right now.'
      );
    } finally {
      setActiveRecommendationActionId(null);
    }
  };

  const handleRemoveFreeLibraryRecommendation = async (item: FreeLibraryRecommendation) => {
    if (!item.recommendationId || activeRecommendationActionId) {
      return;
    }

    setActiveRecommendationActionId(`remove:${item.recommendationId}`);
    setNotice(null);

    try {
      const payload = await removeFreeLibraryRecommendation(item.recommendationId, 'school');
      await refreshRecommendedFreeLibrary();
      setNotice(payload.message || `${item.title} is no longer pinned for students.`);
    } catch (error) {
      setRecommendedFreeLibraryError(
        error instanceof Error
          ? error.message
          : 'Could not remove this recommendation right now.'
      );
    } finally {
      setActiveRecommendationActionId(null);
    }
  };

  const resetUpload = () => {
    setUploadForm(createUploadForm());
    setOfficialDocumentDraft(createOfficialDocumentDraft());
    setUploadFile(null);
    setUploadError(null);
    setEditingResource(null);
  };

  const buildGeneratedOfficialDocumentFile = (): File | null => {
    if (uploadForm.category !== 'official_document' || !officialDocumentDraft.templateId) {
      return null;
    }

    const templateId = officialDocumentDraft.templateId;
    const title = uploadForm.title.trim();
    const schoolName = uploadForm.instructorName.trim();
    const studentName = officialDocumentDraft.studentName.trim();
    const html = buildOfficialDocumentHtml(templateId, officialDocumentDraft, schoolName, title);
    const fileBaseName = `${slugifyFilePart(title)}-${slugifyFilePart(studentName || 'student')}`;

    return new File([html], `${fileBaseName}.html`, {
      type: 'text/html',
    });
  };

  const openCreateDialog = () => {
    resetUpload();
    if (workspaceView === 'textbooks') {
      setUploadForm((previous) => ({
        ...previous,
        type: 'pdf',
        category: 'library',
      }));
    } else if (workspaceView === 'video-lessons') {
      setUploadForm((previous) => ({
        ...previous,
        type: 'video',
      }));
    } else if (workspaceView === 'documents') {
      setUploadForm((previous) => ({
        ...previous,
        type: 'document',
        category: 'official_document',
      }));
    }
    setUploadOpen(true);
    setNotice(null);
  };

  const openEditDialog = (resource: ResourceItem) => {
    setEditingResource(resource);
    setUploadForm(toUploadFormState(resource));
    setOfficialDocumentDraft(createOfficialDocumentDraft());
    setUploadFile(null);
    setUploadError(null);
    setNotice(null);
    setUploadOpen(true);
  };

  const handleResourceAccess = async (resource: ResourceItem, mode: 'view' | 'download') => {
    if (activeActionId) {
      return;
    }

    const actionId = `${mode}:${resource.id}`;
    setActiveActionId(actionId);
    try {
      const response = await fetchResourceDownload(resource.id, mode, 'school');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const backendFileName = parseFilenameFromContentDisposition(
        response.headers.get('content-disposition')
      );
      const fileName = backendFileName || resource.fileName || `${resource.title}.bin`;

      if (mode === 'view') {
        const popup = window.open(objectUrl, '_blank', 'noopener,noreferrer');
        if (!popup) {
          window.alert('Preview could not open. Allow popups and try again.');
        }
      } else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setUploads((previous) =>
        previous.map((item) =>
          item.id === resource.id ? { ...item, downloads: item.downloads + 1 } : item
        )
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not open this material right now.');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleNotificationRead = async (notificationId: string) => {
    if (activeNotificationId) {
      return;
    }

    setActiveNotificationId(notificationId);
    try {
      await markResourceNotificationAsRead(notificationId, 'school');
      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification
        )
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update this notification.');
    } finally {
      setActiveNotificationId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (activeNotificationId) {
      return;
    }

    setActiveNotificationId('all');
    try {
      await markAllResourceNotificationsAsRead('school');
      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not mark updates as read.');
    } finally {
      setActiveNotificationId(null);
    }
  };

  const handleDeleteResource = async (resource: ResourceItem) => {
    if (activeDeleteId) {
      return;
    }

    const confirmed = window.confirm(
      `Remove "${resource.title}" from the student library? This will also remove its current notifications.`
    );
    if (!confirmed) {
      return;
    }

    setActiveDeleteId(resource.id);
    try {
      const payload = await deleteResourceForActor(resource.id, 'school');
      setNotice(payload.message || `${resource.title} has been removed.`);
      setUploads((previous) => previous.filter((item) => item.id !== resource.id));
      setLibraryResources((previous) => previous.filter((item) => item.id !== resource.id));
      setNotifications((previous) =>
        previous.filter((notification) => notification.resourceId !== resource.id)
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not remove this material right now.');
    } finally {
      setActiveDeleteId(null);
    }
  };

  const handleUploadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (uploading) {
      return;
    }

    const generatedOfficialDocumentFile = buildGeneratedOfficialDocumentFile();
    const effectiveFile = uploadFile || generatedOfficialDocumentFile;

    if (
      uploadForm.category === 'official_document' &&
      officialDocumentDraft.templateId &&
      (!officialDocumentDraft.studentName.trim() || !officialDocumentDraft.issueDate.trim())
    ) {
      setUploadError('Add the student name and issue date before generating this official document.');
      return;
    }

    if (!effectiveFile && !isEditing) {
      setUploadError(
        uploadForm.category === 'official_document' && officialDocumentDraft.templateId
          ? 'Could not generate the official document file. Review the template fields and try again.'
          : 'Choose a file before publishing.'
      );
      return;
    }

    if (uploadForm.pricingType === 'paid') {
      const numericPrice = Number(uploadForm.price);
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        setUploadError('Set a valid amount for paid material.');
        return;
      }
    }

    setUploading(true);
    setUploadError(null);
    setNotice(null);

    try {
      const normalizedUploadForm = {
        ...uploadForm,
        type: generatedOfficialDocumentFile ? 'document' : uploadForm.type,
        pricingType: uploadForm.category === 'official_document' ? 'free' : uploadForm.pricingType,
        price: uploadForm.category === 'official_document' ? '' : uploadForm.price,
      };
      const payload = isEditing && editingResource
        ? await updateResourceForActor(
            editingResource.id,
            {
              ...normalizedUploadForm,
              file: effectiveFile,
            },
            'school'
          )
        : await uploadResourceForActor(
            {
              ...normalizedUploadForm,
              uploaderRole: 'school',
              file: effectiveFile as File,
            },
            'school'
          );

      resetUpload();
      setUploadOpen(false);
      setNotice(
        payload.message || (isEditing ? 'Material updated successfully.' : 'Material published successfully.')
      );
      await refreshWorkspace(true);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : isEditing
          ? 'Could not update this material.'
          : 'Could not publish this material.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.10),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#f5f3ff_52%,_#eef2ff_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <button
                onClick={() => navigate('/school-dashboard')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA]"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to dashboard
              </button>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                  School Resources
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Manage e-books, video lessons, and official documents
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  Publish learning content and official student-facing files from one school workspace.
                  Materials appear in the student library as soon as they are published.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => void refreshWorkspace(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={() => navigate('/school-resources?view=free-library')}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA]"
              >
                <BookOpenIcon className="h-4 w-4" />
                Discover free books
              </button>
              <button
                onClick={() => navigate('/resources')}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-4 py-3 text-sm font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10"
              >
                <BookOpenIcon className="h-4 w-4" />
                Preview student library
              </button>
              <button
                onClick={openCreateDialog}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#3D08BA] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(61,8,186,0.24)] transition hover:bg-[#2d0690]"
              >
                <PlusIcon className="h-4 w-4" />
                Publish material
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Materials published
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{myStats.total}</p>
              <p className="mt-1 text-xs text-slate-500">Files uploaded from this school account.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                E-Books
              </p>
              <p className="mt-2 text-2xl font-semibold text-blue-700">{myStats.ebooks}</p>
              <p className="mt-1 text-xs text-slate-500">Textbooks, guides, and reading files.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Video lessons
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">{myStats.videos}</p>
              <p className="mt-1 text-xs text-slate-500">
                Uploaded videos {myStats.uploadedVideos} • Live recordings {myStats.liveRecordings}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Official documents
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{myStats.officialDocuments}</p>
              <p className="mt-1 text-xs text-slate-500">Enrollment letters, forms, and school files.</p>
            </div>
            <div className="rounded-2xl border border-[#3D08BA]/12 bg-[#3D08BA]/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3D08BA]/70">
                Unread updates
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#3D08BA]">
                {myStats.unread}
              </p>
              <p className="mt-1 text-xs text-[#3D08BA]/70">
                Library updates the school has not reviewed yet.
              </p>
            </div>
          </div>

          {notice ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          {loadError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}
            </div>
          ) : null}
        </header>

        <main className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="space-y-6">
            <div
              className={`rounded-[28px] border bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur ${
                workspaceView === 'free-library'
                  ? 'border-[#3D08BA]/20 ring-2 ring-[#3D08BA]/8'
                  : 'border-white/70'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                    Edamaa Free Library
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    Safe free books from approved education sources
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Discover open and previewable books from the same trusted sources students use,
                    then recommend them without pushing learners to unsafe download sites.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {freeLibraryProviders.map((provider) => (
                    <span
                      key={provider.source}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${getProviderStatusTone(
                        provider.status
                      )}`}
                      title={provider.note}
                    >
                      {provider.sourceLabel}
                      <span className="text-[10px] uppercase tracking-[0.16em]">
                        {provider.status === 'ok' ? 'Live' : 'Limited'}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(event) => void handleFreeLibrarySubmit(event)}
                className="mt-4 rounded-[24px] border border-[#3D08BA]/10 bg-gradient-to-r from-[#F8F5FF] via-white to-[#F5F7FF] p-4 shadow-inner"
              >
                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={freeLibraryQuery}
                      onChange={(event) => setFreeLibraryQuery(event.target.value)}
                      placeholder="Search free books by title, topic, or author..."
                      className="w-full rounded-2xl border border-white bg-white/90 py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#3D08BA]/20 focus:ring-4 focus:ring-[#3D08BA]/10"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={freeLibraryLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3D08BA] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(61,8,186,0.20)] transition hover:bg-[#2d0690] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {freeLibraryLoading ? 'Searching...' : 'Search free books'}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {FREE_LIBRARY_SUBJECTS.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => {
                        setFreeLibrarySubject(subject);
                        void refreshFreeLibrary({ subject });
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
              </form>

              <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                      Recommended To Students
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">
                      School-curated free books
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Pin strong free titles here so students see them first in their own resources
                      workspace.
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-[#3D08BA]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#3D08BA] shadow-sm">
                    {recommendedFreeLibraryItems.length} recommended
                  </span>
                </div>

                {recommendedFreeLibraryError ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {recommendedFreeLibraryError}
                  </div>
                ) : null}

                {recommendedFreeLibraryLoading ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">
                    Loading recommended free books...
                  </div>
                ) : recommendedFreeLibraryItems.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">
                    No free books have been pinned yet. Use the cards below to recommend titles to
                    students.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {recommendedFreeLibraryItems.map((item) => (
                      <article
                        key={`recommended-${item.id}`}
                        className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.06)]"
                      >
                        <div className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3D08BA]">
                                {item.sourceLabel}
                              </p>
                              <h4 className="mt-1 line-clamp-2 text-base font-semibold text-slate-950">
                                {item.title}
                              </h4>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                              Pinned
                            </span>
                          </div>
                          <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span>{item.curatedByLabel}</span>
                            <span className="text-slate-300">•</span>
                            <span>{item.curatedAtLabel}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenFreeLibraryItem(item)}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3D08BA]"
                            >
                              <BookOpenIcon className="h-4 w-4" />
                              {item.actionLabel}
                            </button>
                            {item.recommendationId ? (
                              <button
                                type="button"
                                onClick={() => void handleRemoveFreeLibraryRecommendation(item)}
                                disabled={
                                  activeRecommendationActionId === `remove:${item.recommendationId}`
                                }
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {activeRecommendationActionId === `remove:${item.recommendationId}`
                                  ? 'Removing...'
                                  : 'Remove'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {freeLibraryError ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {freeLibraryError}
                </div>
              ) : null}

              <div className="mt-4">
                {freeLibraryLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                    Loading the free-library shelf...
                  </div>
                ) : freeLibraryItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                    No free books matched this search yet.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {freeLibraryItems.map((item) => (
                      <article
                        key={item.id}
                        className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.10)]"
                      >
                        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-[#F5F0FF] via-white to-[#EEF2FF] p-4">
                          {item.coverImageUrl ? (
                            <img
                              src={item.coverImageUrl}
                              alt={item.title}
                              className="h-full max-h-36 rounded-xl border border-slate-200 object-contain shadow-sm transition duration-300 group-hover:scale-[1.02]"
                            />
                          ) : (
                            <div className="flex h-full w-full max-w-[10rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[#3D08BA]/20 bg-white text-center">
                              <BookOpenIcon className="h-8 w-8 text-[#3D08BA]" />
                              <p className="mt-2 px-3 text-xs font-semibold text-slate-600">
                                Free book preview
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#3D08BA]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3D08BA]">
                              {item.sourceLabel}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                              {item.accessLabel}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              {item.subject}
                            </p>
                            <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-950">
                              {item.title}
                            </h3>
                            <p className="mt-1 text-xs text-slate-600">
                              {item.authors.length > 0 ? item.authors.join(', ') : 'Author not listed'}
                            </p>
                          </div>

                          <p className="line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p>

                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                            <span>{item.licenseLabel}</span>
                            <span>{item.publishedAt || 'Date unavailable'}</span>
                          </div>
                          {recommendedFreeLibraryLookup.get(item.id)?.curatedByLabel ? (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                              {recommendedFreeLibraryLookup.get(item.id)?.curatedByLabel}
                            </div>
                          ) : null}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenFreeLibraryItem(item)}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3D08BA]"
                            >
                              <BookOpenIcon className="h-4 w-4" />
                              {item.actionLabel}
                            </button>
                            {recommendedFreeLibraryLookup.get(item.id)?.isRecommendedByCurrentUser &&
                            recommendedFreeLibraryLookup.get(item.id)?.recommendationId ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRemoveFreeLibraryRecommendation(
                                    recommendedFreeLibraryLookup.get(item.id) as FreeLibraryRecommendation
                                  )
                                }
                                disabled={
                                  activeRecommendationActionId ===
                                  `remove:${recommendedFreeLibraryLookup.get(item.id)?.recommendationId}`
                                }
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {activeRecommendationActionId ===
                                `remove:${recommendedFreeLibraryLookup.get(item.id)?.recommendationId}`
                                  ? 'Removing...'
                                  : 'Pinned'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleRecommendFreeLibraryItem(item)}
                                disabled={activeRecommendationActionId === `add:${item.id}`}
                                className="inline-flex items-center justify-center rounded-2xl border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-3 py-2.5 text-sm font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {activeRecommendationActionId === `add:${item.id}`
                                  ? 'Saving...'
                                  : 'Recommend'}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                    My Materials
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Published by your school</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Review what students can access, open files again, or remove outdated material.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilters((previous) => !previous)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA]"
                  >
                    <FunnelIcon className="h-4 w-4" />
                    Filters
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by title, subject, or description..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                  />
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                    setCategoryFilter('all');
                    setPricingFilter('all');
                    setWorkspaceView('all');
                    setVideoLane('all');
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA]"
                >
                  Reset
                </button>
              </div>

              {workspaceView !== 'all' ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-[#3D08BA]/12 bg-[#3D08BA]/5 px-4 py-3 text-sm text-slate-700">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#3D08BA]">
                      {workspaceViewLabel[workspaceView]}
                    </span>
                    <p className="text-sm text-slate-600">
                      {workspaceView === 'free-library'
                        ? 'Showing the school discovery shelf for safe free books from approved sources.'
                        : 'Showing materials opened from the school dashboard resource card.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setWorkspaceView('all')}
                      className="ml-auto rounded-full border border-[#3D08BA]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/5"
                    >
                      Show all materials
                    </button>
                  </div>
                  {workspaceView === 'video-lessons' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {([
                        ['all', `All videos (${myStats.videos})`],
                        ['uploaded', `Uploaded videos (${myStats.uploadedVideos})`],
                        ['recordings', `Live recordings (${myStats.liveRecordings})`],
                      ] as Array<[VideoLibraryLane, string]>).map(([lane, label]) => (
                        <button
                          key={lane}
                          type="button"
                          onClick={() => setVideoLane(lane)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            videoLane === lane
                              ? 'bg-[#3D08BA] text-white'
                              : 'border border-white/80 bg-white text-slate-600 hover:border-[#3D08BA]/15 hover:text-[#3D08BA]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showFilters ? (
                <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'pdf', 'video', 'image', 'audio', 'document'] as Array<'all' | ResourceType>).map(
                        (type) => (
                          <button
                            key={type}
                            onClick={() => setTypeFilter(type)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              typeFilter === type
                                ? 'bg-[#3D08BA] text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {type === 'all' ? 'All types' : type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          'all',
                          'assignment',
                          'classwork',
                          'note',
                          'library',
                          'live_recording',
                          'official_document',
                        ] as Array<
                          'all' | ResourceCategory
                        >
                      ).map((category) => (
                        <button
                          key={category}
                          onClick={() => setCategoryFilter(category)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            categoryFilter === category
                              ? 'bg-[#3D08BA] text-white'
                              : 'bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {category === 'all' ? 'All categories' : formatResourceCategoryLabel(category)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Access
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'free', 'paid'] as Array<'all' | ResourcePricingType>).map((pricing) => (
                        <button
                          key={pricing}
                          onClick={() => setPricingFilter(pricing)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            pricingFilter === pricing
                              ? 'bg-[#3D08BA] text-white'
                              : 'bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pricing === 'all' ? 'All access' : pricing.charAt(0).toUpperCase() + pricing.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">
                    Loading your materials...
                  </div>
                ) : filteredUploads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                      <FolderIcon className="h-7 w-7 text-slate-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">No school materials match this view</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Change the filters or publish a new e-book, video lesson, live recording, or official document.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredUploads.map((resource) => {
                      const Icon = getResourceIcon(resource.type);
                      const isViewing = activeActionId === `view:${resource.id}`;
                      const isDownloading = activeActionId === `download:${resource.id}`;
                      const isDeleting = activeDeleteId === resource.id;

                      return (
                        <article
                          key={resource.id}
                          className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)]"
                        >
                          <div className={`bg-gradient-to-br ${getResourceColor(resource.type)} p-5 text-white`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/16 ring-1 ring-white/20">
                                  <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                                    {resource.subject}
                                  </p>
                                  <h3 className="mt-1 text-lg font-semibold leading-6 text-white">
                                    {resource.title}
                                  </h3>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="rounded-full bg-white/16 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                                  {formatResourceCategoryLabel(resource.category)}
                                </span>
                                <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/90">
                                  {resource.pricingType === 'free' ? 'Free' : resource.priceLabel || 'Paid'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 p-5">
                            <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                              {resource.description}
                            </p>

                            <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                                <p className="font-semibold text-slate-700">Added</p>
                                <p className="mt-1 inline-flex items-center gap-1">
                                  <ClockIcon className="h-3.5 w-3.5" />
                                  {resource.uploadedDate}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                                <p className="font-semibold text-slate-700">Downloads</p>
                                <p className="mt-1 inline-flex items-center gap-1">
                                  <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                  {resource.downloads}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                                <p className="font-semibold text-slate-700">File</p>
                                <p className="mt-1 truncate">{resource.fileName}</p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                                <p className="font-semibold text-slate-700">Size</p>
                                <p className="mt-1">{resource.sizeLabel}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => void handleResourceAccess(resource, 'view')}
                                disabled={isViewing || isDownloading || isDeleting}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <EyeIcon className="h-4 w-4" />
                                {isViewing ? 'Opening...' : 'Preview'}
                              </button>
                              <button
                                onClick={() => void handleResourceAccess(resource, 'download')}
                                disabled={isViewing || isDownloading || isDeleting}
                                className="inline-flex items-center gap-2 rounded-2xl bg-[#3D08BA] px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d0690] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                {isDownloading ? 'Downloading...' : 'Download'}
                              </button>
                              <button
                                onClick={() => openEditDialog(resource)}
                                disabled={isViewing || isDownloading || isDeleting}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => void handleDeleteResource(resource)}
                                disabled={isViewing || isDownloading || isDeleting}
                                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <TrashIcon className="h-4 w-4" />
                                {isDeleting ? 'Removing...' : 'Remove'}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                    Library Updates
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-950">What students can now see</h2>
                </div>
                {unreadNotifications.length > 0 ? (
                  <button
                    onClick={() => void handleMarkAllRead()}
                    disabled={activeNotificationId !== null}
                    className="text-xs font-semibold text-[#3D08BA] transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activeNotificationId === 'all' ? 'Saving...' : 'Mark all read'}
                  </button>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No library updates yet.
                  </div>
                ) : (
                  notifications.slice(0, 6).map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-2xl border px-4 py-3 ${
                        notification.isRead
                          ? 'border-slate-200 bg-slate-50/80'
                          : 'border-[#3D08BA]/16 bg-[#3D08BA]/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                          <p className="mt-2 text-xs text-slate-500">{notification.createdAtLabel}</p>
                        </div>
                        {!notification.isRead ? (
                          <button
                            onClick={() => void handleNotificationRead(notification.id)}
                            disabled={activeNotificationId !== null}
                            className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {activeNotificationId === notification.id ? 'Saving...' : 'Mark read'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                Student Library Snapshot
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">Latest visible materials</h2>
              <p className="mt-1 text-sm text-slate-600">
                Quick preview of the newest items in the library feed.
              </p>

              <div className="mt-4 space-y-3">
                {libraryPreview.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No materials are visible yet.
                  </div>
                ) : (
                  libraryPreview.map((resource) => {
                    const Icon = getResourceIcon(resource.type);
                    return (
                      <div
                        key={resource.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3D08BA]/10 text-[#3D08BA]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">{resource.title}</p>
                              {resource.isNew ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                  <SparklesIcon className="h-3 w-3" />
                                  New
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {resource.subject} • {formatResourceCategoryLabel(resource.category)}
                            </p>
                            <p className="mt-2 text-sm text-slate-600">{resource.uploadedDate}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </aside>
        </main>
      </div>

      {uploadOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-3 sm:items-center sm:p-6">
          <form
            onSubmit={(event) => void handleUploadSubmit(event)}
            className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.20)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                  {isEditing ? 'Edit Material' : 'Publish Material'}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">
                  {isEditing ? 'Update this study material' : 'Add a new study material'}
                </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {isEditing
                      ? 'Change the details students see, or replace the current file if needed.'
                    : 'Upload e-books, video lessons, class support, or official school documents.'}
                  </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (uploading) {
                    return;
                  }
                  setUploadOpen(false);
                  setUploadError(null);
                }}
                className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                aria-label="Close upload dialog"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-5">
              {uploadError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {uploadError}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Material title
                  </label>
                  <input
                    required
                    value={uploadForm.title}
                    onChange={(event) =>
                      setUploadForm((previous) => ({ ...previous, title: event.target.value }))
                    }
                    placeholder="Example: Biology practical guide for SS2"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Subject
                  </label>
                  <input
                    required
                    value={uploadForm.subject}
                    onChange={(event) =>
                      setUploadForm((previous) => ({ ...previous, subject: event.target.value }))
                    }
                    placeholder="Mathematics"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Format
                  </label>
                  <select
                    value={uploadForm.type}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        type: event.target.value as ResourceType,
                        category:
                          previous.category === 'live_recording' && event.target.value !== 'video'
                            ? 'note'
                            : previous.category,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                  >
                    <option value="document">Document file</option>
                    <option value="pdf">PDF</option>
                    <option value="video">Video lesson / recording</option>
                    <option value="image">Image</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Material lane
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(event) =>
                      setUploadForm((previous) => {
                        const nextCategory = event.target.value as ResourceCategory;
                        return {
                          ...previous,
                          category: nextCategory,
                          type: nextCategory === 'live_recording' ? 'video' : previous.type,
                          pricingType: nextCategory === 'official_document' ? 'free' : previous.pricingType,
                          price: nextCategory === 'official_document' ? '' : previous.price,
                        };
                      })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                  >
                    <option value="assignment">Assignment support</option>
                    <option value="classwork">Classwork support</option>
                    <option value="note">Class notes</option>
                    <option value="library">E-Book / Library material</option>
                    <option value="live_recording">Live recording</option>
                    <option value="official_document">Official document</option>
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {uploadForm.category === 'live_recording'
                      ? 'Live recordings are kept inside the video lessons lane and must stay as video files.'
                      : uploadForm.category === 'official_document'
                      ? 'Use official documents for enrollment letters, notices, forms, and other school-issued files.'
                      : 'Choose the lane that best matches how students should find this material.'}
                  </p>
                </div>

                {uploadForm.category === 'official_document' ? (
                  <div className="sm:col-span-2 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Quick document templates
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Use a starter template to prefill the title and description, then generate the letter directly if you do not want to upload a separate file.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {OFFICIAL_DOCUMENT_TEMPLATES.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => applyOfficialDocumentTemplate(template.id)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              officialDocumentDraft.templateId === template.id
                                ? 'bg-[#3D08BA] text-white'
                                : 'border border-slate-200 bg-white text-slate-600 hover:border-[#3D08BA]/15 hover:text-[#3D08BA]'
                            }`}
                          >
                            {template.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {officialDocumentDraft.templateId ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Student name
                          </label>
                          <input
                            required
                            value={officialDocumentDraft.studentName}
                            onChange={(event) =>
                              setOfficialDocumentDraft((previous) => ({
                                ...previous,
                                studentName: event.target.value,
                              }))
                            }
                            placeholder="Student full name"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Admission / record number
                          </label>
                          <input
                            value={officialDocumentDraft.admissionNumber}
                            onChange={(event) =>
                              setOfficialDocumentDraft((previous) => ({
                                ...previous,
                                admissionNumber: event.target.value,
                              }))
                            }
                            placeholder="ADM-2026-014"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Class / level
                          </label>
                          <input
                            value={officialDocumentDraft.classGroup}
                            onChange={(event) =>
                              setOfficialDocumentDraft((previous) => ({
                                ...previous,
                                classGroup: event.target.value,
                              }))
                            }
                            placeholder="SS2 Blue"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Programme / unit
                          </label>
                          <input
                            value={officialDocumentDraft.programme}
                            onChange={(event) =>
                              setOfficialDocumentDraft((previous) => ({
                                ...previous,
                                programme: event.target.value,
                              }))
                            }
                            placeholder="Science programme"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Academic session
                          </label>
                          <input
                            value={officialDocumentDraft.academicSession}
                            onChange={(event) =>
                              setOfficialDocumentDraft((previous) => ({
                                ...previous,
                                academicSession: event.target.value,
                              }))
                            }
                            placeholder="2026/2027"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Issue date
                          </label>
                          <input
                            required
                            type="date"
                            value={officialDocumentDraft.issueDate}
                            onChange={(event) =>
                              setOfficialDocumentDraft((previous) => ({
                                ...previous,
                                issueDate: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Reference code
                          </label>
                          <input
                            value={officialDocumentDraft.referenceCode}
                            onChange={(event) =>
                              setOfficialDocumentDraft((previous) => ({
                                ...previous,
                                referenceCode: event.target.value,
                              }))
                            }
                            placeholder="REF-EDM-2603"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Signatory name
                          </label>
                          <input
                            value={officialDocumentDraft.signatoryName}
                            onChange={(event) =>
                              setOfficialDocumentDraft((previous) => ({
                                ...previous,
                                signatoryName: event.target.value,
                              }))
                            }
                            placeholder="School registrar"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Signatory title
                          </label>
                          <input
                            value={officialDocumentDraft.signatoryTitle}
                            onChange={(event) =>
                              setOfficialDocumentDraft((previous) => ({
                                ...previous,
                                signatoryTitle: event.target.value,
                              }))
                            }
                            placeholder="Registrar"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {uploadForm.category === 'official_document' ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Student access
                    </label>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                      Official documents are always free to students.
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Student access
                    </label>
                    <select
                      value={uploadForm.pricingType}
                      onChange={(event) =>
                        setUploadForm((previous) => ({
                          ...previous,
                          pricingType: event.target.value as ResourcePricingType,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                    >
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                )}

                {uploadForm.pricingType === 'paid' ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Price (NGN)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      required
                      value={uploadForm.price}
                      onChange={(event) =>
                        setUploadForm((previous) => ({ ...previous, price: event.target.value }))
                      }
                      placeholder="1500"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                    />
                  </div>
                ) : null}

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    School display name
                  </label>
                  <input
                    value={uploadForm.instructorName}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        instructorName: event.target.value,
                      }))
                    }
                    placeholder="Example: Edamaa Science Academy"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={uploadForm.description}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Tell students how to use this material."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {isEditing ? 'Replace file (optional)' : 'File'}
                  </label>
                  <input
                    type="file"
                    required={!isEditing && !(uploadForm.category === 'official_document' && officialDocumentDraft.templateId)}
                    onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.mp3,.wav,.mp4,.mov"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    {isEditing && editingResource
                      ? `Current file: ${editingResource.fileName}. Leave this empty to keep it.`
                      : uploadForm.category === 'official_document' && officialDocumentDraft.templateId
                      ? 'Optional. Leave this empty to generate the official document file from the fields above.'
                      : uploadForm.type === 'video' || uploadForm.category === 'live_recording'
                      ? 'Video lessons and live recordings can be larger, but smaller compressed files publish faster.'
                      : 'Keep standard files below 25MB.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  if (uploading) {
                    return;
                  }
                  setUploadOpen(false);
                  resetUpload();
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#3D08BA] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d0690] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CloudArrowUpIcon className="h-4 w-4" />
                {uploading ? (isEditing ? 'Saving...' : 'Publishing...') : isEditing ? 'Save changes' : 'Publish material'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export default SchoolResources;
