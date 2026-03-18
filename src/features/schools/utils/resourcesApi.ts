import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

export type ResourceType = 'pdf' | 'video' | 'image' | 'audio' | 'document';
export type ResourceCategory =
  | 'assignment'
  | 'classwork'
  | 'note'
  | 'library'
  | 'live_recording'
  | 'official_document';
export type ResourcePricingType = 'free' | 'paid';
export type ResourcePriority = 'high' | 'medium' | 'low';
export type ResourceUploaderRole = 'tutor' | 'school';

export type ResourceItem = {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: ResourceType;
  category: ResourceCategory;
  pricingType: ResourcePricingType;
  priceLabel: string | null;
  instructor: string;
  uploaderRole: ResourceUploaderRole;
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

export type ResourceNotification = {
  id: string;
  resourceId: string;
  title: string;
  message: string;
  priority: ResourcePriority;
  createdAt: string;
  createdAtLabel: string;
  isRead: boolean;
};

export type ResourcesFeedResponse = {
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

export type ResourcesUploadsResponse = {
  generatedAt: string;
  uploads: ResourceItem[];
  count: number;
  dataQuality: {
    degraded: boolean;
    source: 'memory' | 'prisma';
  };
};

export type UploadResourceInput = {
  title: string;
  description: string;
  subject: string;
  type: ResourceType;
  category: ResourceCategory;
  pricingType: ResourcePricingType;
  price: string;
  uploaderRole: ResourceUploaderRole;
  instructorName: string;
  file: File;
};

export type UpdateResourceInput = {
  title: string;
  description: string;
  subject: string;
  type: ResourceType;
  category: ResourceCategory;
  pricingType: ResourcePricingType;
  price: string;
  instructorName: string;
  file?: File | null;
};

export type UploadResourceResponse = {
  resource: ResourceItem;
  notification: ResourceNotification;
  message?: string;
};

export type DeleteResourceResponse = {
  deleted: boolean;
  resourceId: string;
  message?: string;
};

export type UpdateResourceResponse = {
  resource: ResourceItem;
  notification: ResourceNotification;
  message?: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const isLocalhostHost = (host: string) => host === '127.0.0.1' || host === 'localhost';

const resolveApiBaseCandidates = () => {
  const candidates = new Set<string>();
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
    // Ignore invalid JSON and fallback to text.
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
  options?: { isFormData?: boolean; actor?: ResourceUploaderRole }
) => {
  const token = loadPersistedSupabaseAccessToken();
  const localDevSession = loadPersistedLocalDevAuthSession();

  if (!token && !localDevSession?.email) {
    throw new Error('Sign in with your account first.');
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
        if (options?.actor) {
          headers.set('X-Dev-User-Role', options.actor);
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
      : 'Failed to reach the backend API';
  throw new Error(
    `${fallbackMessage}. Start the API with "bash scripts/api-up.sh", then retry.`
  );
};

export const parseFilenameFromContentDisposition = (contentDispositionHeader: string | null) => {
  if (!contentDispositionHeader) {
    return '';
  }

  const utfMatch = contentDispositionHeader.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]).trim();
  }

  const plainMatch = contentDispositionHeader.match(/filename=\"([^\"]+)\"/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return '';
};

export const fetchResourcesFeed = async (actor?: ResourceUploaderRole) => {
  const response = await requestWithAuth('/resources/me/feed', undefined, { actor });
  return (await response.json()) as ResourcesFeedResponse;
};

export const fetchResourceNotifications = async (actor?: ResourceUploaderRole) => {
  const response = await requestWithAuth('/resources/me/notifications', undefined, { actor });
  return (await response.json()) as {
    generatedAt: string;
    unreadCount: number;
    notifications: ResourceNotification[];
    dataQuality: {
      degraded: boolean;
      source: 'memory' | 'prisma';
    };
  };
};

export const markResourceNotificationAsRead = async (
  notificationId: string,
  actor?: ResourceUploaderRole
) => {
  const response = await requestWithAuth(
    `/resources/me/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    { actor }
  );
  return (await response.json()) as {
    notificationId: string;
    isRead: boolean;
    unreadCount: number;
  };
};

export const markAllResourceNotificationsAsRead = async (actor?: ResourceUploaderRole) => {
  const response = await requestWithAuth(
    '/resources/me/notifications/read-all',
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    { actor }
  );
  return (await response.json()) as {
    updated: number;
    unreadCount: number;
  };
};

export const fetchMyResourceUploads = async (actor?: ResourceUploaderRole) => {
  const response = await requestWithAuth('/resources/me/uploads', undefined, { actor });
  return (await response.json()) as ResourcesUploadsResponse;
};

export const uploadResourceForActor = async (
  input: UploadResourceInput,
  actor?: ResourceUploaderRole
) => {
  const formData = new FormData();
  formData.append('title', input.title);
  formData.append('description', input.description);
  formData.append('subject', input.subject);
  formData.append('type', input.type);
  formData.append('category', input.category);
  formData.append('pricingType', input.pricingType);
  if (input.pricingType === 'paid') {
    formData.append('price', input.price);
  }
  formData.append('uploaderRole', input.uploaderRole);
  formData.append('instructorName', input.instructorName);
  formData.append('file', input.file);

  const response = await requestWithAuth(
    '/resources/me/upload',
    {
      method: 'POST',
      body: formData,
    },
    { isFormData: true, actor }
  );
  return (await response.json()) as UploadResourceResponse;
};

export const updateResourceForActor = async (
  resourceId: string,
  input: UpdateResourceInput,
  actor?: ResourceUploaderRole
) => {
  const formData = new FormData();
  formData.append('title', input.title);
  formData.append('description', input.description);
  formData.append('subject', input.subject);
  formData.append('type', input.type);
  formData.append('category', input.category);
  formData.append('pricingType', input.pricingType);
  if (input.pricingType === 'paid') {
    formData.append('price', input.price);
  }
  formData.append('instructorName', input.instructorName);
  if (input.file) {
    formData.append('file', input.file);
  }

  const response = await requestWithAuth(
    `/resources/me/items/${encodeURIComponent(resourceId)}`,
    {
      method: 'PATCH',
      body: formData,
    },
    { isFormData: true, actor }
  );
  return (await response.json()) as UpdateResourceResponse;
};

export const deleteResourceForActor = async (
  resourceId: string,
  actor?: ResourceUploaderRole
) => {
  const response = await requestWithAuth(
    `/resources/me/items/${encodeURIComponent(resourceId)}`,
    { method: 'DELETE' },
    { actor }
  );
  return (await response.json()) as DeleteResourceResponse;
};

export const fetchResourceDownload = async (
  resourceId: string,
  mode: 'view' | 'download',
  actor?: ResourceUploaderRole
) => {
  return requestWithAuth(
    `/resources/me/items/${encodeURIComponent(resourceId)}/download?inline=${mode === 'view' ? '1' : '0'}`,
    { method: 'GET' },
    { actor }
  );
};
