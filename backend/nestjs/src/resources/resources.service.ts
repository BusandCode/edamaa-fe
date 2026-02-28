import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

type AuthUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

type ResourceType = 'pdf' | 'video' | 'image' | 'audio' | 'document';
type ResourceCategory = 'assignment' | 'classwork' | 'note' | 'library';
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

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

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
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);
  private readonly resources: ResourceRecord[] = [];
  private readonly filesByResourceId = new Map<string, ResourceFileRecord>();
  private readonly notifications: ResourceNotificationRecord[] = [];
  private readonly readNotificationIdsByEmail = new Map<string, Set<string>>();
  private seeded = false;

  constructor() {
    this.seedIfNeeded();
  }

  getFeedForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const readIds = this.getReadNotificationIds(email);

    const resources = this.resources.map((resource) => this.toResourceResponse(resource));
    const notifications = this.notifications.map((notification) =>
      this.toNotificationResponse(notification, readIds.has(notification.id))
    );

    const summary: FeedSummary = {
      totalResources: resources.length,
      totalFreeResources: resources.filter((resource) => resource.pricingType === 'free').length,
      classroomResources: resources.filter((resource) => resource.category !== 'library').length,
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
      .map((resource) => this.toResourceResponse(resource));

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
    if (size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException('File is too large. Keep uploads below 25MB for now.');
    }

    if (pricingType === 'paid') {
      throw new BadRequestException(
        'Paid e-library unlock is the next release. For now, publish this as free so students can access it.'
      );
    }

    const resourceType = this.normalizeResourceType(input.type, String(uploadedFile.mimetype || ''));
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
      priceMinor: null,
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
      resource: this.toResourceResponse(resource),
      notification: this.toNotificationResponse(notification, false),
      message: `${resource.title} is now live in the student resources feed.`,
      dataQuality: {
        degraded: false,
        source: 'memory' as const,
      },
    };
  }

  getResourceDownloadForAuthUser(authUser: AuthUser, resourceId: string) {
    this.requireEmail(authUser);
    const normalizedResourceId = String(resourceId || '').trim();

    if (!normalizedResourceId) {
      throw new BadRequestException('Resource id is required.');
    }

    const resource = this.resources.find((item) => item.id === normalizedResourceId);
    if (!resource) {
      throw new NotFoundException('Resource could not be found.');
    }

    if (resource.pricingType === 'paid') {
      throw new BadRequestException(
        'This resource is marked as paid. Paid unlock flow will be available in the next release.'
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
      resource: this.toResourceResponse(resource),
    };
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
    return 'note';
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

  private getReadNotificationIds(email: string) {
    const existing = this.readNotificationIdsByEmail.get(email);
    if (existing) {
      return existing;
    }

    const created = new Set<string>();
    this.readNotificationIdsByEmail.set(email, created);
    return created;
  }

  private toResourceResponse(resource: ResourceRecord): ResourceItemResponse {
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      subject: resource.subject,
      type: resource.type,
      category: resource.category,
      pricingType: resource.pricingType,
      priceLabel: resource.priceMinor !== null ? `₦${resource.priceMinor.toLocaleString()}` : null,
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
      isLocked: resource.pricingType === 'paid',
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
      title: string;
      description: string;
      subject: string;
      type: ResourceType;
      category: ResourceCategory;
      uploaderName: string;
      uploaderRole: UploaderRole;
      uploaderEmail: string;
      fileName: string;
      mimeType: string;
      createdAtOffsetMs: number;
      bodyText: string;
    }> = [
      {
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
    ];

    seededResources.forEach((seeded) => {
      const resource: ResourceRecord = {
        id: makeId('res'),
        title: seeded.title,
        description: seeded.description,
        subject: seeded.subject,
        type: seeded.type,
        category: seeded.category,
        pricingType: 'free',
        priceMinor: null,
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
