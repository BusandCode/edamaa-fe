import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  BellIcon,
  BookOpenIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ClockIcon,
  DocumentTextIcon,
  EyeIcon,
  FolderIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  PhotoIcon,
  SparklesIcon,
  VideoCameraIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';
import {
  loadStudentIdentity,
  type StudentSchoolLevel,
} from '../utils/studentIdentity';

type ResourceType = 'pdf' | 'video' | 'image' | 'audio' | 'document';
type ResourceCategory =
  | 'assignment'
  | 'classwork'
  | 'note'
  | 'library'
  | 'live_recording'
  | 'official_document';
type ResourcePricingType = 'free' | 'paid';
type ResourcePriority = 'high' | 'medium' | 'low';

type ResourceItem = {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: ResourceType;
  category: ResourceCategory;
  pricingType: ResourcePricingType;
  priceLabel: string | null;
  instructor: string;
  uploaderRole: 'tutor' | 'school';
  uploadedAt: string;
  uploadedDate: string;
  downloads: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sizeLabel: string;
  isNew: boolean;
  isLocked: boolean;
  isPurchased: boolean;
};

type ResourceNotification = {
  id: string;
  resourceId: string;
  title: string;
  message: string;
  priority: ResourcePriority;
  createdAt: string;
  createdAtLabel: string;
  isRead: boolean;
};

type ResourcesFeedResponse = {
  generatedAt: string;
  summary: {
    totalResources: number;
    totalFreeResources: number;
    classroomResources: number;
    libraryResources: number;
    unreadNotifications: number;
  };
  notifications: ResourceNotification[];
  resources: ResourceItem[];
  dataQuality: {
    degraded: boolean;
    source: 'memory' | 'prisma';
  };
};

type UploadResourceResponse = {
  resource: ResourceItem;
  notification: ResourceNotification;
  message?: string;
};

type PurchaseResourceResponse = {
  purchased: boolean;
  message?: string;
  purchasedAt?: string;
  amountPaid?: number;
  resource?: ResourceItem;
};

type LocalNotification = {
  id: string;
  type: 'assignment' | 'grade' | 'announcement' | 'reminder' | 'achievement';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
};

type FreeLibraryProvider = 'open_library' | 'google_books';

type FreeLibraryItem = {
  id: string;
  source: FreeLibraryProvider;
  sourceLabel: string;
  title: string;
  authors: string[];
  description: string;
  subject: string;
  coverImageUrl: string | null;
  actionUrl: string;
  actionLabel: string;
  accessLabel: string;
  licenseLabel: string;
  publishedAt: string | null;
};

type FreeLibraryProviderStatus = {
  source: FreeLibraryProvider;
  sourceLabel: string;
  status: 'ok' | 'unavailable';
  note: string;
};

type FreeLibraryRecommendation = FreeLibraryItem & {
  recommendationId: string | null;
  curatedAt: string;
  curatedAtLabel: string;
  curatedByCount: number;
  curatedByLabel: string;
  isRecommendedByCurrentUser: boolean;
  note: string;
  targetSchoolLevel: StudentSchoolLevel;
  targetDepartment: string;
  targetClassGroup: string;
  audienceLabel: string;
  isGlobalRecommendation: boolean;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const isLocalhostHost = (host: string) => host === '127.0.0.1' || host === 'localhost';

const resolveApiBaseCandidates = () => {
  const candidates = new Set<string>();
  // Proxy route first keeps browser-side networking stable during local dev.
  candidates.add('/api');

  if (API_BASE_URL && API_BASE_URL !== '/api') {
    candidates.add(API_BASE_URL);
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
      return 'bg-red-500';
    case 'video':
      return 'bg-[#3D08BA]';
    case 'image':
      return 'bg-green-500';
    case 'audio':
      return 'bg-orange-500';
    case 'document':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

const FREE_LIBRARY_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Computer Studies',
] as const;

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

const getProviderStatusTone = (status: FreeLibraryProviderStatus['status']) => {
  return status === 'ok'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
};

const matchesRecommendationAudience = (
  recommendation: FreeLibraryRecommendation,
  identity: {
    schoolLevel?: StudentSchoolLevel;
    department?: string;
    classGroup?: string;
  }
) => {
  const normalizedDepartment = (identity.department || '').trim().toLowerCase();
  const normalizedClassGroup = (identity.classGroup || '').trim().toLowerCase();

  if (
    recommendation.targetSchoolLevel &&
    recommendation.targetSchoolLevel !== (identity.schoolLevel || '')
  ) {
    return false;
  }

  if (
    recommendation.targetDepartment &&
    recommendation.targetDepartment.trim().toLowerCase() !== normalizedDepartment
  ) {
    return false;
  }

  if (
    recommendation.targetClassGroup &&
    recommendation.targetClassGroup.trim().toLowerCase() !== normalizedClassGroup
  ) {
    return false;
  }

  return true;
};

const parseFilenameFromContentDisposition = (contentDispositionHeader: string | null) => {
  if (!contentDispositionHeader) {
    return '';
  }

  const utfMatch = contentDispositionHeader.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]).trim();
  }

  const plainMatch = contentDispositionHeader.match(/filename="([^"]+)"/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return '';
};

