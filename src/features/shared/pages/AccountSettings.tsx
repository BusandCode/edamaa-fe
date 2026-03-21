import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import StudentProfile from '../../students/pages/StudentProfile';
import TutorProfile from '../../tutors/pages/TutorProfile';
import {
  getDefaultHomeRouteForRole,
  loadPersistedLocalDevAuthSession,
  resolvePersistedDefaultRole,
} from '../../../utils/authSession';
import {
  loadStudentIdentity,
  saveStudentIdentity,
  type StudentSchoolLevel,
} from '../../students/utils/studentIdentity';
import {
  loadTutorBranding,
  persistTutorDisplayName,
  persistTutorProfileImage,
} from '../../../utils/tutorBranding';
import {
  loadPersistedAuthEmail,
  loadSchoolBrandingNames,
  loadSchoolProfileImage,
  persistSchoolBrandingNames,
  persistSchoolProfileImage,
} from '../../../utils/schoolBranding';

type StudentSettingsState = {
  name: string;
  username: string;
  email: string;
  bio: string;
  profileImage: string | null;
  schoolLevel: StudentSchoolLevel;
  department: string;
  classGroup: string;
};

type TutorSettingsState = {
  name: string;
  username?: string;
  email: string;
  bio: string;
  subjects: string;
  experience: string;
  profileImage: string | null;
};

type SchoolSettingsState = {
  schoolName: string;
  adminName: string;
  email: string;
  profileImage: string | null;
};

const STUDENT_SETTINGS_STORAGE_KEY = 'edamaa_student_settings_page_v1';
const TUTOR_SETTINGS_STORAGE_KEY = 'edamaa_tutor_settings_page_v1';

const readStoredObject = (key: string) => {
  if (typeof window === 'undefined') {
    return {} as Record<string, unknown>;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {} as Record<string, unknown>;
    }

    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {} as Record<string, unknown>;
  }
};

const persistStoredObject = (key: string, value: unknown) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore browser storage errors.
  }
};

const deriveUsername = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '') || 'edamaa-user';

