const SCHOOL_DISPLAY_NAME_STORAGE_KEY = 'edamaa_school_display_name';
const SCHOOL_ADMIN_NAME_STORAGE_KEY = 'edamaa_school_admin_name';
const SCHOOL_PROFILE_IMAGE_CURRENT_STORAGE_KEY = 'edamaa_school_profile_image_current';
const SCHOOL_PROFILE_IMAGE_BY_EMAIL_PREFIX = 'edamaa_school_profile_image_by_email::';
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
    // Ignore storage quota and browser privacy errors.
  }
};

const removeLocalStorageValue = (key: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage permission errors.
  }
};

const resolveEmailScopedImageKey = (email: string) => `${SCHOOL_PROFILE_IMAGE_BY_EMAIL_PREFIX}${normalizeEmail(email)}`;

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

export const loadPersistedAuthEmail = () => {
  const localDevRawValue = readLocalStorageValue(LOCAL_DEV_AUTH_SESSION_STORAGE_KEY).trim();
  if (localDevRawValue) {
    try {
      const parsed = JSON.parse(localDevRawValue) as { email?: string | null };
      const email = typeof parsed?.email === 'string' ? normalizeEmail(parsed.email) : '';
      if (email) {
        return email;
      }
    } catch {
      // Fall through to supabase-backed session parsing.
    }
  }

  return parseSupabaseSessionEmail();
};

export const loadSchoolBrandingNames = () => ({
  schoolName: readLocalStorageValue(SCHOOL_DISPLAY_NAME_STORAGE_KEY).trim(),
  adminName: readLocalStorageValue(SCHOOL_ADMIN_NAME_STORAGE_KEY).trim(),
});

export const loadSchoolProfileImage = (email?: string) => {
  const normalizedEmail = normalizeEmail(email || loadPersistedAuthEmail());
  const currentImage = readLocalStorageValue(SCHOOL_PROFILE_IMAGE_CURRENT_STORAGE_KEY).trim();

  if (normalizedEmail) {
    const scopedImage = readLocalStorageValue(resolveEmailScopedImageKey(normalizedEmail)).trim();
    if (scopedImage) {
      if (currentImage !== scopedImage) {
        writeLocalStorageValue(SCHOOL_PROFILE_IMAGE_CURRENT_STORAGE_KEY, scopedImage);
      }
      return scopedImage;
    }
  }

  return currentImage;
};

export const persistSchoolProfileImage = (imageDataUrl: string, email?: string) => {
  const normalizedEmail = normalizeEmail(email || loadPersistedAuthEmail());
  const normalizedImage = imageDataUrl.trim();

  if (!normalizedImage) {
    removeLocalStorageValue(SCHOOL_PROFILE_IMAGE_CURRENT_STORAGE_KEY);
    if (normalizedEmail) {
      removeLocalStorageValue(resolveEmailScopedImageKey(normalizedEmail));
    }
    return;
  }

  writeLocalStorageValue(SCHOOL_PROFILE_IMAGE_CURRENT_STORAGE_KEY, normalizedImage);
  if (normalizedEmail) {
    writeLocalStorageValue(resolveEmailScopedImageKey(normalizedEmail), normalizedImage);
  }
};

export const clearCurrentSchoolProfileImage = () => {
  removeLocalStorageValue(SCHOOL_PROFILE_IMAGE_CURRENT_STORAGE_KEY);
};

export const schoolBrandingStorageKeys = {
  schoolDisplayName: SCHOOL_DISPLAY_NAME_STORAGE_KEY,
  schoolAdminName: SCHOOL_ADMIN_NAME_STORAGE_KEY,
  schoolProfileImageCurrent: SCHOOL_PROFILE_IMAGE_CURRENT_STORAGE_KEY,
};
