import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type AuthUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  appMetadata?: Record<string, unknown> | null;
  userMetadata?: Record<string, unknown> | null;
};

type ResourceType = 'pdf' | 'video' | 'image' | 'audio' | 'document';
type ResourceCategory =
  | 'assignment'
  | 'classwork'
  | 'note'
  | 'library'
  | 'live_recording'
  | 'official_document';
type ResourcePricingType = 'free' | 'paid';
type UploaderRole = 'tutor' | 'school';
type ResourcePriority = 'high' | 'medium' | 'low';

type UploadResourceInput = {
  title?: string;
  description?: string;
  subject?: string;
  type?: string;
  category?: string;
  pricingType?: string;
  price?: string | number;
  uploaderRole?: string;
  instructorName?: string;
};

type ResourceRecord = {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: ResourceType;
  category: ResourceCategory;
  pricingType: ResourcePricingType;
  priceMinor: number | null;
  uploaderName: string;
  uploaderRole: UploaderRole;
  uploaderEmail: string;
  createdAt: Date;
  downloads: number;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
};

type ResourceFileRecord = {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
};

type ResourceNotificationRecord = {
  id: string;
  resourceId: string;
  title: string;
  message: string;
  priority: ResourcePriority;
  createdAt: Date;
};

type ResourceItemResponse = {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: ResourceType;
  category: ResourceCategory;
  pricingType: ResourcePricingType;
  priceLabel: string | null;
  instructor: string;
  uploaderRole: UploaderRole;
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

type ResourcePurchaseRecord = {
  id: string;
  resourceId: string;
  buyerEmail: string;
  amountMinor: number;
  createdAt: Date;
};

type ResourceNotificationItemResponse = {
  id: string;
  resourceId: string;
  title: string;
  message: string;
  priority: ResourcePriority;
  createdAt: string;
  createdAtLabel: string;
  isRead: boolean;
};

type FeedSummary = {
  totalResources: number;
  totalFreeResources: number;
  classroomResources: number;
  libraryResources: number;
  unreadNotifications: number;
};

type FreeLibraryProvider = 'open_library' | 'google_books';
type StudentSchoolLevel = '' | 'primary' | 'secondary' | 'tertiary';

type FreeLibrarySearchInput = {
  query?: string;
  subject?: string;
  limit?: string | number;
};

type FreeLibraryBookItemResponse = {
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

type FreeLibraryRecommendationInput = {
  id?: string;
  source?: string;
  sourceLabel?: string;
  title?: string;
  authors?: string[];
  description?: string;
  subject?: string;
  coverImageUrl?: string | null;
  actionUrl?: string;
  actionLabel?: string;
  accessLabel?: string;
  licenseLabel?: string;
  publishedAt?: string | null;
  note?: string;
  targetSchoolLevel?: string;
  targetDepartment?: string;
  targetClassGroup?: string;
};

type FreeLibraryRecommendationRecord = FreeLibraryBookItemResponse & {
  recommendationId: string;
  curatorEmail: string;
  curatorName: string;
  curatorRole: 'school';
  createdAt: Date;
  note: string;
  targetSchoolLevel: StudentSchoolLevel;
  targetDepartment: string;
  targetClassGroup: string;
};

type FreeLibraryAudiencePresetInput = {
  label?: string;
  targetSchoolLevel?: string;
  targetDepartment?: string;
  targetClassGroup?: string;
};

type FreeLibraryAudiencePresetRecord = {
  presetId: string;
  workspaceKey: string;
  workspaceLabel: string;
  curatorEmail: string;
  curatorName: string;
  label: string;
  targetSchoolLevel: StudentSchoolLevel;
  targetDepartment: string;
  targetClassGroup: string;
  createdAt: Date;
  updatedAt: Date;
};

type PersistedFreeLibraryRecommendationRecord = {
  publicId: string;
  bookId: string;
  source: string;
  sourceLabel: string;
  title: string;
  authors: Prisma.JsonValue;
  description: string;
  subject: string;
  coverImageUrl: string | null;
  actionUrl: string;
  actionLabel: string;
  accessLabel: string;
  licenseLabel: string;
  publishedAt: string | null;
  curatorEmail: string;
  curatorName: string;
  curatorRole: string;
  note: string | null;
  targetSchoolLevel: string | null;
  targetDepartment: string | null;
  targetClassGroup: string | null;
  recommendedAt: Date;
};

type PersistedFreeLibraryAudiencePresetRecord = {
  publicId: string;
  workspaceKey: string;
  workspaceLabel: string | null;
  curatorEmail: string;
  curatorName: string;
  label: string;
  targetSchoolLevel: string | null;
  targetDepartment: string | null;
  targetClassGroup: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type FreeLibraryRecommendationItemResponse = FreeLibraryBookItemResponse & {
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

type FreeLibraryAudiencePresetItemResponse = {
  presetId: string;
  label: string;
  targetSchoolLevel: StudentSchoolLevel;
  targetDepartment: string;
  targetClassGroup: string;
  audienceLabel: string;
  createdAt: string;
  updatedAt: string;
  updatedAtLabel: string;
};

type FreeLibraryProviderStatus = {
  source: FreeLibraryProvider;
  sourceLabel: string;
  status: 'ok' | 'unavailable';
  note: string;
};

type FreeLibraryCacheEntry = {
  key: string;
  query: string;
  subject: string;
  limit: number;
  items: FreeLibraryBookItemResponse[];
  providers: FreeLibraryProviderStatus[];
  cachedAtMs: number;
};

type FreeLibraryAudienceTarget = {
  targetSchoolLevel: StudentSchoolLevel;
  targetDepartment: string;
  targetClassGroup: string;
};

const STANDARD_MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const LIVE_RECORDING_MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;
const EXTERNAL_DISCOVERY_TIMEOUT_MS = 6000;
const FREE_LIBRARY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FREE_LIBRARY_CACHE_STALE_TTL_MS = 24 * 60 * 60 * 1000;

const getMaxUploadSizeBytes = (type: ResourceType, category: ResourceCategory) =>
  category === 'live_recording' || type === 'video'
    ? LIVE_RECORDING_MAX_UPLOAD_SIZE_BYTES
    : STANDARD_MAX_UPLOAD_SIZE_BYTES;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

const makeId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const sanitizeFileName = (value: string) =>
  value
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeEmail = (value: string | null | undefined) =>
  String(value || '').trim().toLowerCase();

const toRelativeLabel = (value: Date, now = new Date()) => {
  const deltaMs = now.getTime() - value.getTime();
  const deltaSeconds = Math.max(0, Math.floor(deltaMs / 1000));

  if (deltaSeconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const detectResourceTypeFromMime = (mimeType: string): ResourceType => {
  const normalized = String(mimeType || '').toLowerCase();

  if (normalized.includes('pdf')) {
    return 'pdf';
  }
  if (normalized.startsWith('video/')) {
    return 'video';
  }
  if (normalized.startsWith('image/')) {
    return 'image';
  }
  if (normalized.startsWith('audio/')) {
    return 'audio';
  }

  return 'document';
};

@Injectable()
export class ResourcesService implements OnModuleInit {
  private readonly logger = new Logger(ResourcesService.name);
  private readonly resources: ResourceRecord[] = [];
  private readonly filesByResourceId = new Map<string, ResourceFileRecord>();
  private readonly purchases: ResourcePurchaseRecord[] = [];
  private readonly purchasedEmailsByResourceId = new Map<string, Set<string>>();
  private readonly notifications: ResourceNotificationRecord[] = [];
  private readonly readNotificationIdsByEmail = new Map<string, Set<string>>();
  private readonly freeLibraryCache = new Map<string, FreeLibraryCacheEntry>();
  private readonly freeLibraryRecommendations: FreeLibraryRecommendationRecord[] = [];
  private readonly freeLibraryAudiencePresets: FreeLibraryAudiencePresetRecord[] = [];
  private purchasesHydrated = false;
  private recommendationsHydrated = false;
  private recommendationPresetsHydrated = false;
  private purchaseStoreBackoffUntil = 0;
  private recommendationStoreBackoffUntil = 0;
  private recommendationPresetStoreBackoffUntil = 0;
  private seeded = false;

  constructor(private readonly prisma: PrismaService) {
    this.seedIfNeeded();
  }

  async onModuleInit() {
    if (String(process.env.SKIP_PRISMA_CONNECT || '').trim() === '1') {
      this.logger.warn('Skipping resource purchase hydrate (SKIP_PRISMA_CONNECT=1).');
      return;
    }
    await this.hydratePersistedPurchases();
    await this.hydratePersistedFreeLibraryRecommendations();
    await this.hydratePersistedFreeLibraryAudiencePresets();
  }

  getFeedForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const readIds = this.getReadNotificationIds(email);

    const resources = this.resources.map((resource) => this.toResourceResponse(resource, email));
    const notifications = this.notifications.map((notification) =>
      this.toNotificationResponse(notification, readIds.has(notification.id))
    );

    const summary: FeedSummary = {
      totalResources: resources.length,
      totalFreeResources: resources.filter((resource) => resource.pricingType === 'free').length,
      classroomResources: resources.filter(
        (resource) =>
          resource.category !== 'library' && resource.category !== 'official_document'
      ).length,
      libraryResources: resources.filter((resource) => resource.category === 'library').length,
      unreadNotifications: notifications.filter((notification) => !notification.isRead).length,
    };

    return {
      generatedAt: new Date().toISOString(),
      summary,
      notifications,
      resources,
      dataQuality: {
        degraded: false,
        source: 'memory' as const,
      },
    };
  }

  getNotificationsForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const readIds = this.getReadNotificationIds(email);

    return {
      generatedAt: new Date().toISOString(),
      unreadCount: this.notifications.filter((notification) => !readIds.has(notification.id)).length,
      notifications: this.notifications.map((notification) =>
        this.toNotificationResponse(notification, readIds.has(notification.id))
      ),
      dataQuality: {
        degraded: false,
        source: 'memory' as const,
      },
    };
  }

  markNotificationAsReadForAuthUser(authUser: AuthUser, notificationId: string) {
    const email = this.requireEmail(authUser);
    const normalizedNotificationId = String(notificationId || '').trim();

    if (!normalizedNotificationId) {
      throw new BadRequestException('Notification id is required.');
    }

    const notificationExists = this.notifications.some(
      (notification) => notification.id === normalizedNotificationId
    );
    if (!notificationExists) {
      throw new NotFoundException('Notification could not be found.');
    }

    const readIds = this.getReadNotificationIds(email);
    readIds.add(normalizedNotificationId);

    return {
      notificationId: normalizedNotificationId,
      isRead: true,
      unreadCount: this.notifications.filter((notification) => !readIds.has(notification.id)).length,
    };
  }

  markAllNotificationsAsReadForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const readIds = this.getReadNotificationIds(email);
    this.notifications.forEach((notification) => readIds.add(notification.id));

    return {
      updated: this.notifications.length,
      unreadCount: 0,
    };
  }

  getUploadsForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const uploads = this.resources
      .filter((resource) => resource.uploaderEmail === email)
      .map((resource) => this.toResourceResponse(resource, email));

    return {
      generatedAt: new Date().toISOString(),
      uploads,
      count: uploads.length,
      dataQuality: {
        degraded: false,
        source: 'memory' as const,
      },
    };
  }

  async searchFreeLibraryForAuthUser(authUser: AuthUser, input: FreeLibrarySearchInput) {
    this.requireEmail(authUser);

    const query = this.normalizeOptionalText(input.query, 120);
    const subject = this.normalizeOptionalText(input.subject, 80);
    const limit = this.normalizeDiscoveryLimit(input.limit);
    const cacheKey = this.buildFreeLibraryCacheKey(query, subject, limit);
    const cachedEntry = this.getUsableFreeLibraryCacheEntry(cacheKey);

    if (cachedEntry && this.isFreshFreeLibraryCacheEntry(cachedEntry)) {
      return this.toFreeLibraryResponse(query, subject, cachedEntry.items, cachedEntry.providers, {
        status: 'fresh',
        cachedAt: new Date(cachedEntry.cachedAtMs).toISOString(),
        ageSeconds: Math.max(0, Math.floor((Date.now() - cachedEntry.cachedAtMs) / 1000)),
      });
    }

    const liveResult = await this.runLiveFreeLibrarySearch(query, subject, limit);
    const hasLiveProvider = liveResult.providers.some((provider) => provider.status === 'ok');

    if (hasLiveProvider) {
      this.freeLibraryCache.set(cacheKey, {
        key: cacheKey,
        query,
        subject,
        limit,
        items: liveResult.items,
        providers: liveResult.providers,
        cachedAtMs: Date.now(),
      });

      return this.toFreeLibraryResponse(query, subject, liveResult.items, liveResult.providers, {
        status: cachedEntry ? 'refreshed' : 'miss',
        cachedAt: new Date().toISOString(),
        ageSeconds: 0,
      });
    }

    if (cachedEntry) {
      this.logger.warn(
        `Free library upstream failed for key "${cacheKey}". Serving stale cached results.`
      );

      return this.toFreeLibraryResponse(
        query,
        subject,
        cachedEntry.items,
        this.toStaleFallbackProviderStatuses(cachedEntry.providers),
        {
          status: 'stale-fallback',
          cachedAt: new Date(cachedEntry.cachedAtMs).toISOString(),
          ageSeconds: Math.max(0, Math.floor((Date.now() - cachedEntry.cachedAtMs) / 1000)),
        }
      );
    }

    return this.toFreeLibraryResponse(query, subject, liveResult.items, liveResult.providers, {
      status: 'miss',
      cachedAt: null,
      ageSeconds: null,
    });
  }

  getRecommendedFreeBooksForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const items = this.buildRecommendedFreeBookItems(email);

    return {
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
    };
  }

  getFreeLibraryAudiencePresetsForAuthUser(authUser: AuthUser) {
    const workspace = this.resolveSchoolWorkspace(authUser);
    this.requireSchoolCuratorRole(authUser.role);

    const items = this.freeLibraryAudiencePresets
      .filter((preset) => preset.workspaceKey === workspace.key)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map((preset) => this.toFreeLibraryAudiencePresetItemResponse(preset));

    return {
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
    };
  }

  async recommendFreeBookForAuthUser(authUser: AuthUser, input: FreeLibraryRecommendationInput) {
    const email = this.requireEmail(authUser);
    this.requireSchoolCuratorRole(authUser.role);

    const normalizedItem = this.normalizeFreeLibraryRecommendationInput(input);
    const existing = this.freeLibraryRecommendations.find(
      (recommendation) =>
        recommendation.curatorEmail === email && recommendation.id === normalizedItem.id
    );

    if (existing) {
      existing.title = normalizedItem.title;
      existing.authors = normalizedItem.authors;
      existing.description = normalizedItem.description;
      existing.subject = normalizedItem.subject;
      existing.coverImageUrl = normalizedItem.coverImageUrl;
      existing.actionUrl = normalizedItem.actionUrl;
      existing.actionLabel = normalizedItem.actionLabel;
      existing.accessLabel = normalizedItem.accessLabel;
      existing.licenseLabel = normalizedItem.licenseLabel;
      existing.publishedAt = normalizedItem.publishedAt;
      existing.note = normalizedItem.note;
      existing.targetSchoolLevel = normalizedItem.targetSchoolLevel;
      existing.targetDepartment = normalizedItem.targetDepartment;
      existing.targetClassGroup = normalizedItem.targetClassGroup;
      existing.createdAt = new Date();
      await this.persistFreeLibraryRecommendationRecord(existing);

      return {
        item: this.toFreeLibraryRecommendationItemResponse([existing], email),
        message: `${existing.title} recommendation has been updated.`,
      };
    }

    const curatorName =
      this.normalizeOptionalText(authUser.name || '', 80) || this.defaultNameFromEmail(email);
    const recommendation: FreeLibraryRecommendationRecord = {
      ...normalizedItem,
      recommendationId: makeId('freerec'),
      curatorEmail: email,
      curatorName,
      curatorRole: 'school',
      createdAt: new Date(),
      note: normalizedItem.note,
      targetSchoolLevel: normalizedItem.targetSchoolLevel,
      targetDepartment: normalizedItem.targetDepartment,
      targetClassGroup: normalizedItem.targetClassGroup,
    };

    this.freeLibraryRecommendations.unshift(recommendation);
    await this.persistFreeLibraryRecommendationRecord(recommendation);

    return {
      item: this.toFreeLibraryRecommendationItemResponse([recommendation], email),
      message: `${recommendation.title} is now recommended to students.`,
    };
  }

  async saveFreeLibraryAudiencePresetForAuthUser(
    authUser: AuthUser,
    input: FreeLibraryAudiencePresetInput
  ) {
    const email = this.requireEmail(authUser);
    this.requireSchoolCuratorRole(authUser.role);
    const workspace = this.resolveSchoolWorkspace(authUser);

    const normalizedPreset = this.normalizeFreeLibraryAudiencePresetInput(input);
    const normalizedLabelKey = normalizedPreset.label.trim().toLowerCase();
    const existing = this.freeLibraryAudiencePresets.find(
      (preset) =>
        preset.workspaceKey === workspace.key &&
        preset.label.trim().toLowerCase() === normalizedLabelKey
    );

    if (existing) {
      existing.workspaceLabel = workspace.label;
      existing.curatorEmail = email;
      existing.targetSchoolLevel = normalizedPreset.targetSchoolLevel;
      existing.targetDepartment = normalizedPreset.targetDepartment;
      existing.targetClassGroup = normalizedPreset.targetClassGroup;
      existing.updatedAt = new Date();
      await this.persistFreeLibraryAudiencePresetRecord(existing);

      return {
        item: this.toFreeLibraryAudiencePresetItemResponse(existing),
        message: `${existing.label} audience preset has been updated.`,
      };
    }

    const curatorName =
      this.normalizeOptionalText(authUser.name || '', 80) || this.defaultNameFromEmail(email);
    const preset: FreeLibraryAudiencePresetRecord = {
      presetId: makeId('freeaud'),
      workspaceKey: workspace.key,
      workspaceLabel: workspace.label,
      curatorEmail: email,
      curatorName,
      label: normalizedPreset.label,
      targetSchoolLevel: normalizedPreset.targetSchoolLevel,
      targetDepartment: normalizedPreset.targetDepartment,
      targetClassGroup: normalizedPreset.targetClassGroup,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.freeLibraryAudiencePresets.unshift(preset);
    await this.persistFreeLibraryAudiencePresetRecord(preset);

    return {
      item: this.toFreeLibraryAudiencePresetItemResponse(preset),
      message: `${preset.label} audience preset is ready to reuse.`,
    };
  }

  async removeRecommendedFreeBookForAuthUser(authUser: AuthUser, recommendationId: string) {
    const email = this.requireEmail(authUser);
    this.requireSchoolCuratorRole(authUser.role);
    const normalizedRecommendationId = String(recommendationId || '').trim();

    if (!normalizedRecommendationId) {
      throw new BadRequestException('Recommendation id is required.');
    }

    const recommendationIndex = this.freeLibraryRecommendations.findIndex(
      (recommendation) => recommendation.recommendationId === normalizedRecommendationId
    );

    if (recommendationIndex < 0) {
      throw new NotFoundException('Recommendation could not be found.');
    }

    const recommendation = this.freeLibraryRecommendations[recommendationIndex];
    if (recommendation.curatorEmail !== email) {
      throw new ForbiddenException('You can only remove recommendations added from your account.');
    }

    this.freeLibraryRecommendations.splice(recommendationIndex, 1);
    await this.deletePersistedFreeLibraryRecommendationRecord(recommendation);

    return {
      removed: true,
      recommendationId: normalizedRecommendationId,
      message: `${recommendation.title} is no longer pinned for students.`,
    };
  }

  async removeFreeLibraryAudiencePresetForAuthUser(authUser: AuthUser, presetId: string) {
    const email = this.requireEmail(authUser);
    this.requireSchoolCuratorRole(authUser.role);
    const workspace = this.resolveSchoolWorkspace(authUser);
    const normalizedPresetId = String(presetId || '').trim();

    if (!normalizedPresetId) {
      throw new BadRequestException('Audience preset id is required.');
    }

    const presetIndex = this.freeLibraryAudiencePresets.findIndex(
      (preset) => preset.presetId === normalizedPresetId
    );

    if (presetIndex < 0) {
      throw new NotFoundException('Audience preset could not be found.');
    }

    const preset = this.freeLibraryAudiencePresets[presetIndex];
    if (preset.workspaceKey !== workspace.key) {
      throw new ForbiddenException('You can only remove presets saved for your school workspace.');
    }

    this.freeLibraryAudiencePresets.splice(presetIndex, 1);
    await this.deletePersistedFreeLibraryAudiencePresetRecord(preset);

    return {
      removed: true,
      presetId: preset.presetId,
      message: `${preset.label} audience preset has been removed.`,
    };
  }

  uploadResourceForAuthUser(
    authUser: AuthUser,
    input: UploadResourceInput,
    uploadedFile: any
  ) {
    const email = this.requireEmail(authUser);
    const defaultName = this.defaultNameFromEmail(email);
    const uploaderName = this.normalizeOptionalText(input.instructorName, 80) || authUser.name || defaultName;
    const uploaderRole = this.resolveUploaderRoleFromAuth(authUser.role);
    const title = this.normalizeRequiredText(input.title, 'Please add a clear resource title.', 120);
    const subject = this.normalizeRequiredText(input.subject, 'Please add a subject for this resource.', 80);
    const description = this.normalizeOptionalText(input.description, 500);
    const category = this.normalizeResourceCategory(input.category);
    const pricingType = this.normalizePricingType(input.pricingType);
    const priceMinor = this.parsePriceMinor(input.price, pricingType);

    if (!uploadedFile) {
      throw new BadRequestException('Please attach a file so students can access this resource.');
    }

    if (!uploadedFile.buffer || !Buffer.isBuffer(uploadedFile.buffer)) {
      throw new BadRequestException('Uploaded file is invalid. Please re-attach and try again.');
    }

    const size = Number(uploadedFile.size || uploadedFile.buffer.length || 0);
    if (size <= 0) {
      throw new BadRequestException('Uploaded file is empty. Please choose a valid file.');
    }
    const resourceType = this.normalizeResourceType(input.type, String(uploadedFile.mimetype || ''));
    const maxUploadSizeBytes = getMaxUploadSizeBytes(resourceType, category);
    if (size > maxUploadSizeBytes) {
      const maxUploadSizeLabel =
        maxUploadSizeBytes === LIVE_RECORDING_MAX_UPLOAD_SIZE_BYTES ? '250MB' : '25MB';
      throw new BadRequestException(`File is too large. Keep uploads below ${maxUploadSizeLabel} for this material.`);
    }
    if (category === 'live_recording' && resourceType !== 'video') {
      throw new BadRequestException('Live recordings must be uploaded as video files.');
    }
    const safeOriginalName = sanitizeFileName(String(uploadedFile.originalname || 'resource-file')) || 'resource-file';
    const resourceId = makeId('res');
    const createdAt = new Date();
    const mimeType = String(uploadedFile.mimetype || 'application/octet-stream').trim() || 'application/octet-stream';

    const resource: ResourceRecord = {
      id: resourceId,
      title,
      description: description || this.defaultDescriptionForType(resourceType),
      subject,
      type: resourceType,
      category,
      pricingType,
      priceMinor,
      uploaderName: String(uploaderName || defaultName).trim(),
      uploaderRole,
      uploaderEmail: email,
      createdAt,
      downloads: 0,
      fileName: safeOriginalName,
      mimeType,
      fileSizeBytes: size,
    };

    this.resources.unshift(resource);
    this.filesByResourceId.set(resource.id, {
      fileName: safeOriginalName,
      mimeType,
      bytes: Buffer.from(uploadedFile.buffer),
    });

    const notification = this.createNotificationForResource(resource);
    this.notifications.unshift(notification);

    return {
      resource: this.toResourceResponse(resource, email),
      notification: this.toNotificationResponse(notification, false),
      message: `${resource.title} is now live in the student resources feed.`,
      dataQuality: {
        degraded: false,
        source: 'memory' as const,
      },
    };
  }

  updateResourceForAuthUser(
    authUser: AuthUser,
    resourceId: string,
    input: UploadResourceInput,
    uploadedFile?: any
  ) {
    const email = this.requireEmail(authUser);
    const normalizedResourceId = String(resourceId || '').trim();

    if (!normalizedResourceId) {
      throw new BadRequestException('Resource id is required.');
    }

    const resource = this.resources.find((item) => item.id === normalizedResourceId);
    if (!resource) {
      throw new NotFoundException('Resource could not be found.');
    }

    if (resource.uploaderEmail !== email) {
      throw new ForbiddenException('You can only update materials uploaded from your account.');
    }

    const nextTitle = this.normalizeUpdatedRequiredText(
      input.title,
      resource.title,
      'Please add a clear resource title.',
      120
    );
    const nextSubject = this.normalizeUpdatedRequiredText(
      input.subject,
      resource.subject,
      'Please add a subject for this resource.',
      80
    );
    const nextType = this.resolveUpdatedResourceType(input.type, resource.type, uploadedFile);
    const nextDescription =
      input.description === undefined
        ? resource.description
        : this.normalizeOptionalText(input.description, 500) || this.defaultDescriptionForType(nextType);
    const nextCategory =
      input.category === undefined ? resource.category : this.normalizeResourceCategory(input.category);
    const nextPricingType =
      input.pricingType === undefined ? resource.pricingType : this.normalizePricingType(input.pricingType);
    const nextPriceMinor = this.resolveUpdatedPriceMinor(input.price, nextPricingType, resource.priceMinor);
    const nextUploaderName =
      input.instructorName === undefined
        ? resource.uploaderName
        : this.normalizeOptionalText(input.instructorName, 80) ||
          authUser.name ||
          this.defaultNameFromEmail(email);

    if (nextCategory === 'live_recording' && nextType !== 'video') {
      throw new BadRequestException('Live recordings must be uploaded as video files.');
    }
    const validatedFile = this.validateOptionalUploadedFile(uploadedFile, {
      type: nextType,
      category: nextCategory,
    });

    resource.title = nextTitle;
    resource.subject = nextSubject;
    resource.description =
      nextDescription || this.defaultDescriptionForType(nextType);
    resource.category = nextCategory;
    resource.pricingType = nextPricingType;
    resource.priceMinor = nextPriceMinor;
    resource.uploaderName = String(nextUploaderName || resource.uploaderName).trim();
    resource.type = nextType;

    if (validatedFile) {
      const nextMimeType =
        String(validatedFile.mimetype || 'application/octet-stream').trim() ||
        'application/octet-stream';
      const nextFileName =
        sanitizeFileName(String(validatedFile.originalname || resource.fileName || 'resource-file')) ||
        resource.fileName ||
        'resource-file';

      resource.fileName = nextFileName;
      resource.mimeType = nextMimeType;
      resource.fileSizeBytes = Number(validatedFile.size || validatedFile.buffer.length || 0);
      this.filesByResourceId.set(resource.id, {
        fileName: nextFileName,
        mimeType: nextMimeType,
        bytes: Buffer.from(validatedFile.buffer),
      });
    }

    const notification = this.createUpdatedNotificationForResource(resource);
    this.notifications.unshift(notification);

    return {
      resource: this.toResourceResponse(resource, email),
      notification: this.toNotificationResponse(notification, false),
      message: `${resource.title} has been updated in the student library.`,
      dataQuality: {
        degraded: false,
        source: 'memory' as const,
      },
    };
  }

  getResourceDownloadForAuthUser(authUser: AuthUser, resourceId: string) {
    const email = this.requireEmail(authUser);
    const normalizedResourceId = String(resourceId || '').trim();

    if (!normalizedResourceId) {
      throw new BadRequestException('Resource id is required.');
    }

    const resource = this.resources.find((item) => item.id === normalizedResourceId);
    if (!resource) {
      throw new NotFoundException('Resource could not be found.');
    }

    if (resource.pricingType === 'paid' && !this.canAccessPaidResource(resource, email)) {
      throw new ForbiddenException(
        'This resource is locked. Please purchase it first to preview or download.'
      );
    }

    const fileRecord = this.filesByResourceId.get(normalizedResourceId);
    if (!fileRecord) {
      throw new NotFoundException('This resource file is no longer available.');
    }

    resource.downloads += 1;

    return {
      fileName: fileRecord.fileName,
      mimeType: fileRecord.mimeType,
      bytes: fileRecord.bytes,
      resource: this.toResourceResponse(resource, email),
    };
  }

  async purchaseResourceForAuthUser(authUser: AuthUser, resourceId: string) {
    const email = this.requireEmail(authUser);
    const normalizedResourceId = String(resourceId || '').trim();

    if (!normalizedResourceId) {
      throw new BadRequestException('Resource id is required.');
    }

    const resource = this.resources.find((item) => item.id === normalizedResourceId);
    if (!resource) {
      throw new NotFoundException('Resource could not be found.');
    }

    if (resource.pricingType !== 'paid') {
      return {
        purchased: false,
        message: 'This resource is already free for all students.',
        resource: this.toResourceResponse(resource, email),
      };
    }

    if (resource.uploaderEmail === email || this.hasPurchasedResource(resource.id, email)) {
      return {
        purchased: false,
        message: 'You already have access to this resource.',
        resource: this.toResourceResponse(resource, email),
      };
    }

    const purchase: ResourcePurchaseRecord = {
      id: makeId('respurchase'),
      resourceId: resource.id,
      buyerEmail: email,
      amountMinor: resource.priceMinor || 0,
      createdAt: new Date(),
    };

    this.purchases.unshift(purchase);
    this.getPurchasedEmails(resource.id).add(email);
    await this.persistPurchaseRecord(purchase);

    return {
      purchased: true,
      message: `Access granted. You can now open ${resource.title}.`,
      purchasedAt: purchase.createdAt.toISOString(),
      amountPaid: this.toNaira(resource.priceMinor || 0),
      resource: this.toResourceResponse(resource, email),
    };
  }

  deleteResourceForAuthUser(authUser: AuthUser, resourceId: string) {
    const email = this.requireEmail(authUser);
    const normalizedResourceId = String(resourceId || '').trim();

    if (!normalizedResourceId) {
      throw new BadRequestException('Resource id is required.');
    }

    const resourceIndex = this.resources.findIndex((item) => item.id === normalizedResourceId);
    if (resourceIndex < 0) {
      throw new NotFoundException('Resource could not be found.');
    }

    const resource = this.resources[resourceIndex];
    if (resource.uploaderEmail !== email) {
      throw new ForbiddenException('You can only remove materials uploaded from your account.');
    }

    this.resources.splice(resourceIndex, 1);
    this.filesByResourceId.delete(resource.id);
    this.purchasedEmailsByResourceId.delete(resource.id);

    for (let index = this.purchases.length - 1; index >= 0; index -= 1) {
      if (this.purchases[index]?.resourceId === resource.id) {
        this.purchases.splice(index, 1);
      }
    }

    for (let index = this.notifications.length - 1; index >= 0; index -= 1) {
      if (this.notifications[index]?.resourceId === resource.id) {
        this.notifications.splice(index, 1);
      }
    }

    this.readNotificationIdsByEmail.forEach((readIds) => {
      Array.from(readIds).forEach((notificationId) => {
        const stillExists = this.notifications.some((notification) => notification.id === notificationId);
        if (!stillExists) {
          readIds.delete(notificationId);
        }
      });
    });

    return {
      deleted: true,
      resourceId: resource.id,
      message: `${resource.title} has been removed from the student library.`,
    };
  }

  private async hydratePersistedPurchases() {
    if (this.purchasesHydrated) {
      return;
    }
    this.purchasesHydrated = true;

    try {
      const storedPurchases = await this.prisma.resourcePurchase.findMany({
        orderBy: [{ purchasedAt: 'desc' }],
        take: 4000,
      });

      storedPurchases.forEach((purchase) => {
        const record: ResourcePurchaseRecord = {
          id: purchase.publicId,
          resourceId: purchase.resourceId,
          buyerEmail: normalizeEmail(purchase.buyerEmail),
          amountMinor: purchase.amountMinor,
          createdAt: purchase.purchasedAt,
        };

        this.purchases.push(record);
        this.getPurchasedEmails(record.resourceId).add(record.buyerEmail);
      });

      if (storedPurchases.length > 0) {
        this.logger.log(`Loaded ${storedPurchases.length} persisted resource purchases.`);
      }
    } catch (error) {
      if (this.isResourcePersistenceUnavailableError(error)) {
        this.logger.warn(
          'Resource purchase persistence is unavailable. Falling back to in-memory purchases only.'
        );
        return;
      }

      this.logger.warn(
        `Could not hydrate resource purchases. Falling back to memory mode (${(error as Error).message}).`
      );
    }
  }

  private async persistPurchaseRecord(purchase: ResourcePurchaseRecord) {
    if (Date.now() < this.purchaseStoreBackoffUntil) {
      return;
    }

    try {
      await this.prisma.resourcePurchase.upsert({
        where: {
          resourceId_buyerEmail: {
            resourceId: purchase.resourceId,
            buyerEmail: purchase.buyerEmail,
          },
        },
        create: {
          publicId: purchase.id,
          resourceId: purchase.resourceId,
          buyerEmail: purchase.buyerEmail,
          amountMinor: purchase.amountMinor,
          purchasedAt: purchase.createdAt,
        },
        update: {
          amountMinor: purchase.amountMinor,
          purchasedAt: purchase.createdAt,
        },
      });
    } catch (error) {
      if (this.isResourcePersistenceUnavailableError(error)) {
        // Avoid log spam when local DB schema is not yet migrated.
        this.purchaseStoreBackoffUntil = Date.now() + 60_000;
        this.logger.warn(
          'Resource purchase persistence failed. Retrying in 60s while keeping in-memory access.'
        );
        return;
      }

      this.logger.warn(
        `Persisting resource purchase failed (${(error as Error).message}). In-memory access still works.`
      );
    }
  }

  private async hydratePersistedFreeLibraryRecommendations() {
    if (this.recommendationsHydrated) {
      return;
    }
    this.recommendationsHydrated = true;

    try {
      const storedRecommendations = await this.prisma.resourceFreeBookRecommendation.findMany({
        orderBy: [{ recommendedAt: 'desc' }],
        take: 4000,
      });

      storedRecommendations.forEach((recommendation) => {
        this.freeLibraryRecommendations.push(
          this.toStoredFreeLibraryRecommendationRecord(recommendation)
        );
      });

      if (storedRecommendations.length > 0) {
        this.logger.log(
          `Loaded ${storedRecommendations.length} persisted free-library recommendations.`
        );
      }
    } catch (error) {
      if (this.isResourcePersistenceUnavailableError(error)) {
        this.logger.warn(
          'Free-library recommendation persistence is unavailable. Falling back to in-memory recommendations only.'
        );
        return;
      }

      this.logger.warn(
        `Could not hydrate free-library recommendations. Falling back to memory mode (${(error as Error).message}).`
      );
    }
  }

  private async persistFreeLibraryRecommendationRecord(
    recommendation: FreeLibraryRecommendationRecord
  ) {
    if (Date.now() < this.recommendationStoreBackoffUntil) {
      return;
    }

    try {
      await this.prisma.resourceFreeBookRecommendation.upsert({
        where: {
          bookId_curatorEmail: {
            bookId: recommendation.id,
            curatorEmail: recommendation.curatorEmail,
          },
        },
        create: {
          publicId: recommendation.recommendationId,
          bookId: recommendation.id,
          source: recommendation.source,
          sourceLabel: recommendation.sourceLabel,
          title: recommendation.title,
          authors: recommendation.authors as Prisma.InputJsonValue,
          description: recommendation.description,
          subject: recommendation.subject,
          coverImageUrl: recommendation.coverImageUrl,
          actionUrl: recommendation.actionUrl,
          actionLabel: recommendation.actionLabel,
          accessLabel: recommendation.accessLabel,
          licenseLabel: recommendation.licenseLabel,
          publishedAt: recommendation.publishedAt,
          curatorEmail: recommendation.curatorEmail,
          curatorName: recommendation.curatorName,
          curatorRole: recommendation.curatorRole,
          note: recommendation.note || null,
          targetSchoolLevel: recommendation.targetSchoolLevel || null,
          targetDepartment: recommendation.targetDepartment || null,
          targetClassGroup: recommendation.targetClassGroup || null,
          recommendedAt: recommendation.createdAt,
        },
        update: {
          source: recommendation.source,
          sourceLabel: recommendation.sourceLabel,
          title: recommendation.title,
          authors: recommendation.authors as Prisma.InputJsonValue,
          description: recommendation.description,
          subject: recommendation.subject,
          coverImageUrl: recommendation.coverImageUrl,
          actionUrl: recommendation.actionUrl,
          actionLabel: recommendation.actionLabel,
          accessLabel: recommendation.accessLabel,
          licenseLabel: recommendation.licenseLabel,
          publishedAt: recommendation.publishedAt,
          curatorName: recommendation.curatorName,
          curatorRole: recommendation.curatorRole,
          note: recommendation.note || null,
          targetSchoolLevel: recommendation.targetSchoolLevel || null,
          targetDepartment: recommendation.targetDepartment || null,
          targetClassGroup: recommendation.targetClassGroup || null,
          recommendedAt: recommendation.createdAt,
        },
      });
    } catch (error) {
      if (this.isResourcePersistenceUnavailableError(error)) {
        this.recommendationStoreBackoffUntil = Date.now() + 60_000;
        this.logger.warn(
          'Free-library recommendation persistence failed. Retrying in 60s while keeping in-memory recommendations.'
        );
        return;
      }

      this.logger.warn(
        `Persisting free-library recommendation failed (${(error as Error).message}). In-memory recommendations still work.`
      );
    }
  }

  private async deletePersistedFreeLibraryRecommendationRecord(
    recommendation: FreeLibraryRecommendationRecord
  ) {
    if (Date.now() < this.recommendationStoreBackoffUntil) {
      return;
    }

    try {
      await this.prisma.resourceFreeBookRecommendation.deleteMany({
        where: {
          bookId: recommendation.id,
          curatorEmail: recommendation.curatorEmail,
        },
      });
    } catch (error) {
      if (this.isResourcePersistenceUnavailableError(error)) {
        this.recommendationStoreBackoffUntil = Date.now() + 60_000;
        this.logger.warn(
          'Free-library recommendation delete could not reach persistence. Retrying in 60s while keeping in-memory state.'
        );
        return;
      }

      this.logger.warn(
        `Deleting free-library recommendation from persistence failed (${(error as Error).message}).`
      );
    }
  }

  private async hydratePersistedFreeLibraryAudiencePresets() {
    if (this.recommendationPresetsHydrated) {
      return;
    }
    this.recommendationPresetsHydrated = true;

    try {
      const storedPresets = await this.prisma.resourceFreeBookAudiencePreset.findMany({
        orderBy: [{ updatedAt: 'desc' }],
        take: 2000,
      });

      storedPresets.forEach((preset) => {
        this.freeLibraryAudiencePresets.push(this.toStoredFreeLibraryAudiencePresetRecord(preset));
      });

      if (storedPresets.length > 0) {
        this.logger.log(`Loaded ${storedPresets.length} persisted free-library audience presets.`);
      }
    } catch (error) {
      if (this.isResourcePersistenceUnavailableError(error)) {
        this.logger.warn(
          'Free-library audience preset persistence is unavailable. Falling back to in-memory presets only.'
        );
        return;
      }

      this.logger.warn(
        `Could not hydrate free-library audience presets. Falling back to memory mode (${(error as Error).message}).`
      );
    }
  }

  private async persistFreeLibraryAudiencePresetRecord(preset: FreeLibraryAudiencePresetRecord) {
    if (Date.now() < this.recommendationPresetStoreBackoffUntil) {
      return;
    }

    try {
      await this.prisma.resourceFreeBookAudiencePreset.upsert({
        where: {
          workspaceKey_label: {
            workspaceKey: preset.workspaceKey,
            label: preset.label,
          },
        },
        create: {
          publicId: preset.presetId,
          workspaceKey: preset.workspaceKey,
          workspaceLabel: preset.workspaceLabel || null,
          curatorEmail: preset.curatorEmail,
          curatorName: preset.curatorName,
          label: preset.label,
          targetSchoolLevel: preset.targetSchoolLevel || null,
          targetDepartment: preset.targetDepartment || null,
          targetClassGroup: preset.targetClassGroup || null,
          createdAt: preset.createdAt,
          updatedAt: preset.updatedAt,
        },
        update: {
          workspaceLabel: preset.workspaceLabel || null,
          curatorName: preset.curatorName,
          curatorEmail: preset.curatorEmail,
          targetSchoolLevel: preset.targetSchoolLevel || null,
          targetDepartment: preset.targetDepartment || null,
          targetClassGroup: preset.targetClassGroup || null,
          updatedAt: preset.updatedAt,
        },
      });
    } catch (error) {
      if (this.isResourcePersistenceUnavailableError(error)) {
        this.recommendationPresetStoreBackoffUntil = Date.now() + 60_000;
        this.logger.warn(
          'Free-library audience preset persistence failed. Retrying in 60s while keeping in-memory presets.'
        );
        return;
      }

      this.logger.warn(
        `Persisting free-library audience preset failed (${(error as Error).message}). In-memory presets still work.`
      );
    }
  }

  private async deletePersistedFreeLibraryAudiencePresetRecord(
    preset: FreeLibraryAudiencePresetRecord
  ) {
    if (Date.now() < this.recommendationPresetStoreBackoffUntil) {
      return;
    }

    try {
      await this.prisma.resourceFreeBookAudiencePreset.deleteMany({
        where: {
          workspaceKey: preset.workspaceKey,
          label: preset.label,
        },
      });
    } catch (error) {
      if (this.isResourcePersistenceUnavailableError(error)) {
        this.recommendationPresetStoreBackoffUntil = Date.now() + 60_000;
        this.logger.warn(
          'Free-library audience preset delete could not reach persistence. Retrying in 60s while keeping in-memory state.'
        );
        return;
      }

      this.logger.warn(
        `Deleting free-library audience preset from persistence failed (${(error as Error).message}).`
      );
    }
  }

  private isResourcePersistenceUnavailableError(error: unknown) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return true;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return (
        error.code === 'P1001' ||
        error.code === 'P1008' ||
        error.code === 'P1017' ||
        error.code === 'P2021' ||
        error.code === 'P2022'
      );
    }

    return false;
  }

  private toStoredFreeLibraryRecommendationRecord(
    record: PersistedFreeLibraryRecommendationRecord
  ): FreeLibraryRecommendationRecord {
    return {
      id: this.normalizeOptionalText(record.bookId, 160) || record.publicId,
      source: this.normalizeFreeLibraryProvider(record.source),
      sourceLabel: this.normalizeOptionalText(record.sourceLabel, 60) || 'Free library',
      title: this.normalizeRequiredText(
        record.title,
        'A free-book title is required before recommending it.',
        180
      ),
      authors: this.normalizePersistedStringArray(record.authors, 4, 80),
      description:
        this.normalizeOptionalText(record.description, 500) ||
        'Free title from a trusted education source.',
      subject: this.normalizeOptionalText(record.subject, 80) || 'General',
      coverImageUrl: this.normalizeOptionalText(record.coverImageUrl || '', 1000) || null,
      actionUrl: this.normalizeRequiredText(
        record.actionUrl,
        'A valid source link is required before recommending this book.',
        800
      ),
      actionLabel: this.normalizeOptionalText(record.actionLabel, 60) || 'Open book',
      accessLabel: this.normalizeOptionalText(record.accessLabel, 60) || 'Free access',
      licenseLabel: this.normalizeOptionalText(record.licenseLabel, 80) || 'Free access',
      publishedAt: this.normalizeOptionalText(record.publishedAt || '', 40) || null,
      recommendationId: record.publicId,
      curatorEmail: normalizeEmail(record.curatorEmail),
      curatorName:
        this.normalizeOptionalText(record.curatorName, 80) ||
        this.defaultNameFromEmail(record.curatorEmail),
      curatorRole: 'school',
      createdAt: record.recommendedAt,
      note: this.normalizeOptionalText(record.note || '', 220),
      targetSchoolLevel: this.normalizeStudentSchoolLevel(record.targetSchoolLevel || ''),
      targetDepartment: this.normalizeOptionalText(record.targetDepartment || '', 80),
      targetClassGroup: this.normalizeOptionalText(record.targetClassGroup || '', 80),
    };
  }

  private toStoredFreeLibraryAudiencePresetRecord(
    record: PersistedFreeLibraryAudiencePresetRecord
  ): FreeLibraryAudiencePresetRecord {
    return {
      presetId: record.publicId,
      workspaceKey: this.normalizeRequiredText(
        record.workspaceKey,
        'Audience preset workspace is required.',
        180
      ),
      workspaceLabel:
        this.normalizeOptionalText(record.workspaceLabel || '', 120) || 'School workspace',
      curatorEmail: normalizeEmail(record.curatorEmail),
      curatorName:
        this.normalizeOptionalText(record.curatorName, 80) ||
        this.defaultNameFromEmail(record.curatorEmail),
      label: this.normalizeRequiredText(
        record.label,
        'Audience preset label is required.',
        80
      ),
      targetSchoolLevel: this.normalizeStudentSchoolLevel(record.targetSchoolLevel || ''),
      targetDepartment: this.normalizeOptionalText(record.targetDepartment || '', 80),
      targetClassGroup: this.normalizeOptionalText(record.targetClassGroup || '', 80),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private normalizePersistedStringArray(
    value: Prisma.JsonValue,
    limit: number,
    maxLength: number
  ) {
    if (!Array.isArray(value)) {
      return [] as string[];
    }

    return value
      .map((entry) => this.normalizeOptionalText(typeof entry === 'string' ? entry : '', maxLength))
      .filter((entry) => entry.length > 0)
      .slice(0, limit);
  }

  private requireEmail(authUser: AuthUser) {
    const normalized = normalizeEmail(authUser.email);
    if (!normalized || !normalized.includes('@')) {
      throw new BadRequestException('Signed-in email is required before accessing resources.');
    }
    return normalized;
  }

  private defaultNameFromEmail(email: string) {
    return email.split('@')[0] || 'Edamaa Tutor';
  }

  private normalizeRequiredText(value: string | undefined, errorMessage: string, maxLength: number) {
    const normalized = this.normalizeOptionalText(value, maxLength);
    if (!normalized) {
      throw new BadRequestException(errorMessage);
    }
    return normalized;
  }

  private normalizeUpdatedRequiredText(
    value: string | undefined,
    fallback: string,
    errorMessage: string,
    maxLength: number
  ) {
    if (value === undefined) {
      return fallback;
    }
    return this.normalizeRequiredText(value, errorMessage, maxLength);
  }

  private normalizeOptionalText(value: string | undefined, maxLength: number) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return normalized.slice(0, maxLength).trim();
  }

  private normalizeResourceType(value: string | undefined, mimeType: string): ResourceType {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'pdf') {
      return 'pdf';
    }
    if (normalized === 'video') {
      return 'video';
    }
    if (normalized === 'image') {
      return 'image';
    }
    if (normalized === 'audio') {
      return 'audio';
    }
    if (normalized === 'document') {
      return 'document';
    }

    return detectResourceTypeFromMime(mimeType);
  }

  private resolveUpdatedResourceType(
    value: string | undefined,
    currentType: ResourceType,
    uploadedFile?: any
  ) {
    if (value !== undefined) {
      return this.normalizeResourceType(value, String(uploadedFile?.mimetype || ''));
    }
    if (uploadedFile?.mimetype) {
      return this.normalizeResourceType(undefined, String(uploadedFile.mimetype || ''));
    }
    return currentType;
  }

  private normalizeDiscoveryLimit(value: string | number | undefined) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 8;
    }

    return Math.max(4, Math.min(12, Math.round(numeric)));
  }

  private requireSchoolCuratorRole(roleValue?: string | null) {
    const resolvedRole = this.resolveUploaderRoleFromAuth(roleValue);
    if (resolvedRole !== 'school') {
      throw new ForbiddenException(
        'Only schools can recommend free-library books to students.'
      );
    }
  }

  private buildFreeLibraryCacheKey(query: string, subject: string, limit: number) {
    return [query.trim().toLowerCase(), subject.trim().toLowerCase(), String(limit)].join('::');
  }

  private buildRecommendedFreeBookItems(currentEmail: string) {
    const groups = new Map<string, FreeLibraryRecommendationRecord[]>();

    this.freeLibraryRecommendations.forEach((recommendation) => {
      const existing = groups.get(recommendation.id);
      if (existing) {
        existing.push(recommendation);
      } else {
        groups.set(recommendation.id, [recommendation]);
      }
    });

    return Array.from(groups.values())
      .sort((left, right) => {
        const leftTime = Math.max(...left.map((item) => item.createdAt.getTime()));
        const rightTime = Math.max(...right.map((item) => item.createdAt.getTime()));
        return rightTime - leftTime;
      })
      .map((group) => this.toFreeLibraryRecommendationItemResponse(group, currentEmail));
  }

  private getUsableFreeLibraryCacheEntry(cacheKey: string) {
    const existing = this.freeLibraryCache.get(cacheKey);
    if (!existing) {
      return null;
    }

    const ageMs = Date.now() - existing.cachedAtMs;
    if (ageMs > FREE_LIBRARY_CACHE_STALE_TTL_MS) {
      this.freeLibraryCache.delete(cacheKey);
      return null;
    }

    return existing;
  }

  private isFreshFreeLibraryCacheEntry(entry: FreeLibraryCacheEntry) {
    return Date.now() - entry.cachedAtMs <= FREE_LIBRARY_CACHE_TTL_MS;
  }

  private async runLiveFreeLibrarySearch(query: string, subject: string, limit: number) {
    const searchTerm = [query, subject].filter(Boolean).join(' ').trim() || 'education';
    const perProviderLimit = Math.max(4, Math.ceil(limit / 2));

    const [openLibraryResult, googleBooksResult] = await Promise.allSettled([
      this.searchOpenLibraryFreeBooks(searchTerm, perProviderLimit, subject),
      this.searchGoogleBooksFreeBooks(searchTerm, perProviderLimit, subject),
    ]);

    if (openLibraryResult.status === 'rejected') {
      this.logger.warn(
        `Open Library discovery failed: ${
          openLibraryResult.reason instanceof Error
            ? openLibraryResult.reason.message
            : 'Unknown error'
        }`
      );
    }
    if (googleBooksResult.status === 'rejected') {
      this.logger.warn(
        `Google Books discovery failed: ${
          googleBooksResult.reason instanceof Error
            ? googleBooksResult.reason.message
            : 'Unknown error'
        }`
      );
    }

    const items = this.dedupeFreeLibraryItems(
      [
        openLibraryResult.status === 'fulfilled' ? openLibraryResult.value : [],
        googleBooksResult.status === 'fulfilled' ? googleBooksResult.value : [],
      ].flat()
    ).slice(0, limit);

    const providers: FreeLibraryProviderStatus[] = [
      {
        source: 'open_library',
        sourceLabel: 'Open Library',
        status: openLibraryResult.status === 'fulfilled' ? 'ok' : 'unavailable',
        note:
          openLibraryResult.status === 'fulfilled'
            ? `${openLibraryResult.value.length} book${
                openLibraryResult.value.length === 1 ? '' : 's'
              } found`
            : 'Open Library is unavailable right now',
      },
      {
        source: 'google_books',
        sourceLabel: 'Google Books',
        status: googleBooksResult.status === 'fulfilled' ? 'ok' : 'unavailable',
        note:
          googleBooksResult.status === 'fulfilled'
            ? `${googleBooksResult.value.length} book${
                googleBooksResult.value.length === 1 ? '' : 's'
              } found`
            : 'Google Books is unavailable right now',
      },
    ];

    return {
      items,
      providers,
    };
  }

  private toStaleFallbackProviderStatuses(providers: FreeLibraryProviderStatus[]) {
    return providers.map((provider) => ({
      ...provider,
      status: 'unavailable' as const,
      note: `${provider.sourceLabel} is unavailable right now. Showing saved results from a recent search.`,
    }));
  }

  private toFreeLibraryResponse(
    query: string,
    subject: string,
    items: FreeLibraryBookItemResponse[],
    providers: FreeLibraryProviderStatus[],
    cache: {
      status: 'fresh' | 'refreshed' | 'stale-fallback' | 'miss';
      cachedAt: string | null;
      ageSeconds: number | null;
    }
  ) {
    return {
      generatedAt: new Date().toISOString(),
      query: query || '',
      subject: subject || '',
      items,
      providers,
      cache,
    };
  }

  private toFreeLibraryRecommendationItemResponse(
    group: FreeLibraryRecommendationRecord[],
    currentEmail: string
  ): FreeLibraryRecommendationItemResponse {
    const sortedGroup = [...group].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
    );
    const currentUserRecommendation =
      sortedGroup.find((item) => item.curatorEmail === currentEmail) || null;
    const primary = currentUserRecommendation || sortedGroup[0];

    if (!primary) {
      throw new NotFoundException('Recommendation group is empty.');
    }

    const curatedByCount = sortedGroup.length;
    const audienceLabel = this.buildRecommendationAudienceLabel(primary);

    return {
      id: primary.id,
      source: primary.source,
      sourceLabel: primary.sourceLabel,
      title: primary.title,
      authors: primary.authors,
      description: primary.description,
      subject: primary.subject,
      coverImageUrl: primary.coverImageUrl,
      actionUrl: primary.actionUrl,
      actionLabel: primary.actionLabel,
      accessLabel: primary.accessLabel,
      licenseLabel: primary.licenseLabel,
      publishedAt: primary.publishedAt,
      recommendationId: currentUserRecommendation?.recommendationId ?? null,
      curatedAt: primary.createdAt.toISOString(),
      curatedAtLabel: toRelativeLabel(primary.createdAt),
      curatedByCount,
      curatedByLabel: `Recommended by ${curatedByCount} school admin${
        curatedByCount === 1 ? '' : 's'
      }`,
      isRecommendedByCurrentUser: Boolean(currentUserRecommendation),
      note: primary.note,
      targetSchoolLevel: primary.targetSchoolLevel,
      targetDepartment: primary.targetDepartment,
      targetClassGroup: primary.targetClassGroup,
      audienceLabel,
      isGlobalRecommendation: !audienceLabel,
    };
  }

  private dedupeFreeLibraryItems(items: FreeLibraryBookItemResponse[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.title.trim().toLowerCase()}::${item.authors.join('|').trim().toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private buildExternalDescription(primary: unknown, fallback: string) {
    const value = Array.isArray(primary) ? primary[0] : primary;
    const normalized =
      typeof value === 'string' && value.trim()
        ? value.trim().replace(/\s+/g, ' ')
        : fallback;

    if (normalized.length <= 220) {
      return normalized;
    }

    return `${normalized.slice(0, 217).trimEnd()}...`;
  }

  private async fetchExternalJson(url: URL, sourceLabel: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EXTERNAL_DISCOVERY_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Edamaa3D/1.0 Free Library Discovery',
        },
      });

      if (!response.ok) {
        throw new BadRequestException(`${sourceLabel} returned ${response.status}.`);
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadRequestException(`${sourceLabel} took too long to respond.`);
      }

      throw new BadRequestException(
        `${sourceLabel} could not be reached right now.`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async searchOpenLibraryFreeBooks(
    searchTerm: string,
    limit: number,
    preferredSubject: string
  ): Promise<FreeLibraryBookItemResponse[]> {
    const url = new URL('https://openlibrary.org/search.json');
    url.searchParams.set('q', searchTerm);
    url.searchParams.set('limit', String(limit));

    const payload = await this.fetchExternalJson(url, 'Open Library');
    const docs = Array.isArray(payload.docs) ? payload.docs : [];

    return docs
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .filter((entry) => {
        const ebookAccess = String(entry.ebook_access || '').trim().toLowerCase();
        return (
          entry.public_scan_b === true ||
          ebookAccess === 'public' ||
          ebookAccess === 'borrowable' ||
          ebookAccess === 'printdisabled'
        );
      })
      .map((entry, index) => {
        const title =
          (typeof entry.title === 'string' && entry.title.trim()) || 'Untitled book';
        const authors = Array.isArray(entry.author_name)
          ? entry.author_name.filter((author): author is string => typeof author === 'string').slice(0, 3)
          : [];
        const key = typeof entry.key === 'string' ? entry.key : '';
        const coverId = Number(entry.cover_i);
        const subject =
          preferredSubject ||
          (Array.isArray(entry.subject) && typeof entry.subject[0] === 'string'
            ? String(entry.subject[0])
            : 'General');
        const ebookAccess = String(entry.ebook_access || '').trim().toLowerCase();
        const isPublicAccess = entry.public_scan_b === true || ebookAccess === 'public';
        const editionKey =
          (Array.isArray(entry.edition_key) && typeof entry.edition_key[0] === 'string'
            ? String(entry.edition_key[0])
            : '') ||
          (typeof entry.cover_edition_key === 'string' ? entry.cover_edition_key : '') ||
          key;

        return {
          id: `open_library_${String(editionKey || index)}`,
          source: 'open_library' as const,
          sourceLabel: 'Open Library',
          title,
          authors,
          description: this.buildExternalDescription(
            entry.first_sentence,
            'Free title from Open Library.'
          ),
          subject,
          coverImageUrl:
            Number.isFinite(coverId) && coverId > 0
              ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
              : null,
          actionUrl: key ? `https://openlibrary.org${key}` : 'https://openlibrary.org',
          actionLabel: isPublicAccess ? 'Open book' : 'View source',
          accessLabel: isPublicAccess ? 'Public access' : 'Library access',
          licenseLabel: isPublicAccess ? 'Free access' : 'Borrowable title',
          publishedAt:
            Number.isFinite(Number(entry.first_publish_year)) && Number(entry.first_publish_year) > 0
              ? String(entry.first_publish_year)
              : null,
        };
      });
  }

  private async searchGoogleBooksFreeBooks(
    searchTerm: string,
    limit: number,
    preferredSubject: string
  ): Promise<FreeLibraryBookItemResponse[]> {
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', searchTerm);
    url.searchParams.set('printType', 'books');
    url.searchParams.set('filter', 'free-ebooks');
    url.searchParams.set('download', 'epub');
    url.searchParams.set('maxResults', String(Math.min(limit, 20)));

    const payload = await this.fetchExternalJson(url, 'Google Books');
    const items = Array.isArray(payload.items) ? payload.items : [];

    return items
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .map((entry, index) => {
        const volumeInfo =
          entry.volumeInfo && typeof entry.volumeInfo === 'object'
            ? (entry.volumeInfo as Record<string, unknown>)
            : {};
        const accessInfo =
          entry.accessInfo && typeof entry.accessInfo === 'object'
            ? (entry.accessInfo as Record<string, unknown>)
            : {};
        const epubInfo =
          accessInfo.epub && typeof accessInfo.epub === 'object'
            ? (accessInfo.epub as Record<string, unknown>)
            : {};
        const pdfInfo =
          accessInfo.pdf && typeof accessInfo.pdf === 'object'
            ? (accessInfo.pdf as Record<string, unknown>)
            : {};
        const imageLinks =
          volumeInfo.imageLinks && typeof volumeInfo.imageLinks === 'object'
            ? (volumeInfo.imageLinks as Record<string, unknown>)
            : {};

        const previewLink =
          (typeof accessInfo.webReaderLink === 'string' && accessInfo.webReaderLink.trim()) ||
          (typeof volumeInfo.previewLink === 'string' && volumeInfo.previewLink.trim()) ||
          (typeof volumeInfo.infoLink === 'string' && volumeInfo.infoLink.trim()) ||
          'https://books.google.com';

        const subject =
          preferredSubject ||
          (Array.isArray(volumeInfo.categories) && typeof volumeInfo.categories[0] === 'string'
            ? String(volumeInfo.categories[0])
            : 'General');
        const hasDirectReading =
          epubInfo.isAvailable === true || pdfInfo.isAvailable === true;
        const thumbnail =
          (typeof imageLinks.thumbnail === 'string' && imageLinks.thumbnail) ||
          (typeof imageLinks.smallThumbnail === 'string' && imageLinks.smallThumbnail) ||
          '';

        return {
          id: `google_books_${String(entry.id || index)}`,
          source: 'google_books' as const,
          sourceLabel: 'Google Books',
          title:
            (typeof volumeInfo.title === 'string' && volumeInfo.title.trim()) || 'Untitled book',
          authors: Array.isArray(volumeInfo.authors)
            ? volumeInfo.authors.filter((author): author is string => typeof author === 'string').slice(0, 3)
            : [],
          description: this.buildExternalDescription(
            volumeInfo.description,
            'Free ebook listed through Google Books.'
          ),
          subject,
          coverImageUrl: thumbnail ? thumbnail.replace(/^http:\/\//i, 'https://') : null,
          actionUrl: previewLink,
          actionLabel: hasDirectReading ? 'Read free' : 'Preview',
          accessLabel: hasDirectReading ? 'Free ebook' : 'Preview available',
          licenseLabel: 'Source preview',
          publishedAt:
            typeof volumeInfo.publishedDate === 'string' && volumeInfo.publishedDate.trim()
              ? volumeInfo.publishedDate.trim()
              : null,
        };
      });
  }

  private normalizeResourceCategory(value: string | undefined): ResourceCategory {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'assignment') {
      return 'assignment';
    }
    if (normalized === 'classwork') {
      return 'classwork';
    }
    if (normalized === 'library') {
      return 'library';
    }
    if (normalized === 'live_recording' || normalized === 'live-recording') {
      return 'live_recording';
    }
    if (normalized === 'official_document' || normalized === 'official-document') {
      return 'official_document';
    }
    return 'note';
  }

  private normalizeFreeLibraryRecommendationInput(
    input: FreeLibraryRecommendationInput
  ): FreeLibraryBookItemResponse & {
    note: string;
    targetSchoolLevel: StudentSchoolLevel;
    targetDepartment: string;
    targetClassGroup: string;
  } {
    const source = this.normalizeFreeLibraryProvider(input.source);
    const title = this.normalizeRequiredText(
      input.title,
      'A free-book title is required before recommending it.',
      180
    );
    const actionUrl = this.normalizeRequiredText(
      input.actionUrl,
      'A valid source link is required before recommending this book.',
      800
    );

    if (!/^https?:\/\//i.test(actionUrl)) {
      throw new BadRequestException('Recommended books must use a valid source link.');
    }

    const normalizedId =
      this.normalizeOptionalText(input.id, 160) ||
      `${source}_${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

    return {
      id: normalizedId,
      source,
      sourceLabel:
        this.normalizeOptionalText(input.sourceLabel, 60) ||
        (source === 'open_library' ? 'Open Library' : 'Google Books'),
      title,
      authors: Array.isArray(input.authors)
        ? input.authors
            .map((author) => this.normalizeOptionalText(author, 80))
            .filter((author) => author.length > 0)
            .slice(0, 4)
        : [],
      description:
        this.normalizeOptionalText(input.description, 500) ||
        'Free title from a trusted education source.',
      subject: this.normalizeOptionalText(input.subject, 80) || 'General',
      coverImageUrl: this.normalizeOptionalText(String(input.coverImageUrl || ''), 1000) || null,
      actionUrl,
      actionLabel: this.normalizeOptionalText(input.actionLabel, 60) || 'Open book',
      accessLabel: this.normalizeOptionalText(input.accessLabel, 60) || 'Free access',
      licenseLabel: this.normalizeOptionalText(input.licenseLabel, 80) || 'Free access',
      publishedAt: this.normalizeOptionalText(String(input.publishedAt || ''), 40) || null,
      note: this.normalizeOptionalText(input.note, 220),
      targetSchoolLevel: this.normalizeStudentSchoolLevel(input.targetSchoolLevel),
      targetDepartment: this.normalizeOptionalText(input.targetDepartment, 80),
      targetClassGroup: this.normalizeOptionalText(input.targetClassGroup, 80),
    };
  }

  private normalizeFreeLibraryAudiencePresetInput(input: FreeLibraryAudiencePresetInput): {
    label: string;
    targetSchoolLevel: StudentSchoolLevel;
    targetDepartment: string;
    targetClassGroup: string;
  } {
    const label = this.normalizeRequiredText(
      input.label,
      'Audience preset name is required.',
      80
    );
    const targetSchoolLevel = this.normalizeStudentSchoolLevel(input.targetSchoolLevel);
    const targetDepartment = this.normalizeOptionalText(input.targetDepartment, 80);
    const targetClassGroup = this.normalizeOptionalText(input.targetClassGroup, 80);

    if (!targetSchoolLevel && !targetDepartment && !targetClassGroup) {
      throw new BadRequestException(
        'Audience presets must target at least one school level, department, or class group.'
      );
    }

    return {
      label,
      targetSchoolLevel,
      targetDepartment,
      targetClassGroup,
    };
  }

  private resolveSchoolWorkspace(authUser: AuthUser) {
    const metadataCandidates = [authUser.userMetadata, authUser.appMetadata].filter(
      (value): value is Record<string, unknown> => !!value && typeof value === 'object'
    );

    const explicitWorkspaceKey = metadataCandidates
      .map(
        (metadata) =>
          this.readMetadataString(metadata.school_workspace_key) ||
          this.readMetadataString(metadata.schoolWorkspaceKey)
      )
      .find((value) => value.length > 0);

    if (explicitWorkspaceKey) {
      const workspaceLabel =
        metadataCandidates
          .map(
            (metadata) =>
              this.readMetadataString(metadata.school_name) ||
              this.readMetadataString(metadata.schoolName) ||
              this.readMetadataString(metadata.organization_name) ||
              this.readMetadataString(metadata.organizationName)
          )
          .find((value) => value.length > 0) || 'School workspace';

      return {
        key: this.normalizeRequiredText(
          explicitWorkspaceKey,
          'School workspace key is required.',
          180
        ),
        label: this.normalizeOptionalText(workspaceLabel, 120) || 'School workspace',
      };
    }

    const schoolUserId = metadataCandidates
      .map(
        (metadata) =>
          this.readMetadataString(metadata.school_user_id) ||
          this.readMetadataString(metadata.schoolUserId)
      )
      .find((value) => value.length > 0);

    if (schoolUserId) {
      return {
        key: `school-user:${schoolUserId}`,
        label:
          metadataCandidates
            .map(
              (metadata) =>
                this.readMetadataString(metadata.school_name) ||
                this.readMetadataString(metadata.schoolName)
            )
            .find((value) => value.length > 0) || 'School workspace',
      };
    }

    const schoolOwnerEmail = metadataCandidates
      .map(
        (metadata) =>
          this.readMetadataString(metadata.school_owner_email) ||
          this.readMetadataString(metadata.schoolOwnerEmail) ||
          this.readMetadataString(metadata.school_email) ||
          this.readMetadataString(metadata.schoolEmail)
      )
      .find((value) => value.length > 0);

    if (schoolOwnerEmail) {
      return {
        key: `school-email:${normalizeEmail(schoolOwnerEmail)}`,
        label:
          metadataCandidates
            .map(
              (metadata) =>
                this.readMetadataString(metadata.school_name) ||
                this.readMetadataString(metadata.schoolName)
            )
            .find((value) => value.length > 0) || 'School workspace',
      };
    }

    const fallbackIdentifier = authUser.id || this.requireEmail(authUser);
    return {
      key: `account:${fallbackIdentifier}`,
      label: this.normalizeOptionalText(authUser.name || '', 120) || 'School workspace',
    };
  }

  private readMetadataString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeFreeLibraryProvider(value: string | undefined): FreeLibraryProvider {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    if (normalized === 'open_library') {
      return 'open_library';
    }

    if (normalized === 'google_books') {
      return 'google_books';
    }

    throw new BadRequestException('Only approved free-library sources can be recommended.');
  }

  private normalizeStudentSchoolLevel(value: string | undefined): StudentSchoolLevel {
    const normalized = String(value || '').trim().toLowerCase();
    if (
      normalized === 'primary' ||
      normalized === 'secondary' ||
      normalized === 'tertiary'
    ) {
      return normalized;
    }
    return '';
  }

  private buildRecommendationAudienceLabel(recommendation: FreeLibraryAudienceTarget) {
    const parts: string[] = [];

    if (recommendation.targetSchoolLevel) {
      parts.push(
        recommendation.targetSchoolLevel.charAt(0).toUpperCase() +
          recommendation.targetSchoolLevel.slice(1)
      );
    }

    if (recommendation.targetDepartment) {
      parts.push(recommendation.targetDepartment);
    }

    if (recommendation.targetClassGroup) {
      parts.push(recommendation.targetClassGroup);
    }

    return parts.join(' • ');
  }

  private toFreeLibraryAudiencePresetItemResponse(
    preset: FreeLibraryAudiencePresetRecord
  ): FreeLibraryAudiencePresetItemResponse {
    return {
      presetId: preset.presetId,
      label: preset.label,
      targetSchoolLevel: preset.targetSchoolLevel,
      targetDepartment: preset.targetDepartment,
      targetClassGroup: preset.targetClassGroup,
      audienceLabel: this.buildRecommendationAudienceLabel(preset),
      createdAt: preset.createdAt.toISOString(),
      updatedAt: preset.updatedAt.toISOString(),
      updatedAtLabel: toRelativeLabel(preset.updatedAt),
    };
  }

  private resolveUploaderRoleFromAuth(roleValue?: string | null): UploaderRole {
    const normalizedRole = String(roleValue || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');

    if (normalizedRole === 'tutor' || normalizedRole === 'teacher' || normalizedRole === 'instructor') {
      return 'tutor';
    }

    if (
      normalizedRole === 'school' ||
      normalizedRole === 'school-admin' ||
      normalizedRole === 'school-owner'
    ) {
      return 'school';
    }

    throw new ForbiddenException(
      'Only tutors and schools can upload resources. Students have read-only access.'
    );
  }

  private normalizePricingType(value: string | undefined): ResourcePricingType {
    return String(value || '').trim().toLowerCase() === 'paid' ? 'paid' : 'free';
  }

  private parsePriceMinor(value: string | number | undefined, pricingType: ResourcePricingType) {
    if (pricingType === 'free') {
      return null;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new BadRequestException('Set a valid paid price before publishing this resource.');
    }

    if (numeric > 2_000_000) {
      throw new BadRequestException('Resource price is too high. Keep it within realistic limits.');
    }

    return Math.round(numeric * 100);
  }

  private resolveUpdatedPriceMinor(
    value: string | number | undefined,
    pricingType: ResourcePricingType,
    fallback: number | null
  ) {
    if (pricingType === 'free') {
      return null;
    }

    if (value === undefined || value === null || String(value).trim() === '') {
      if (fallback !== null) {
        return fallback;
      }
      throw new BadRequestException('Set a valid paid price before publishing this resource.');
    }

    return this.parsePriceMinor(value, pricingType);
  }

  private validateOptionalUploadedFile(
    uploadedFile: any,
    constraints?: { type?: ResourceType; category?: ResourceCategory }
  ) {
    if (!uploadedFile) {
      return null;
    }

    if (!uploadedFile.buffer || !Buffer.isBuffer(uploadedFile.buffer)) {
      throw new BadRequestException('Uploaded file is invalid. Please re-attach and try again.');
    }

    const size = Number(uploadedFile.size || uploadedFile.buffer.length || 0);
    if (size <= 0) {
      throw new BadRequestException('Uploaded file is empty. Please choose a valid file.');
    }
    const maxUploadSizeBytes = getMaxUploadSizeBytes(
      constraints?.type || detectResourceTypeFromMime(String(uploadedFile.mimetype || '')),
      constraints?.category || 'note'
    );
    if (size > maxUploadSizeBytes) {
      const maxUploadSizeLabel =
        maxUploadSizeBytes === LIVE_RECORDING_MAX_UPLOAD_SIZE_BYTES ? '250MB' : '25MB';
      throw new BadRequestException(`File is too large. Keep uploads below ${maxUploadSizeLabel} for this material.`);
    }

    return uploadedFile;
  }

  private getPurchasedEmails(resourceId: string) {
    const existing = this.purchasedEmailsByResourceId.get(resourceId);
    if (existing) {
      return existing;
    }

    const created = new Set<string>();
    this.purchasedEmailsByResourceId.set(resourceId, created);
    return created;
  }

  private hasPurchasedResource(resourceId: string, email: string) {
    return this.getPurchasedEmails(resourceId).has(email);
  }

  private canAccessPaidResource(resource: ResourceRecord, email: string) {
    return resource.uploaderEmail === email || this.hasPurchasedResource(resource.id, email);
  }

  private toNaira(amountMinor: number) {
    return Math.round(amountMinor) / 100;
  }

  private defaultDescriptionForType(type: ResourceType) {
    switch (type) {
      case 'pdf':
        return 'PDF resource uploaded for your current lesson and revision work.';
      case 'video':
        return 'Short-form video resource to support your class understanding.';
      case 'image':
        return 'Visual resource uploaded for quicker concept recall.';
      case 'audio':
        return 'Audio explanation resource uploaded for flexible study sessions.';
      case 'document':
        return 'Document resource uploaded for learning support or official school communication.';
      default:
        return 'Resource uploaded to support your assignment, classwork, and note review.';
    }
  }

  private createNotificationForResource(resource: ResourceRecord): ResourceNotificationRecord {
    const categoryLabel =
      resource.category === 'assignment'
        ? 'assignment help'
        : resource.category === 'classwork'
        ? 'classwork support'
        : resource.category === 'library'
        ? 'e-library resource'
        : resource.category === 'live_recording'
        ? 'live class recording'
        : resource.category === 'official_document'
        ? 'official school document'
        : 'class notes';

    const title = 'New resource added';
    const message = `${resource.uploaderName} uploaded "${resource.title}" as ${categoryLabel} for ${resource.subject}.`;

    return {
      id: makeId('resnote'),
      resourceId: resource.id,
      title,
      message,
      priority: resource.category === 'assignment' || resource.category === 'classwork' ? 'high' : 'medium',
      createdAt: new Date(),
    };
  }

  private createUpdatedNotificationForResource(resource: ResourceRecord): ResourceNotificationRecord {
    return {
      id: makeId('resnote'),
      resourceId: resource.id,
      title: 'Resource updated',
      message: `${resource.uploaderName} updated "${resource.title}" for ${resource.subject}.`,
      priority: resource.category === 'assignment' || resource.category === 'classwork' ? 'high' : 'medium',
      createdAt: new Date(),
    };
  }

  private getReadNotificationIds(email: string) {
    const existing = this.readNotificationIdsByEmail.get(email);
    if (existing) {
      return existing;
    }

    const created = new Set<string>();
    this.readNotificationIdsByEmail.set(email, created);
    return created;
  }

  private toResourceResponse(resource: ResourceRecord, viewerEmail?: string): ResourceItemResponse {
    const normalizedViewerEmail = normalizeEmail(viewerEmail);
    const isPurchased =
      resource.pricingType === 'paid' &&
      !!normalizedViewerEmail &&
      this.canAccessPaidResource(resource, normalizedViewerEmail);

    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      subject: resource.subject,
      type: resource.type,
      category: resource.category,
      pricingType: resource.pricingType,
      priceLabel:
        resource.priceMinor !== null
          ? `₦${this.toNaira(resource.priceMinor).toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}`
          : null,
      instructor: resource.uploaderName,
      uploaderRole: resource.uploaderRole,
      uploadedAt: resource.createdAt.toISOString(),
      uploadedDate: toRelativeLabel(resource.createdAt),
      downloads: resource.downloads,
      fileName: resource.fileName,
      mimeType: resource.mimeType,
      sizeBytes: resource.fileSizeBytes,
      sizeLabel: formatBytes(resource.fileSizeBytes),
      isNew: Date.now() - resource.createdAt.getTime() < 1000 * 60 * 60 * 48,
      isLocked: resource.pricingType === 'paid' && !isPurchased,
      isPurchased,
    };
  }

  private toNotificationResponse(
    notification: ResourceNotificationRecord,
    isRead: boolean
  ): ResourceNotificationItemResponse {
    return {
      id: notification.id,
      resourceId: notification.resourceId,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      createdAt: notification.createdAt.toISOString(),
      createdAtLabel: toRelativeLabel(notification.createdAt),
      isRead,
    };
  }

  private seedIfNeeded() {
    if (this.seeded) {
      return;
    }

    this.seeded = true;

    const now = Date.now();
    const seededResources: Array<{
      id: string;
      title: string;
      description: string;
      subject: string;
      type: ResourceType;
      category: ResourceCategory;
      pricingType?: ResourcePricingType;
      priceMinor?: number | null;
      uploaderName: string;
      uploaderRole: UploaderRole;
      uploaderEmail: string;
      fileName: string;
      mimeType: string;
      createdAtOffsetMs: number;
      bodyText: string;
    }> = [
      {
        id: 'resource_seed_calculus_classwork_hints',
        title: 'Calculus Classwork Hints',
        description: 'Step-by-step hint sheet for this week classwork, with worked examples.',
        subject: 'Mathematics',
        type: 'pdf',
        category: 'classwork',
        uploaderName: 'Dr. Adetokunbo Andrew',
        uploaderRole: 'tutor',
        uploaderEmail: 'tutor@edamaa.dev',
        fileName: 'calculus-classwork-hints.txt',
        mimeType: 'text/plain',
        createdAtOffsetMs: 1000 * 60 * 35,
        bodyText:
          'Calculus Classwork Hints\n\n1. Start with substitution before integration by parts.\n2. Show each simplification line.\n3. Validate signs and limits.',
      },
      {
        id: 'resource_seed_waec_physics_assignment_support',
        title: 'WAEC Physics Assignment Support',
        description: 'Quick reference notes prepared to guide this assignment submission.',
        subject: 'Physics',
        type: 'document',
        category: 'assignment',
        uploaderName: 'Edamaa Science School',
        uploaderRole: 'school',
        uploaderEmail: 'school@edamaa.dev',
        fileName: 'waec-physics-assignment-support.txt',
        mimeType: 'text/plain',
        createdAtOffsetMs: 1000 * 60 * 60 * 5,
        bodyText:
          'WAEC Physics Assignment Support\n\nFocus areas:\n- Motion graphs\n- Work, energy, and power\n- Practical lab interpretation tips',
      },
      {
        id: 'resource_seed_study_planning_template',
        title: 'E-Library: Study Planning Template',
        description: 'Free template from the e-library section to plan weekly reading blocks.',
        subject: 'Study Skills',
        type: 'document',
        category: 'library',
        uploaderName: 'Learning Support Team',
        uploaderRole: 'school',
        uploaderEmail: 'library@edamaa.dev',
        fileName: 'study-planning-template.txt',
        mimeType: 'text/plain',
        createdAtOffsetMs: 1000 * 60 * 60 * 24,
        bodyText:
          'Study Planning Template\n\nWeek Goals:\n- Concept review\n- Assignment draft\n- Practice quiz\n- Reflection',
      },
      {
        id: 'resource_seed_jss2_english_reading_textbook',
        title: 'JSS2 English Reading Workbook',
        description: 'Sample e-book for comprehension practice, vocabulary building, and weekly reading tasks.',
        subject: 'English Language',
        type: 'pdf',
        category: 'library',
        uploaderName: 'Edamaa Science School',
        uploaderRole: 'school',
        uploaderEmail: 'school@edamaa.dev',
        fileName: 'jss2-english-reading-workbook.txt',
        mimeType: 'text/plain',
        createdAtOffsetMs: 1000 * 60 * 60 * 18,
        bodyText:
          'JSS2 English Reading Workbook\n\nContents:\n- Reading passage one\n- Vocabulary focus\n- Weekly comprehension questions',
      },
      {
        id: 'resource_seed_premium_sat_math_drill_pack',
        title: 'Premium SAT Math Drill Pack',
        description: 'Paid e-library bundle with timed drills and worked answer breakdowns.',
        subject: 'Mathematics',
        type: 'pdf',
        category: 'library',
        pricingType: 'paid',
        priceMinor: 450000,
        uploaderName: 'Edamaa Exam Lab',
        uploaderRole: 'school',
        uploaderEmail: 'school@edamaa.dev',
        fileName: 'premium-sat-math-drills.txt',
        mimeType: 'text/plain',
        createdAtOffsetMs: 1000 * 60 * 80,
        bodyText:
          'Premium SAT Math Drill Pack\n\nSections:\n- Timed algebra drills\n- Data interpretation\n- Worked answer review',
      },
      {
        id: 'resource_seed_basic_science_video_lesson',
        title: 'JSS1 Basic Science Video Lesson: States of Matter',
        description: 'Uploaded lesson video covering solids, liquids, gases, and simple classroom demonstrations.',
        subject: 'Basic Science',
        type: 'video',
        category: 'note',
        uploaderName: 'Edamaa Science School',
        uploaderRole: 'school',
        uploaderEmail: 'school@edamaa.dev',
        fileName: 'jss1-basic-science-states-of-matter.txt',
        mimeType: 'text/plain',
        createdAtOffsetMs: 1000 * 60 * 70,
        bodyText:
          'JSS1 Basic Science Video Lesson: States of Matter\n\nLesson flow:\n- Definition of matter\n- Solid, liquid, and gas examples\n- Class recap questions',
      },
      {
        id: 'resource_seed_chemistry_titration_live_recording',
        title: 'SS2 Chemistry Titration Live Class Recording',
        description: 'Replay of the live titration lesson with the worked practical steps and teacher commentary.',
        subject: 'Chemistry',
        type: 'video',
        category: 'live_recording',
        uploaderName: 'Edamaa Science School',
        uploaderRole: 'school',
        uploaderEmail: 'school@edamaa.dev',
        fileName: 'chemistry-titration-live-recording.txt',
        mimeType: 'text/plain',
        createdAtOffsetMs: 1000 * 60 * 95,
        bodyText:
          'Chemistry Titration Live Class Recording\n\nSegment markers:\n- Apparatus setup\n- End-point explanation\n- Observation table review',
      },
      {
        id: 'resource_seed_enrollment_letter_pack',
        title: 'Enrollment Letter Template',
        description: 'Official enrollment confirmation letter for newly admitted students.',
        subject: 'School Admin',
        type: 'document',
        category: 'official_document',
        uploaderName: 'Edamaa Science School',
        uploaderRole: 'school',
        uploaderEmail: 'school@edamaa.dev',
        fileName: 'enrollment-letter-template.txt',
        mimeType: 'text/plain',
        createdAtOffsetMs: 1000 * 60 * 140,
        bodyText:
          'Enrollment Letter\n\nThis letter confirms that the student has been formally enrolled in the school for the current session.',
      },
    ];

    seededResources.forEach((seeded) => {
      const resource: ResourceRecord = {
        id: seeded.id,
        title: seeded.title,
        description: seeded.description,
        subject: seeded.subject,
        type: seeded.type,
        category: seeded.category,
        pricingType: seeded.pricingType || 'free',
        priceMinor: seeded.priceMinor ?? null,
        uploaderName: seeded.uploaderName,
        uploaderRole: seeded.uploaderRole,
        uploaderEmail: seeded.uploaderEmail,
        createdAt: new Date(now - seeded.createdAtOffsetMs),
        downloads: Math.floor(Math.random() * 240) + 18,
        fileName: seeded.fileName,
        mimeType: seeded.mimeType,
        fileSizeBytes: Buffer.byteLength(seeded.bodyText, 'utf8'),
      };

      this.resources.push(resource);
      this.filesByResourceId.set(resource.id, {
        fileName: seeded.fileName,
        mimeType: seeded.mimeType,
        bytes: Buffer.from(seeded.bodyText, 'utf8'),
      });
      this.notifications.push(this.createNotificationForResource(resource));
    });

    // Keep newest resources and notifications first for user-friendly feed order.
    this.resources.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    this.notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    this.logger.log(`Seeded ${this.resources.length} starter resources for local development.`);
  }
}
