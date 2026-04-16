const TUTOR_DISPLAY_NAME_STORAGE_KEY = 'edamaa_tutor_display_name';
const TUTOR_PROFILE_IMAGE_CURRENT_STORAGE_KEY = 'edamaa_tutor_profile_image_current';
const TUTOR_PROFILE_IMAGE_BY_EMAIL_PREFIX = 'edamaa_tutor_profile_image_by_email::';
const LOCAL_DEV_AUTH_SESSION_STORAGE_KEY = 'edamaa_local_dev_auth_v1';
const SUPABASE_SESSION_STORAGE_KEY = 'edamaa_supabase_session_v1';

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const readLocalStorageValue = (key: string) => {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const writeLocalStorageValue = (key: string, value: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore browser storage errors.
  }
};

const removeLocalStorageValue = (key: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore browser storage errors.
  }
};

const resolveEmailScopedImageKey = (email: string) => `${TUTOR_PROFILE_IMAGE_BY_EMAIL_PREFIX}${normalizeEmail(email)}`;

const parseSupabaseSessionEmail = () => {
  const rawValue = readLocalStorageValue(SUPABASE_SESSION_STORAGE_KEY).trim();
  if (!rawValue) {
    return '';
  }

  try {
    const parsed = JSON.parse(rawValue) as { user?: { email?: string | null } | null };
    return typeof parsed?.user?.email === 'string' ? normalizeEmail(parsed.user.email) : '';
  } catch {
    return '';
  }
};

export const loadPersistedTutorAuthEmail = () => {
  const localDevRawValue = readLocalStorageValue(LOCAL_DEV_AUTH_SESSION_STORAGE_KEY).trim();
  if (localDevRawValue) {
    try {
      const parsed = JSON.parse(localDevRawValue) as { email?: string | null };
      const email = typeof parsed?.email === 'string' ? normalizeEmail(parsed.email) : '';
      if (email) {
        return email;
      }
    } catch {
      // Fall through to supabase-backed parsing.
    }
  }

  return parseSupabaseSessionEmail();
};

const deriveInitials = (value: string) => {
  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '');
  return parts.join('') || 'TR';
};

export const loadTutorProfileImage = (email?: string) => {
  const normalizedEmail = normalizeEmail(email || loadPersistedTutorAuthEmail());
  const currentImage = readLocalStorageValue(TUTOR_PROFILE_IMAGE_CURRENT_STORAGE_KEY).trim();

  if (normalizedEmail) {
    const scopedImage = readLocalStorageValue(resolveEmailScopedImageKey(normalizedEmail)).trim();
    if (scopedImage) {
      if (currentImage !== scopedImage) {
        writeLocalStorageValue(TUTOR_PROFILE_IMAGE_CURRENT_STORAGE_KEY, scopedImage);
      }
      return scopedImage;
    }
  }

  return currentImage;
};

export const persistTutorProfileImage = (imageDataUrl: string, email?: string) => {
  const normalizedEmail = normalizeEmail(email || loadPersistedTutorAuthEmail());
  const normalizedImage = imageDataUrl.trim();

  if (!normalizedImage) {
    removeLocalStorageValue(TUTOR_PROFILE_IMAGE_CURRENT_STORAGE_KEY);
    if (normalizedEmail) {
      removeLocalStorageValue(resolveEmailScopedImageKey(normalizedEmail));
    }
    return;
  }

  writeLocalStorageValue(TUTOR_PROFILE_IMAGE_CURRENT_STORAGE_KEY, normalizedImage);
  if (normalizedEmail) {
    writeLocalStorageValue(resolveEmailScopedImageKey(normalizedEmail), normalizedImage);
  }
};

export const persistTutorDisplayName = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    removeLocalStorageValue(TUTOR_DISPLAY_NAME_STORAGE_KEY);
    return;
  }
  writeLocalStorageValue(TUTOR_DISPLAY_NAME_STORAGE_KEY, normalized);
};

export const loadTutorBranding = () => {
  const displayName = readLocalStorageValue(TUTOR_DISPLAY_NAME_STORAGE_KEY).trim() || 'Tutor';
  const profileImage = loadTutorProfileImage();
  return {
    displayName,
    profileImage,
    initials: deriveInitials(displayName),
  };
};

export const clearCurrentTutorProfileImage = () => {
  removeLocalStorageValue(TUTOR_PROFILE_IMAGE_CURRENT_STORAGE_KEY);
};

export const tutorBrandingStorageKeys = {
  tutorDisplayName: TUTOR_DISPLAY_NAME_STORAGE_KEY,
  tutorProfileImageCurrent: TUTOR_PROFILE_IMAGE_CURRENT_STORAGE_KEY,
};
