export type StudentSchoolLevel = '' | 'primary' | 'secondary' | 'tertiary';

export type StudentIdentity = {
  id: number;
  name: string;
  phone: string;
  avatar?: string;
  schoolLevel?: StudentSchoolLevel;
  department?: string;
  classGroup?: string;
};

const STUDENT_IDENTITY_STORAGE_KEY = 'edamaa_student_identity_v1';
const STUDENT_DISPLAY_NAME_STORAGE_KEY = 'edamaa_student_display_name';

const DEFAULT_STUDENT_IDENTITY: StudentIdentity = {
  id: 1,
  name: 'Adetokunbo Andrew',
  phone: '07048222080',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Setiu',
  schoolLevel: '',
  department: '',
  classGroup: '',
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeStudentIdentity = (value: unknown): StudentIdentity | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = Number(candidate.id);
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const phone = typeof candidate.phone === 'string' ? candidate.phone.trim() : '';
  const avatar = typeof candidate.avatar === 'string' ? candidate.avatar.trim() : '';
  const schoolLevel =
    candidate.schoolLevel === 'primary' ||
    candidate.schoolLevel === 'secondary' ||
    candidate.schoolLevel === 'tertiary'
      ? candidate.schoolLevel
      : DEFAULT_STUDENT_IDENTITY.schoolLevel;
  const department = typeof candidate.department === 'string' ? candidate.department.trim() : '';
  const classGroup = typeof candidate.classGroup === 'string' ? candidate.classGroup.trim() : '';

  if (!Number.isFinite(id) || !name) {
    return null;
  }

  return {
    id,
    name,
    phone: phone || DEFAULT_STUDENT_IDENTITY.phone,
    avatar: avatar || DEFAULT_STUDENT_IDENTITY.avatar,
    schoolLevel,
    department,
    classGroup,
  };
};

export const loadStudentIdentity = (): StudentIdentity => {
  if (typeof window === 'undefined') {
    return DEFAULT_STUDENT_IDENTITY;
  }

  try {
    const raw = window.localStorage.getItem(STUDENT_IDENTITY_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STUDENT_IDENTITY;
    }

    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeStudentIdentity(parsed);
    if (!normalized) {
      return DEFAULT_STUDENT_IDENTITY;
    }

    const displayName = window.localStorage.getItem(STUDENT_DISPLAY_NAME_STORAGE_KEY)?.trim();
    return {
      ...normalized,
      name: displayName || normalized.name,
    };
  } catch {
    return DEFAULT_STUDENT_IDENTITY;
  }
};

export const saveStudentIdentity = (updates: Partial<StudentIdentity>) => {
  if (typeof window === 'undefined') {
    return;
  }

  const current = loadStudentIdentity();
  const next: StudentIdentity = {
    id: isFiniteNumber(updates.id) ? updates.id : current.id,
    name: typeof updates.name === 'string' && updates.name.trim() ? updates.name.trim() : current.name,
    phone: typeof updates.phone === 'string' && updates.phone.trim() ? updates.phone.trim() : current.phone,
    avatar: typeof updates.avatar === 'string' && updates.avatar.trim() ? updates.avatar.trim() : current.avatar,
    schoolLevel:
      updates.schoolLevel === 'primary' ||
      updates.schoolLevel === 'secondary' ||
      updates.schoolLevel === 'tertiary' ||
      updates.schoolLevel === ''
        ? updates.schoolLevel
        : current.schoolLevel || '',
    department:
      typeof updates.department === 'string'
        ? updates.department.trim()
        : current.department || '',
    classGroup:
      typeof updates.classGroup === 'string'
        ? updates.classGroup.trim()
        : current.classGroup || '',
  };

  window.localStorage.setItem(STUDENT_IDENTITY_STORAGE_KEY, JSON.stringify(next));
  if (next.name) {
    window.localStorage.setItem(STUDENT_DISPLAY_NAME_STORAGE_KEY, next.name);
  }
};

export const DEFAULT_STUDENT_ID = DEFAULT_STUDENT_IDENTITY.id;
