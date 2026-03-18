import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  BellIcon,
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

type ResourceType = 'pdf' | 'video' | 'image' | 'audio' | 'document';
type ResourceCategory = 'assignment' | 'classwork' | 'note' | 'library' | 'official_document';
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

const formatResourceCategoryLabel = (category: ResourceCategory) => {
  switch (category) {
    case 'assignment':
      return 'Assignment support';
    case 'classwork':
      return 'Classwork support';
    case 'library':
      return 'E-Book';
    case 'official_document':
      return 'Official document';
    case 'note':
    default:
      return 'Class notes';
  }
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

  useEffect(() => {
    void refreshFeed(false);
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
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-5 sm:py-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#3D08BA] transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back
                </button>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Resources & E-Library</h1>
                <p className="text-sm text-gray-600">
                  {isUploaderView
                    ? 'Upload and manage learning materials for assignments, classwork, and e-library support.'
                    : 'Materials shared by tutors and schools for assignments, classwork, and revision.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => void refreshFeed(true)}
                  disabled={isRefreshing || isLoading}
                  className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
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
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#3D08BA] text-white hover:bg-[#2D0690] transition-colors"
                  >
                    <CloudArrowUpIcon className="w-4 h-4" />
                    Upload Resource
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Total</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalResources}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Free</p>
                <p className="text-lg font-bold text-emerald-700">{stats.totalFreeResources}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Class Support</p>
                <p className="text-lg font-bold text-gray-900">{stats.classroomResources}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">E-Library</p>
                <p className="text-lg font-bold text-gray-900">{stats.libraryResources}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Unread Updates</p>
                <p className="text-lg font-bold text-[#3D08BA]">{stats.unreadNotifications}</p>
              </div>
            </div>

            {uploadSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {uploadSuccess}
              </div>
            )}

            {loadError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-5">
        {unreadNotifications.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <BellIcon className="w-5 h-5 text-[#3D08BA]" />
                <h2 className="text-sm sm:text-base font-bold text-gray-900">New Resource Updates</h2>
              </div>
              <button
                onClick={() => void handleMarkAllNotificationsAsRead()}
                disabled={isMarkingAllRead || activeNotificationActionId !== null}
                className="text-xs font-semibold text-[#3D08BA] hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isMarkingAllRead ? 'Updating...' : 'Mark all as read'}
              </button>
            </div>

            <div className="space-y-2">
              {unreadNotifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-xl border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{notification.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{notification.message}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{notification.createdAtLabel}</p>
                  </div>
                  <button
                    onClick={() => void handleMarkNotificationAsRead(notification.id)}
                    disabled={activeNotificationActionId === notification.id || isMarkingAllRead}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    {activeNotificationActionId === notification.id ? 'Saving...' : 'Mark read'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeCollection === collection.id
                    ? 'bg-[#3D08BA] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {collection.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, subject, tutor, or keyword..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-12 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent bg-white"
              />
            </div>
            <button
              onClick={() => setShowFilters((previous) => !previous)}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <FunnelIcon className="w-5 h-5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="space-y-3">
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                    ['all', 'assignment', 'classwork', 'note', 'library', 'official_document'] as Array<
                      'all' | ResourceCategory
                    >
                  ).map((category) => (
                    <button
                      key={category}
                      onClick={() => setFilterCategory(category)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
          <section className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-600">Loading your resource feed...</p>
          </section>
        ) : filteredResources.length === 0 ? (
          <section className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
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
              className="px-5 py-2.5 bg-[#3D08BA] text-white rounded-lg font-semibold hover:bg-[#2D0690] transition-colors"
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
                  className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200"
                >
                  <div className={`h-32 ${colorClass} flex items-center justify-center relative`}>
                    <Icon className="w-14 h-14 text-white/95" />
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
                    <div className="flex items-center justify-between gap-2 mb-2">
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

                    <div className="space-y-1.5 text-[11px] text-gray-600 mb-4 pb-3 border-b border-gray-100">
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
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                          resource.isLocked
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-[#3D08BA] text-white hover:bg-[#2D0690]'
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