const readLocalNotifications = () => {
  if (typeof window === 'undefined') {
    return [] as LocalNotification[];
  }

  try {
    const raw = window.localStorage.getItem('notifications');
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as LocalNotification[];
  } catch {
    return [];
  }
};

const writeLocalNotifications = (notifications: LocalNotification[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem('notifications', JSON.stringify(notifications));
  window.dispatchEvent(new Event('notificationsUpdated'));
};

const syncResourceNotificationsToLocalStorage = (resourceNotifications: ResourceNotification[]) => {
  const existing = readLocalNotifications();
  const map = new Map(existing.map((notification) => [notification.id, notification]));
  let changed = false;

  resourceNotifications.forEach((notification) => {
    const localId = `resource:${notification.id}`;
    const priority =
      notification.priority === 'high'
        ? 'high'
        : notification.priority === 'low'
        ? 'low'
        : 'medium';
    const incoming: LocalNotification = {
      id: localId,
      type: 'announcement',
      title: notification.title,
      message: notification.message,
      time: notification.createdAtLabel,
      isRead: notification.isRead,
      priority,
    };

    const previous = map.get(localId);
    if (!previous) {
      map.set(localId, incoming);
      changed = true;
      return;
    }

    if (
      previous.isRead !== incoming.isRead ||
      previous.message !== incoming.message ||
      previous.title !== incoming.title ||
      previous.time !== incoming.time ||
      previous.priority !== incoming.priority
    ) {
      map.set(localId, incoming);
      changed = true;
    }
  });

  if (changed) {
    writeLocalNotifications(Array.from(map.values()));
  }
};

const markResourceLocalNotificationRead = (resourceNotificationId: string) => {
  const existing = readLocalNotifications();
  let changed = false;
  const updated = existing.map((notification) => {
    if (notification.id !== `resource:${resourceNotificationId}` || notification.isRead) {
      return notification;
    }

    changed = true;
    return {
      ...notification,
      isRead: true,
    };
  });

  if (changed) {
    writeLocalNotifications(updated);
  }
};

const Resources = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | ResourceType>('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterCategory, setFilterCategory] = useState<'all' | ResourceCategory>('all');
  const [activeCollection, setActiveCollection] = useState<'all' | 'classroom' | 'library'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [notifications, setNotifications] = useState<ResourceNotification[]>([]);
  const [summary, setSummary] = useState<ResourcesFeedResponse['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [freeLibraryQuery, setFreeLibraryQuery] = useState('');
  const [freeLibrarySubject, setFreeLibrarySubject] = useState<string>(
    FREE_LIBRARY_SUBJECTS[0]
  );
  const [freeLibraryItems, setFreeLibraryItems] = useState<FreeLibraryItem[]>([]);
  const [freeLibraryProviders, setFreeLibraryProviders] = useState<FreeLibraryProviderStatus[]>([]);
  const [isFreeLibraryLoading, setIsFreeLibraryLoading] = useState(true);
  const [freeLibraryError, setFreeLibraryError] = useState<string | null>(null);
  const [recommendedFreeLibraryItems, setRecommendedFreeLibraryItems] = useState<
    FreeLibraryRecommendation[]
  >([]);
  const [isRecommendedFreeLibraryLoading, setIsRecommendedFreeLibraryLoading] = useState(true);
  const [recommendedFreeLibraryError, setRecommendedFreeLibraryError] = useState<string | null>(
    null
  );

  const [activeResourceActionId, setActiveResourceActionId] = useState<string | null>(null);
  const [activePurchaseResourceId, setActivePurchaseResourceId] = useState<string | null>(null);
  const [activeNotificationActionId, setActiveNotificationActionId] = useState<string | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    subject: '',
    type: 'document' as ResourceType,
    category: 'note' as ResourceCategory,
    pricingType: 'free' as ResourcePricingType,
    price: '',
    uploaderRole: 'tutor' as 'tutor' | 'school',
    instructorName: '',
  });

  const actorParam = (searchParams.get('actor') || '').trim().toLowerCase();
  const dashboardActor =
    actorParam === 'tutor' || actorParam === 'school'
      ? (actorParam as 'tutor' | 'school')
      : null;
  const isUploaderView = dashboardActor !== null;
  const modeParam = (searchParams.get('mode') || '').trim().toLowerCase();

  const hasAuthSession = Boolean(
    loadPersistedSupabaseAccessToken() || loadPersistedLocalDevAuthSession()?.email
  );
  const studentIdentity = useMemo(() => loadStudentIdentity(), []);
  const hasStudentAcademicProfile = Boolean(
    studentIdentity.schoolLevel || studentIdentity.department || studentIdentity.classGroup
  );

  const extractErrorMessage = async (response: Response) => {
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        return payload.message.join(', ');
      }
      if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message;
      }
    } catch {
      // Use generic fallback below when payload is not JSON.
    }

    try {
      const text = await response.text();
      if (text.trim()) {
        return text.trim();
      }
    } catch {
      // Ignore text parsing errors and fallback below.
    }

    return `Request failed with status ${response.status}`;
  };

  const requestWithAuth = async (
    endpoint: string,
    init?: RequestInit,
    options?: { isFormData?: boolean }
  ) => {
    const token = loadPersistedSupabaseAccessToken();
    const localDevSession = loadPersistedLocalDevAuthSession();

    if (!token && !localDevSession?.email) {
      throw new Error('Sign in with your account to access resources.');
    }

    const bases = resolveApiBaseCandidates();
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
        const headers = new Headers(init?.headers || undefined);
        if (!options?.isFormData && !headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        if (localDevSession?.email) {
          headers.set('X-Dev-User-Email', localDevSession.email);
          if (isUploaderView && dashboardActor) {
            headers.set('X-Dev-User-Role', dashboardActor);
          }
        }

        response = await fetch(`${base}${endpoint}`, {
          ...init,
          headers,
        });
      } catch (error) {
        networkError = error instanceof Error ? error : new Error('Network request failed');
        continue;
      }

      if (!response.ok) {
        if (shouldTryNextBase(response, base)) {
          continue;
        }
        throw new Error(await extractErrorMessage(response));
      }

      return response;
    }

    const fallbackMessage =
      networkError?.message && networkError.message.trim()
        ? networkError.message
        : 'Failed to fetch';
    throw new Error(
      `${fallbackMessage}. Could not reach the backend API on ${bases.join(
        ', '
      )}. Start the API with "bash scripts/api-up.sh", then retry.`
    );
  };

  const refreshFeed = async (silent = false) => {
    if (!hasAuthSession) {
      setLoadError('Sign in first to load your live resource feed.');
      setIsLoading(false);
      return;
    }

    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadError(null);

    try {
      const response = await requestWithAuth('/resources/me/feed');
      const payload = (await response.json()) as ResourcesFeedResponse;
      setResources(Array.isArray(payload.resources) ? payload.resources : []);
      setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
      setSummary(payload.summary || null);
      syncResourceNotificationsToLocalStorage(Array.isArray(payload.notifications) ? payload.notifications : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'We could not load resources right now.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const refreshFreeLibrary = async (overrides?: { query?: string; subject?: string }) => {
    if (!hasAuthSession) {
      setFreeLibraryError('Sign in first to discover free books.');
      setIsFreeLibraryLoading(false);
      return;
    }

    const nextQuery =
      overrides && Object.prototype.hasOwnProperty.call(overrides, 'query')
        ? overrides.query || ''
        : freeLibraryQuery;
    const nextSubject =
      overrides && Object.prototype.hasOwnProperty.call(overrides, 'subject')
        ? overrides.subject || ''
        : freeLibrarySubject;

    setIsFreeLibraryLoading(true);
    setFreeLibraryError(null);

    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) {
        params.set('q', nextQuery.trim());
      }
      if (nextSubject.trim()) {
        params.set('subject', nextSubject.trim());
      }
      params.set('limit', '8');

      const response = await requestWithAuth(
        `/resources/discover/free-books?${params.toString()}`
      );
      const payload = (await response.json()) as {
        items?: FreeLibraryItem[];
        providers?: FreeLibraryProviderStatus[];
      };

      setFreeLibraryItems(Array.isArray(payload.items) ? payload.items : []);
      setFreeLibraryProviders(Array.isArray(payload.providers) ? payload.providers : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not load free books right now.';
      setFreeLibraryItems([]);
      setFreeLibraryProviders([]);
      setFreeLibraryError(message);
    } finally {
      setIsFreeLibraryLoading(false);
    }
  };

  const refreshRecommendedFreeLibrary = async () => {
    if (!hasAuthSession) {
      setRecommendedFreeLibraryError('Sign in first to view school recommendations.');
      setIsRecommendedFreeLibraryLoading(false);
      return;
    }

    setIsRecommendedFreeLibraryLoading(true);
    setRecommendedFreeLibraryError(null);

    try {
      const response = await requestWithAuth('/resources/free-books/recommended');
      const payload = (await response.json()) as {
        items?: FreeLibraryRecommendation[];
      };

      setRecommendedFreeLibraryItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not load school recommendations right now.';
      setRecommendedFreeLibraryItems([]);
      setRecommendedFreeLibraryError(message);
    } finally {
      setIsRecommendedFreeLibraryLoading(false);
    }
  };

  useEffect(() => {
    void refreshFeed(false);
    void refreshFreeLibrary();
    void refreshRecommendedFreeLibrary();
  }, []);

  useEffect(() => {
    if (!dashboardActor) {
      return;
    }

    setUploadForm((previous) => ({
      ...previous,
      uploaderRole: dashboardActor,
    }));
  }, [dashboardActor]);

  useEffect(() => {
    if (!isUploaderView) {
      if (isUploadOpen) {
        setIsUploadOpen(false);
      }
      return;
    }

    if (modeParam === 'upload') {
      setUploadError(null);
      setUploadSuccess(null);
      setIsUploadOpen(true);
    }
  }, [isUploaderView, isUploadOpen, modeParam]);

  const subjects = useMemo(() => {
    const source = new Set<string>();
    resources.forEach((resource) => {
      if (resource.subject?.trim()) {
        source.add(resource.subject.trim());
      }
    });
    return ['all', ...Array.from(source).sort((a, b) => a.localeCompare(b))];
  }, [resources]);

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        resource.title.toLowerCase().includes(normalizedSearch) ||
        resource.instructor.toLowerCase().includes(normalizedSearch) ||
        resource.subject.toLowerCase().includes(normalizedSearch) ||
        resource.description.toLowerCase().includes(normalizedSearch);

      const matchesType = filterType === 'all' || resource.type === filterType;
      const matchesSubject = filterSubject === 'all' || resource.subject === filterSubject;
      const matchesCategory = filterCategory === 'all' || resource.category === filterCategory;

      const matchesCollection =
        activeCollection === 'all'
          ? true
          : activeCollection === 'library'
          ? resource.category === 'library'
          : resource.category !== 'library' && resource.category !== 'official_document';

      return matchesSearch && matchesType && matchesSubject && matchesCategory && matchesCollection;
    });
  }, [resources, searchQuery, filterType, filterSubject, filterCategory, activeCollection]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead),
    [notifications]
  );

  const stats = useMemo(
    () => ({
      totalResources: summary?.totalResources ?? resources.length,
      totalFreeResources:
        summary?.totalFreeResources ?? resources.filter((resource) => resource.pricingType === 'free').length,
      classroomResources:
        summary?.classroomResources ??
        resources.filter(
          (resource) => resource.category !== 'library' && resource.category !== 'official_document'
        ).length,
      libraryResources:
        summary?.libraryResources ??
        resources.filter((resource) => resource.category === 'library').length,
      unreadNotifications: notifications.filter((notification) => !notification.isRead).length,
    }),
    [summary, resources, notifications]
  );

  const resourceHighlights = useMemo(
    () => ({
      ebooks: resources.filter((resource) => resource.category === 'library').length,
      videoLessons: resources.filter((resource) => resource.type === 'video').length,
      officialDocuments: resources.filter((resource) => resource.category === 'official_document').length,
      liveRecordings: resources.filter((resource) => resource.category === 'live_recording').length,
    }),
    [resources]
  );

  const visibleRecommendedFreeLibraryItems = useMemo(
    () =>
      recommendedFreeLibraryItems.filter((item) =>
        matchesRecommendationAudience(item, studentIdentity)
      ),
    [recommendedFreeLibraryItems, studentIdentity]
  );

  const targetedRecommendationsHiddenCount = Math.max(
    0,
    recommendedFreeLibraryItems.length - visibleRecommendedFreeLibraryItems.length
  );

  const latestResourceLabel = useMemo(() => {
    const latest = [...resources].sort((left, right) =>
      right.uploadedAt.localeCompare(left.uploadedAt)
    )[0];

    return latest?.uploadedDate || 'No uploads yet';
  }, [resources]);

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    if (activeNotificationActionId || isMarkingAllRead) {
      return;
    }

    setActiveNotificationActionId(notificationId);
    try {
      await requestWithAuth(`/resources/me/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification
        )
      );
      markResourceLocalNotificationRead(notificationId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not mark this update as read right now.';
      window.alert(message);
    } finally {
      setActiveNotificationActionId(null);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    if (isMarkingAllRead || activeNotificationActionId) {
      return;
    }

    setIsMarkingAllRead(true);
    try {
      await requestWithAuth('/resources/me/notifications/read-all', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
      notifications.forEach((notification) => {
        markResourceLocalNotificationRead(notification.id);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not mark all notifications as read right now.';
      window.alert(message);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleResourceAccess = async (resource: ResourceItem, mode: 'view' | 'download') => {
    if (resource.isLocked) {
      window.alert('This resource is locked. Buy it first to preview or download.');
      return;
    }

    const actionId = `${mode}-${resource.id}`;
    if (activeResourceActionId) {
      return;
    }

    setActiveResourceActionId(actionId);
    try {
      const response = await requestWithAuth(
        `/resources/me/items/${encodeURIComponent(resource.id)}/download?inline=${mode === 'view' ? '1' : '0'}`,
        { method: 'GET' }
      );

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const backendFileName = parseFilenameFromContentDisposition(
        response.headers.get('content-disposition')
      );
      const fileName = backendFileName || resource.fileName || `${resource.title}.bin`;

      if (mode === 'view') {
        const popup = window.open(objectUrl, '_blank', 'noopener,noreferrer');
        if (!popup) {
          window.alert('Could not open preview tab. Please allow popups and try again.');
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
      setResources((previous) =>
        previous.map((item) =>
          item.id === resource.id
            ? {
                ...item,
                downloads: item.downloads + 1,
              }
            : item
        )
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Resource action failed. Please try again.';
      window.alert(message);
    } finally {
      setActiveResourceActionId(null);
    }
  };

  const handlePurchaseResource = async (resource: ResourceItem) => {
    if (activePurchaseResourceId || !resource.isLocked) {
      return;
    }

    setActivePurchaseResourceId(resource.id);
    try {
      const response = await requestWithAuth(
        `/resources/me/items/${encodeURIComponent(resource.id)}/purchase`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );
      const payload = (await response.json()) as PurchaseResourceResponse;
      if (payload.resource) {
        setResources((previous) =>
          previous.map((item) => (item.id === resource.id ? payload.resource! : item))
        );
      } else {
        await refreshFeed(true);
      }

      window.alert(
        payload.message ||
          `Purchase successful. You can now open ${resource.title}.`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not complete purchase right now.';
      window.alert(message);
    } finally {
      setActivePurchaseResourceId(null);
    }
  };

  const handleFreeLibrarySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await refreshFreeLibrary();
  };

  const handleOpenFreeLibraryItem = (item: FreeLibraryItem) => {
    window.open(item.actionUrl, '_blank', 'noopener,noreferrer');
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      description: '',
      subject: '',
      type: 'document',
      category: 'note',
      pricingType: 'free',
      price: '',
      uploaderRole: 'tutor',
      instructorName: '',
    });
    setUploadFile(null);
  };

  const handleUploadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isUploading) {
      return;
    }

    if (!uploadFile) {
      setUploadError('Please choose a file to upload.');
      return;
    }

    if (uploadForm.pricingType === 'paid') {
      const numericPrice = Number(uploadForm.price);
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        setUploadError('Please set a valid price for this paid resource.');
        return;
      }
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('subject', uploadForm.subject);
      formData.append('type', uploadForm.type);
      formData.append('category', uploadForm.category);
      formData.append('pricingType', uploadForm.pricingType);
      if (uploadForm.pricingType === 'paid') {
        formData.append('price', uploadForm.price);
      }
      formData.append('uploaderRole', uploadForm.uploaderRole);
      formData.append('instructorName', uploadForm.instructorName);
      formData.append('file', uploadFile);

      const response = await requestWithAuth(
        '/resources/me/upload',
        {
          method: 'POST',
          body: formData,
        },
        { isFormData: true }
      );
      const payload = (await response.json()) as UploadResourceResponse;

      setUploadSuccess(
        payload.message || 'Resource uploaded successfully. Students can now see it in their feed.'
      );
      resetUploadForm();
      setIsUploadOpen(false);
      await refreshFeed(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Resource upload failed. Please try again.';
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F6F3FF] via-[#F8FAFC] to-[#EEF2FF]">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-[#3D08BA]"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Resources & E-Library</h1>
              <span className="inline-flex items-center rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                Student workspace
              </span>
            </div>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Latest library update
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{latestResourceLabel}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_24px_80px_-48px_rgba(61,8,186,0.45)] backdrop-blur xl:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#3D08BA]/10 via-[#3D08BA]/4 to-transparent" />
          <div className="pointer-events-none absolute -right-24 top-0 h-56 w-56 rounded-full bg-[#3D08BA]/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl" />

          <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.9fr] xl:items-start">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                <SparklesIcon className="h-4 w-4" />
                Learning library
              </div>

              <div className="max-w-3xl space-y-3">
                <h2 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                  One place for class materials, open books, and revision support
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                  {isUploaderView
                    ? 'Manage class support, uploaded materials, and free-library discovery from one polished workspace.'
                    : 'Browse what your school and tutors have shared, then discover extra free books from trusted education sources.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => void refreshFeed(true)}
                  disabled={isRefreshing || isLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh library'}
                </button>
                {isUploaderView && (
                  <button
                    onClick={() => {
                      setUploadError(null);
                      setUploadSuccess(null);
                      setUploadForm((previous) => ({
                        ...previous,
                        uploaderRole: dashboardActor || previous.uploaderRole,
                      }));
                      setIsUploadOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#3D08BA] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#3D08BA]/20 transition hover:bg-[#2D0690]"
                  >
                    <CloudArrowUpIcon className="h-4 w-4" />
                    Upload resource
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: 'Total materials', value: stats.totalResources, tone: 'text-gray-950' },
                  { label: 'Free access', value: stats.totalFreeResources, tone: 'text-emerald-700' },
                  { label: 'Class support', value: stats.classroomResources, tone: 'text-gray-950' },
                  { label: 'E-Library', value: stats.libraryResources, tone: 'text-gray-950' },
                  { label: 'Unread updates', value: stats.unreadNotifications, tone: 'text-[#3D08BA]' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                      {item.label}
                    </p>
                    <p className={`mt-2 text-2xl font-bold ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="grid gap-4 rounded-[24px] border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_20px_60px_-36px_rgba(15,23,42,0.9)]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
                  Library snapshot
                </p>
                <h3 className="mt-2 text-xl font-bold">What students can reach right now</h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {[
                  { label: 'E-Books', value: resourceHighlights.ebooks, helper: 'Textbooks and guides' },
                  { label: 'Video lessons', value: resourceHighlights.videoLessons, helper: 'Uploaded videos and replays' },
                  {
                    label: 'Official documents',
                    value: resourceHighlights.officialDocuments,
                    helper: 'Letters, notices, and school files',
                  },
                  {
                    label: 'Live recordings',
                    value: resourceHighlights.liveRecordings,
                    helper: 'Recorded class sessions',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="mt-1 text-xs text-white/65">{item.helper}</p>
                      </div>
                      <span className="text-2xl font-bold text-white">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-4 py-3 text-sm text-white/80">
                Latest feed update: <span className="font-semibold text-white">{latestResourceLabel}</span>
              </div>
            </aside>
          </div>
        </section>

        {uploadSuccess && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {uploadSuccess}
          </div>
        )}

        {loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {loadError}
          </div>
        )}

        {unreadNotifications.length > 0 && (
          <section className="overflow-hidden rounded-[26px] border border-white/80 bg-white/85 p-4 shadow-[0_22px_60px_-44px_rgba(61,8,186,0.35)] backdrop-blur sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BellIcon className="h-5 w-5 text-[#3D08BA]" />
                <h2 className="text-sm font-bold text-gray-900 sm:text-base">New resource updates</h2>
              </div>
              <button
                onClick={() => void handleMarkAllNotificationsAsRead()}
                disabled={isMarkingAllRead || activeNotificationActionId !== null}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#3D08BA] shadow-sm transition hover:border-[#3D08BA]/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isMarkingAllRead ? 'Updating...' : 'Mark all as read'}
              </button>
            </div>

            <div className="space-y-2">
              {unreadNotifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-[#3D08BA]/10 bg-gradient-to-r from-[#3D08BA]/6 via-white to-white px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 sm:text-sm">{notification.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{notification.message}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{notification.createdAtLabel}</p>
                  </div>
                  <button
                    onClick={() => void handleMarkNotificationAsRead(notification.id)}
                    disabled={activeNotificationActionId === notification.id || isMarkingAllRead}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 shadow-sm transition hover:border-[#3D08BA]/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    {activeNotificationActionId === notification.id ? 'Saving...' : 'Mark read'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-[0_20px_60px_-42px_rgba(61,8,186,0.28)] backdrop-blur sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                <SparklesIcon className="h-4 w-4" />
                School Recommended
              </div>
              <h2 className="mt-3 text-xl font-bold text-gray-950">
                Free books pinned for students
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                Start with the titles school admins have already recommended from trusted education
                sources.
              </p>
            </div>
            <span className="inline-flex self-start rounded-full border border-white/90 bg-white px-3 py-1.5 text-xs font-semibold text-[#3D08BA] shadow-sm">
              {visibleRecommendedFreeLibraryItems.length} curated picks
            </span>
          </div>

          {recommendedFreeLibraryError ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {recommendedFreeLibraryError}
            </div>
          ) : null}

          {!isRecommendedFreeLibraryLoading &&
          targetedRecommendationsHiddenCount > 0 &&
          !hasStudentAcademicProfile ? (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              Add your school level, department, or class group in your student profile to unlock
              more targeted school recommendations.
            </div>
          ) : null}

          {isRecommendedFreeLibraryLoading ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
              Loading school recommendations...
            </div>
          ) : visibleRecommendedFreeLibraryItems.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
              {recommendedFreeLibraryItems.length > 0
                ? 'No recommendations match your current academic profile yet.'
                : 'No school recommendations yet. Use the free-library search below to discover books.'}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {visibleRecommendedFreeLibraryItems.map((item) => (
                <article
                  key={`recommended-${item.id}`}
                  className="group overflow-hidden rounded-[24px] border border-emerald-100 bg-gradient-to-b from-white via-white to-emerald-50/60 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_-34px_rgba(16,185,129,0.22)]"
                >
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        {item.curatedByLabel}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#3D08BA] shadow-sm">
                        {item.sourceLabel}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {item.subject}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-base font-bold text-gray-900">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs text-gray-600">
                        {item.authors.length > 0 ? item.authors.join(', ') : 'Author not listed'}
                      </p>
                    </div>

                    <p className="line-clamp-3 text-sm text-gray-600">{item.description}</p>
                    {item.note ? (
                      <div className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-700">
                        {item.note}
                      </div>
                    ) : null}
                    {item.audienceLabel ? (
                      <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
                        For {item.audienceLabel}
                      </div>
                    ) : (
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                        Recommended for all students
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500">
                      <span>{item.licenseLabel}</span>
                      <span>{item.curatedAtLabel}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenFreeLibraryItem(item)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <BookOpenIcon className="h-4 w-4" />
                      {item.actionLabel}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-[0_24px_70px_-46px_rgba(61,8,186,0.38)] backdrop-blur sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/12 bg-[#3D08BA]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3D08BA]">
                  <BookOpenIcon className="h-4 w-4" />
                  Edamaa Free Library
                </div>
                <h2 className="mt-3 text-xl font-bold text-gray-950">
                  Discover free books from trusted education sources
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                  Search free and previewable books from Open Library and Google Books without leaving your learning workspace.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 self-start">
                {freeLibraryProviders.map((provider) => (
                  <span
                    key={provider.source}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${getProviderStatusTone(
                      provider.status
                    )}`}
                    title={provider.note}
                  >
                    {provider.sourceLabel}
                    <span className="text-[10px] uppercase tracking-wide">
                      {provider.status === 'ok' ? 'Live' : 'Limited'}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <form
              onSubmit={(event) => void handleFreeLibrarySubmit(event)}
              className="rounded-[24px] border border-[#3D08BA]/10 bg-gradient-to-r from-[#F8F5FF] via-white to-[#F5F7FF] p-4 shadow-inner"
            >
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={freeLibraryQuery}
                    onChange={(event) => setFreeLibraryQuery(event.target.value)}
                    placeholder="Search free books by title, topic, or author..."
                    className="w-full rounded-2xl border border-white bg-white/90 py-3 pl-12 pr-4 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isFreeLibraryLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3D08BA] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#3D08BA]/20 transition hover:bg-[#2D0690] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFreeLibraryLoading ? 'Searching...' : 'Search free books'}
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
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      freeLibrarySubject === subject
                        ? 'bg-[#3D08BA] text-white shadow-sm'
                        : 'bg-white text-gray-700 shadow-sm hover:bg-gray-100'
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </form>

            {freeLibraryError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {freeLibraryError}
                </div>
              ) : null}

            {isFreeLibraryLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
                Loading free books...
              </div>
            ) : freeLibraryItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
                No free books matched this search yet. Try a different topic or subject.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {freeLibraryItems.map((item) => (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-[24px] border border-gray-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_-34px_rgba(61,8,186,0.35)]"
                  >
                    <div className="flex h-44 items-center justify-center bg-gradient-to-br from-[#F5F0FF] via-white to-[#EEF2FF] p-4">
                      {item.coverImageUrl ? (
                        <img
                          src={item.coverImageUrl}
                          alt={item.title}
                          className="h-full max-h-36 rounded-xl border border-gray-200 object-contain shadow-sm transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full max-w-[10rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[#3D08BA]/20 bg-white text-center">
                          <BookOpenIcon className="h-8 w-8 text-[#3D08BA]" />
                          <p className="mt-2 px-3 text-xs font-semibold text-gray-600">
                            Free book preview
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#3D08BA]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#3D08BA]">
                          {item.sourceLabel}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          {item.accessLabel}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {item.subject}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-base font-bold text-gray-900">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-xs text-gray-600">
                          {item.authors.length > 0 ? item.authors.join(', ') : 'Author not listed'}
                        </p>
                      </div>

                      <p className="line-clamp-3 text-sm text-gray-600">{item.description}</p>

                      <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500">
                        <span>{item.licenseLabel}</span>
                        <span>{item.publishedAt || 'Date unavailable'}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenFreeLibraryItem(item)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3D08BA]"
                      >
                        <BookOpenIcon className="h-4 w-4" />
                        {item.actionLabel}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[26px] border border-white/80 bg-white/90 p-4 shadow-[0_20px_60px_-44px_rgba(15,23,42,0.22)] backdrop-blur sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: `All (${stats.totalResources})` },
              { id: 'classroom', label: `Class Support (${stats.classroomResources})` },
              { id: 'library', label: `E-Library (${stats.libraryResources})` },
            ].map((collection) => (
              <button
                key={collection.id}
                onClick={() =>
                  setActiveCollection(collection.id as 'all' | 'classroom' | 'library')
                }
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeCollection === collection.id
                    ? 'bg-slate-950 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {collection.label}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, subject, tutor, or keyword..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pl-12 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
              />
            </div>
            <button
              onClick={() => setShowFilters((previous) => !previous)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium shadow-sm transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA]"
            >
              <FunnelIcon className="w-5 h-5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                  Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'pdf', 'video', 'image', 'audio', 'document'] as Array<'all' | ResourceType>).map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          filterType === type
                            ? 'bg-[#3D08BA] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
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
                      onClick={() => setFilterCategory(category)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          filterCategory === category
                            ? 'bg-[#3D08BA] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category === 'all' ? 'All' : formatResourceCategoryLabel(category)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                  Subject
                </label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject) => (
                    <button
                      key={subject}
                      onClick={() => setFilterSubject(subject)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          filterSubject === subject
                            ? 'bg-[#3D08BA] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {subject === 'all' ? 'All' : subject}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {isLoading ? (
          <section className="rounded-[26px] border border-white/80 bg-white/90 p-8 text-center shadow-sm">
            <p className="text-sm text-gray-600">Loading your resource feed...</p>
          </section>
        ) : filteredResources.length === 0 ? (
          <section className="rounded-[26px] border border-white/80 bg-white/90 p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <FolderIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No resources match your filter</h3>
            <p className="text-gray-600 mb-5">
              Try a different subject, resource type, or search phrase.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterSubject('all');
                setFilterCategory('all');
                setActiveCollection('all');
              }}
              className="rounded-full bg-[#3D08BA] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#2D0690]"
            >
              Reset filters
            </button>
          </section>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredResources.map((resource) => {
              const Icon = getResourceIcon(resource.type);
              const colorClass = getResourceColor(resource.type);
              const isViewing = activeResourceActionId === `view-${resource.id}`;
              const isDownloading = activeResourceActionId === `download-${resource.id}`;
              const isPurchasing = activePurchaseResourceId === resource.id;

              return (
                <article
                  key={resource.id}
                  className="group overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_14px_40px_-28px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-36px_rgba(61,8,186,0.38)]"
                >
                  <div className={`relative flex h-32 items-center justify-center ${colorClass}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-slate-950/25" />
                    <Icon className="relative z-10 h-14 w-14 text-white/95 transition duration-300 group-hover:scale-105" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="bg-white/95 text-gray-700 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase">
                        {resource.type}
                      </span>
                      {resource.isNew && (
                        <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase inline-flex items-center gap-1">
                          <SparklesIcon className="w-3 h-3" />
                          New
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                            resource.pricingType === 'free'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {resource.pricingType === 'free' ? 'Free' : 'Paid'}
                        </span>
                        {resource.isPurchased && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase bg-blue-100 text-blue-700">
                            Unlocked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#3D08BA] uppercase tracking-wider">
                        {resource.subject}
                      </span>
                      <span className="text-[11px] text-gray-500">{resource.sizeLabel}</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 mb-2">
                      {resource.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-3">
                      {resource.description}
                    </p>

                    <div className="mb-4 grid gap-2 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 text-[11px] text-gray-600">
                      <p>
                        <span className="font-semibold text-gray-700">Uploaded by:</span> {resource.instructor}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">Category:</span>{' '}
                        {formatResourceCategoryLabel(resource.category)}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {resource.uploadedDate}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                          {resource.downloads} downloads
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => void handleResourceAccess(resource, 'view')}
                        disabled={isViewing || isDownloading || isPurchasing || resource.isLocked}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:border-[#3D08BA]/15 hover:text-[#3D08BA] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <EyeIcon className="w-4 h-4" />
                        {isViewing ? 'Opening...' : 'Preview'}
                      </button>
                      <button
                        onClick={() =>
                          resource.isLocked
                            ? void handlePurchaseResource(resource)
                            : void handleResourceAccess(resource, 'download')
                        }
                        disabled={isViewing || isDownloading || isPurchasing}
                        className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          resource.isLocked
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-slate-950 text-white hover:bg-[#3D08BA]'
                        }`}
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        {resource.isLocked
                          ? isPurchasing
                            ? 'Buying...'
                            : `Buy${resource.priceLabel ? ` • ${resource.priceLabel}` : ''}`
                          : isDownloading
                          ? 'Downloading...'
                          : 'Download'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {isUploadOpen && isUploaderView && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6">
          <form
            onSubmit={(event) => void handleUploadSubmit(event)}
            className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
          >
            <div className="px-4 sm:px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Upload Resource</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  Share assignment help, classwork support, or e-library material.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isUploading) {
                    return;
                  }
                  setIsUploadOpen(false);
                  setUploadError(null);
                }}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                aria-label="Close upload panel"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 sm:px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {uploadError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {uploadError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Resource title</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(event) =>
                      setUploadForm((previous) => ({ ...previous, title: event.target.value }))
                    }
                    placeholder="Example: Algebra assignment worked examples"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.subject}
                    onChange={(event) =>
                      setUploadForm((previous) => ({ ...previous, subject: event.target.value }))
                    }
                    placeholder="Mathematics"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Resource type</label>
                  <select
                    value={uploadForm.type}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        type: event.target.value as ResourceType,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                  >
                    <option value="document">Document</option>
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={uploadForm.category}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        category: event.target.value as ResourceCategory,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                  >
                    <option value="assignment">Assignment support</option>
                    <option value="classwork">Classwork support</option>
                    <option value="note">Class notes</option>
                    <option value="library">E-Library</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Uploader role</label>
                  <select
                    value={uploadForm.uploaderRole}
                    disabled={Boolean(dashboardActor)}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        uploaderRole: event.target.value as 'tutor' | 'school',
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                  >
                    <option value="tutor">Tutor</option>
                    <option value="school">School</option>
                  </select>
                  {dashboardActor && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      Role is locked from your dashboard context.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pricing</label>
                  <select
                    value={uploadForm.pricingType}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        pricingType: event.target.value as ResourcePricingType,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                  >
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                {uploadForm.pricingType === 'paid' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Price (NGN)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      required
                      value={uploadForm.price}
                      onChange={(event) =>
                        setUploadForm((previous) => ({
                          ...previous,
                          price: event.target.value,
                        }))
                      }
                      placeholder="1500"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tutor/School display name (optional)
                  </label>
                  <input
                    type="text"
                    value={uploadForm.instructorName}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        instructorName: event.target.value,
                      }))
                    }
                    placeholder="Example: Edamaa Science Academy"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={uploadForm.description}
                    onChange={(event) =>
                      setUploadForm((previous) => ({ ...previous, description: event.target.value }))
                    }
                    placeholder="Tell students how to use this material."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent resize-y"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">File</label>
                  <input
                    type="file"
                    required
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setUploadFile(file);
                    }}
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.mp3,.wav,.mp4,.mov"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Keep file size below 25MB for now.
                  </p>
                </div>
              </div>

              {uploadForm.pricingType === 'paid' && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Paid resources are only unlocked for students after purchase.
                </p>
              )}
            </div>

            <div className="px-4 sm:px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isUploading) {
                    return;
                  }
                  setIsUploadOpen(false);
                }}
                className="px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#3D08BA] text-white hover:bg-[#2D0690] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Publish resource'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Resources;
