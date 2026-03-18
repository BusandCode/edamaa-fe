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
  fetchMyResourceUploads,
  fetchResourceDownload,
  fetchResourcesFeed,
  markAllResourceNotificationsAsRead,
  markResourceNotificationAsRead,
  parseFilenameFromContentDisposition,
  type ResourceCategory,
  type ResourceItem,
  type ResourceNotification,
  type ResourcePricingType,
  type ResourceType,
  updateResourceForActor,
  uploadResourceForActor,
} from '../../schools/utils/resourcesApi';

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

const TutorResources = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [summary, setSummary] = useState<{
    totalResources: number;
    totalFreeResources: number;
    classroomResources: number;
    libraryResources: number;
    unreadNotifications: number;
  } | null>(null);
  const [libraryResources, setLibraryResources] = useState<ResourceItem[]>([]);
  const [uploads, setUploads] = useState<ResourceItem[]>([]);
  const [notifications, setNotifications] = useState<ResourceNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ResourceCategory>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | ResourcePricingType>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(createUploadForm());
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);
  const [activeNotificationId, setActiveNotificationId] = useState<string | 'all' | null>(null);

  const modeParam = (searchParams.get('mode') || '').trim().toLowerCase();

  const refreshWorkspace = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);

    try {
      const [feedPayload, uploadsPayload] = await Promise.all([
        fetchResourcesFeed('tutor'),
        fetchMyResourceUploads('tutor'),
      ]);
      setSummary(feedPayload.summary || null);
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

  useEffect(() => {
    void refreshWorkspace(false);
  }, []);

  useEffect(() => {
    if (modeParam === 'upload') {
      setUploadOpen(true);
      setUploadError(null);
      setNotice(null);
    }
  }, [modeParam]);

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

      return matchesSearch && matchesType && matchesCategory && matchesPricing;
    });
  }, [uploads, searchQuery, typeFilter, categoryFilter, pricingFilter]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead),
    [notifications]
  );

  const myStats = useMemo(
    () => ({
      total: uploads.length,
      free: uploads.filter((resource) => resource.pricingType === 'free').length,
      paid: uploads.filter((resource) => resource.pricingType === 'paid').length,
      classroom: uploads.filter((resource) => resource.category !== 'library').length,
    }),
    [uploads]
  );

  const libraryPreview = useMemo(() => libraryResources.slice(0, 4), [libraryResources]);

  const isEditing = editingResource !== null;

  const resetUpload = () => {
    setUploadForm(createUploadForm());
    setUploadFile(null);
    setUploadError(null);
    setEditingResource(null);
  };

  const openCreateDialog = () => {
    resetUpload();
    setUploadOpen(true);
    setNotice(null);
  };

  const openEditDialog = (resource: ResourceItem) => {
    setEditingResource(resource);
    setUploadForm(toUploadFormState(resource));
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
      const response = await fetchResourceDownload(resource.id, mode, 'tutor');
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
      await markResourceNotificationAsRead(notificationId, 'tutor');
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
      await markAllResourceNotificationsAsRead('tutor');
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
      const payload = await deleteResourceForActor(resource.id, 'tutor');
      setNotice(payload.message || `${resource.title} has been removed.`);
      setUploads((previous) => previous.filter((item) => item.id !== resource.id));
      setLibraryResources((previous) => previous.filter((item) => item.id !== resource.id));
      setNotifications((previous) =>
        previous.filter((notification) => notification.resourceId !== resource.id)
      );
      setSummary((previous) =>
        previous
          ? {
              ...previous,
              totalResources: Math.max(0, previous.totalResources - 1),
              totalFreeResources:
                resource.pricingType === 'free'
                  ? Math.max(0, previous.totalFreeResources - 1)
                  : previous.totalFreeResources,
              classroomResources:
                resource.category !== 'library'
                  ? Math.max(0, previous.classroomResources - 1)
                  : previous.classroomResources,
              libraryResources:
                resource.category === 'library'
                  ? Math.max(0, previous.libraryResources - 1)
                  : previous.libraryResources,
              unreadNotifications: Math.max(
                0,
                previous.unreadNotifications -
                  notifications.filter(
                    (notification) => !notification.isRead && notification.resourceId === resource.id
                  ).length
              ),
            }
          : previous
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

    if (!uploadFile && !isEditing) {
      setUploadError('Choose a file before publishing.');
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
      const payload = isEditing && editingResource
        ? await updateResourceForActor(
            editingResource.id,
            {
              ...uploadForm,
              file: uploadFile,
            },
            'tutor'
          )
        : await uploadResourceForActor(
            {
              ...uploadForm,
              uploaderRole: 'tutor',
              file: uploadFile as File,
            },
            'tutor'
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
                onClick={() => navigate('/tutor-dashboard')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA]"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to dashboard
              </button>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                  Tutor Resources
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Manage study materials in one place
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  Publish notes, revision help, classwork support, and library materials for students.
                  Everything you upload here appears in the student library immediately.
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
              <p className="mt-1 text-xs text-slate-500">Files uploaded from this tutor account.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Free materials
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">{myStats.free}</p>
              <p className="mt-1 text-xs text-slate-500">Open to all students immediately.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Paid materials
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">{myStats.paid}</p>
              <p className="mt-1 text-xs text-slate-500">Locked until a student buys access.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Class support
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{myStats.classroom}</p>
              <p className="mt-1 text-xs text-slate-500">Notes, classwork help, and assignment support.</p>
            </div>
            <div className="rounded-2xl border border-[#3D08BA]/12 bg-[#3D08BA]/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3D08BA]/70">
                Student library
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#3D08BA]">
                {summary?.totalResources ?? libraryResources.length}
              </p>
              <p className="mt-1 text-xs text-[#3D08BA]/70">
                {summary?.unreadNotifications ?? unreadNotifications.length} unread library updates.
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
            <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                    My Materials
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Published by you</h2>
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
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA]"
                >
                  Reset
                </button>
              </div>

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
                        ['all', 'assignment', 'classwork', 'note', 'library'] as Array<
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
                          {category === 'all'
                            ? 'All categories'
                            : category === 'classwork'
                            ? 'Classwork'
                            : category.charAt(0).toUpperCase() + category.slice(1)}
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
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">No tutor materials match this view</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Change the filters or publish a new material for students.
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
                                  {resource.category === 'classwork'
                                    ? 'Classwork'
                                    : resource.category}
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
                              {resource.subject} • {resource.category === 'classwork' ? 'Classwork' : resource.category}
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
                    : 'Upload notes, classwork help, assignment support, or library files.'}
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
                    Material type
                  </label>
                  <select
                    value={uploadForm.type}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        type: event.target.value as ResourceType,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                  >
                    <option value="document">Document</option>
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Category
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        category: event.target.value as ResourceCategory,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA]/30 focus:ring-4 focus:ring-[#3D08BA]/10"
                  >
                    <option value="assignment">Assignment support</option>
                    <option value="classwork">Classwork support</option>
                    <option value="note">Class notes</option>
                    <option value="library">E-Library</option>
                  </select>
                </div>

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
                    Tutor display name
                  </label>
                  <input
                    value={uploadForm.instructorName}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        instructorName: event.target.value,
                      }))
                    }
                    placeholder="Example: Adeola Okafor"
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
                    required={!isEditing}
                    onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.mp3,.wav,.mp4,.mov"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    {isEditing && editingResource
                      ? `Current file: ${editingResource.fileName}. Leave this empty to keep it.`
                      : 'Keep each file below 25MB.'}
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

export default TutorResources;