const AccountSettings = () => {
  const navigate = useNavigate();
  const currentRole = resolvePersistedDefaultRole();
  const homeRoute = getDefaultHomeRouteForRole(currentRole);
  const localDevSession = loadPersistedLocalDevAuthSession();
  const authEmail = localDevSession?.email || loadPersistedAuthEmail() || '';
  const [notice, setNotice] = useState('');

  const initialStudentSettings = useMemo((): StudentSettingsState => {
    const identity = loadStudentIdentity();
    const stored = readStoredObject(STUDENT_SETTINGS_STORAGE_KEY);

    return {
      name: typeof stored.name === 'string' && stored.name.trim() ? stored.name.trim() : identity.name,
      username:
        typeof stored.username === 'string' && stored.username.trim()
          ? stored.username.trim()
          : deriveUsername(identity.name),
      email:
        typeof stored.email === 'string' && stored.email.trim()
          ? stored.email.trim()
          : authEmail || 'student@edamaa3d.com',
      bio:
        typeof stored.bio === 'string' && stored.bio.trim()
          ? stored.bio.trim()
          : 'Manage your learning profile and class details here.',
      profileImage:
        typeof stored.profileImage === 'string' && stored.profileImage.trim()
          ? stored.profileImage.trim()
          : identity.avatar || null,
      schoolLevel:
        stored.schoolLevel === 'primary' ||
        stored.schoolLevel === 'secondary' ||
        stored.schoolLevel === 'tertiary' ||
        stored.schoolLevel === ''
          ? stored.schoolLevel
          : identity.schoolLevel || '',
      department:
        typeof stored.department === 'string' ? stored.department.trim() : identity.department || '',
      classGroup:
        typeof stored.classGroup === 'string' ? stored.classGroup.trim() : identity.classGroup || '',
    };
  }, [authEmail]);

  const initialTutorSettings = useMemo((): TutorSettingsState => {
    const branding = loadTutorBranding();
    const stored = readStoredObject(TUTOR_SETTINGS_STORAGE_KEY);

    return {
      name: typeof stored.name === 'string' && stored.name.trim() ? stored.name.trim() : branding.displayName,
      username:
        typeof stored.username === 'string' && stored.username.trim()
          ? stored.username.trim()
          : deriveUsername(branding.displayName),
      email:
        typeof stored.email === 'string' && stored.email.trim()
          ? stored.email.trim()
          : authEmail || 'tutor@edamaa3d.com',
      bio:
        typeof stored.bio === 'string' && stored.bio.trim()
          ? stored.bio.trim()
          : 'Manage your tutor profile and classroom identity here.',
      subjects:
        typeof stored.subjects === 'string' && stored.subjects.trim()
          ? stored.subjects.trim()
          : 'Mathematics, Science',
      experience:
        typeof stored.experience === 'string' && stored.experience.trim()
          ? stored.experience.trim()
          : '3 years',
      profileImage:
        typeof stored.profileImage === 'string' && stored.profileImage.trim()
          ? stored.profileImage.trim()
          : branding.profileImage || null,
    };
  }, [authEmail]);

  const initialSchoolSettings = useMemo((): SchoolSettingsState => {
    const names = loadSchoolBrandingNames();

    return {
      schoolName: names.schoolName || 'School',
      adminName: names.adminName || 'School Admin',
      email: authEmail || 'school@edamaa3d.com',
      profileImage: loadSchoolProfileImage(authEmail) || null,
    };
  }, [authEmail]);

  const [studentSettings, setStudentSettings] = useState(initialStudentSettings);
  const [tutorSettings, setTutorSettings] = useState(initialTutorSettings);
  const [schoolSettings, setSchoolSettings] = useState(initialSchoolSettings);

  const handleStudentSave = (profile: StudentSettingsState) => {
    setStudentSettings(profile);
    persistStoredObject(STUDENT_SETTINGS_STORAGE_KEY, profile);
    saveStudentIdentity({
      name: profile.name,
      avatar: profile.profileImage || '',
      schoolLevel: profile.schoolLevel,
      department: profile.department,
      classGroup: profile.classGroup,
    });
    setNotice('Student settings saved.');
  };

  const handleTutorSave = (profile: TutorSettingsState) => {
    setTutorSettings(profile);
    persistStoredObject(TUTOR_SETTINGS_STORAGE_KEY, profile);
    persistTutorDisplayName(profile.name);
    persistTutorProfileImage(profile.profileImage || '', profile.email);
    setNotice('Tutor settings saved.');
  };

  const handleSchoolImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSchoolSettings((current) => ({
        ...current,
        profileImage: String(reader.result || ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSchoolSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const savedNames = persistSchoolBrandingNames({
      schoolName: schoolSettings.schoolName,
      adminName: schoolSettings.adminName,
    });
    persistSchoolProfileImage(schoolSettings.profileImage || '', schoolSettings.email);
    setSchoolSettings((current) => ({
      ...current,
      schoolName: savedNames.schoolName || 'School',
      adminName: savedNames.adminName || 'School Admin',
    }));
    setNotice('School settings saved.');
  };

  const openSupport = () => {
    window.location.href = 'mailto:support@edamaa3d.com?subject=Edamaa3D%20Account%20Settings';
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => navigate(homeRoute)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Account</p>
            <h1 className="text-base font-semibold text-slate-900">Settings</h1>
          </div>
          <button
            onClick={openSupport}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <QuestionMarkCircleIcon className="h-4 w-4" />
            Help
          </button>
        </div>
        {notice ? (
          <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-2 text-center text-sm font-medium text-emerald-700">
            {notice}
          </div>
        ) : null}
      </div>

      {currentRole === 'student' ? (
        <StudentProfile
          onSave={handleStudentSave}
          initialName={studentSettings.name}
          initialUsername={studentSettings.username}
          initialEmail={studentSettings.email}
          initialBio={studentSettings.bio}
          initialProfileImage={studentSettings.profileImage}
          initialSchoolLevel={studentSettings.schoolLevel}
          initialDepartment={studentSettings.department}
          initialClassGroup={studentSettings.classGroup}
        />
      ) : null}

      {currentRole === 'tutor' ? (
        <TutorProfile
          onSave={handleTutorSave}
          initialName={tutorSettings.name}
          initialUsername={tutorSettings.username}
          initialEmail={tutorSettings.email}
          initialBio={tutorSettings.bio}
          initialSubjects={tutorSettings.subjects}
          initialExperience={tutorSettings.experience}
          initialProfileImage={tutorSettings.profileImage}
        />
      ) : null}

      {currentRole === 'school' ? (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(61,8,186,0.08),rgba(255,255,255,0.98)_55%,rgba(15,23,42,0.02))] px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">School Workspace</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Account settings</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Manage the school profile, branding, account access, subscription, and support links used across the
                    school workspace.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate('/account-roles')}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <UserGroupIcon className="h-4 w-4" />
                    Account Roles
                  </button>
                  <button
                    onClick={() => navigate('/subscription?actor=school')}
                    className="inline-flex items-center gap-2 rounded-full bg-[#3D08BA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f0693]"
                  >
                    <BanknotesIcon className="h-4 w-4" />
                    Subscription
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.95fr)]">
              <form onSubmit={handleSchoolSave} className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Profile & Branding</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">School identity</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    These details appear on the school dashboard, certificates, official documents, and exported files.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-sm">
                        {schoolSettings.profileImage ? (
                          <img
                            src={schoolSettings.profileImage}
                            alt="School profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <BuildingOffice2Icon className="h-12 w-12 text-slate-500" />
                        )}
                      </div>
                      <label className="mt-4 inline-flex cursor-pointer items-center rounded-full bg-[#3D08BA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f0693]">
                        Upload logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleSchoolImageChange} />
                      </label>
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        Use a clear square logo for dashboard identity, letters, and certificates.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">School name</span>
                      <input
                        type="text"
                        value={schoolSettings.schoolName}
                        onChange={(event) =>
                          setSchoolSettings((current) => ({ ...current, schoolName: event.target.value }))
                        }
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Administrator name</span>
                      <input
                        type="text"
                        value={schoolSettings.adminName}
                        onChange={(event) =>
                          setSchoolSettings((current) => ({ ...current, adminName: event.target.value }))
                        }
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Account email</span>
                      <input
                        type="email"
                        value={schoolSettings.email}
                        onChange={(event) =>
                          setSchoolSettings((current) => ({ ...current, email: event.target.value }))
                        }
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    className="rounded-full bg-[#3D08BA] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2f0693]"
                  >
                    Save school settings
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/school-dashboard')}
                    className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Return to dashboard
                  </button>
                </div>
              </form>

              <div className="grid gap-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Account Roles</p>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">Access control</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Switch roles or confirm which workspaces this school account can open.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/account-roles')}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                    Manage account roles
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Subscription</p>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">Plan & billing</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Open the subscription page to manage the school plan and unlock paid workspace features.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/subscription?actor=school')}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#3D08BA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f0693]"
                  >
                    <BanknotesIcon className="h-4 w-4" />
                    Open subscription
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Support</p>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">Help & contact</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Contact Edamaa support for account corrections or school workspace issues.
                  </p>
                  <button
                    type="button"
                    onClick={openSupport}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    <QuestionMarkCircleIcon className="h-4 w-4" />
                    Contact support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {currentRole === 'admin' ? (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Admin Workspace</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Settings</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Admin-specific settings are not separated yet in MVP. Use the internal admin workspace for operational tasks,
              or contact support if an account change is required.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate('/internal-admin/payouts')}
                className="rounded-full bg-[#3D08BA] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2f0693]"
              >
                Open admin workspace
              </button>
              <button
                onClick={openSupport}
                className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Contact support
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AccountSettings;
