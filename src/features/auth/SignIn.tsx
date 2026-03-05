import React, { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getDefaultHomeRouteForRole,
  loadKnownAccountRoleForEmail,
  loadPersistedAccountRoleState,
  loadPersistedLocalDevAuthSession,
  persistAccountRoleState,
  persistKnownAccountRoleForEmail,
  persistLocalDevAuthSession,
  persistSupabaseSession,
  type AppAccountRole,
} from '../../utils/authSession';
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from '../../utils/supabaseClient';
import { loadStudentIdentity, saveStudentIdentity } from '../students/utils/studentIdentity';
import { fetchMyAccountRoles, switchDefaultAccountRole } from './utils/accountRolesApi';

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  const handleNavigate = (path: string): void => {
    navigate(path);
  };

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const deriveFriendlyName = (userEmail: string, fullNameValue: unknown, fallbackName: string) => {
    const metadataName = typeof fullNameValue === 'string' ? fullNameValue.trim() : '';
    if (metadataName) {
      return metadataName;
    }

    const fromEmail = userEmail.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || '';
    if (fromEmail) {
      return fromEmail
        .split(' ')
        .filter(Boolean)
        .map((word) => `${word[0]?.toUpperCase() || ''}${word.slice(1)}`)
        .join(' ');
    }

    return fallbackName;
  };

  const persistDisplayNameByRole = (
    fullName: string,
    role: AppAccountRole,
    user?: {
      app_metadata?: Record<string, unknown> | null;
      user_metadata?: Record<string, unknown> | null;
    } | null
  ) => {
    const readMetadataString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const metadataSchoolName = readMetadataString(
      user?.user_metadata?.school_name
    );
    const metadataAppSchoolName = readMetadataString(
      user?.app_metadata?.school_name
    );

    if (role === 'school') {
      const schoolNameFromStorage = (window.localStorage.getItem('edamaa_school_display_name') || '').trim();
      const schoolName = metadataSchoolName || metadataAppSchoolName || schoolNameFromStorage || fullName || 'School';
      const adminNameFromStorage = (window.localStorage.getItem('edamaa_school_admin_name') || '').trim();
      const adminName = fullName || adminNameFromStorage || 'School Admin';

      window.localStorage.setItem('edamaa_school_display_name', schoolName);
      window.localStorage.setItem('edamaa_school_admin_name', adminName);
      return;
    }
    if (role === 'tutor') {
      window.localStorage.setItem('edamaa_tutor_display_name', fullName || 'Tutor');
      return;
    }
    window.localStorage.setItem('edamaa_student_display_name', fullName || 'Student');
  };

  const resolveRoleFromUser = (
    user: {
      role?: string | null;
      app_metadata?: Record<string, unknown> | null;
      user_metadata?: Record<string, unknown> | null;
    } | null | undefined
  ): AppAccountRole => {
    const mapCandidateToRole = (value: unknown): AppAccountRole | null => {
      const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
      if (!normalized) {
        return null;
      }

      if (normalized === 'school' || normalized === 'school-admin' || normalized === 'school-owner') {
        return 'school';
      }
      if (normalized === 'tutor' || normalized === 'teacher' || normalized === 'instructor') {
        return 'tutor';
      }
      if (normalized === 'admin') {
        return 'admin';
      }
      if (normalized === 'student') {
        return 'student';
      }

      // Supabase auth role values like "authenticated" and "anon" are not app account roles.
      return null;
    };

    const roleCandidates = [
      user?.role,
      typeof user?.app_metadata?.role === 'string' ? user.app_metadata.role : '',
      typeof user?.user_metadata?.role === 'string' ? user.user_metadata.role : '',
      typeof user?.user_metadata?.account_role === 'string' ? user.user_metadata.account_role : '',
      typeof user?.user_metadata?.user_type === 'string' ? user.user_metadata.user_type : '',
      typeof user?.app_metadata?.user_type === 'string' ? user.app_metadata.user_type : '',
    ];

    for (const candidate of roleCandidates) {
      const mappedRole = mapCandidateToRole(candidate);
      if (mappedRole) {
        return mappedRole;
      }
    }

    return 'student';
  };

  const syncRoleStateFromBackend = async (fallbackRole: AppAccountRole) => {
    try {
      let payload = await fetchMyAccountRoles();

      // If backend knows this role but default is different, switch immediately for correct landing page.
      if (
        fallbackRole !== 'student' &&
        payload.user.defaultRole !== fallbackRole &&
        payload.activeRoles.includes(fallbackRole)
      ) {
        try {
          const switched = await switchDefaultAccountRole(fallbackRole);
          payload = switched.roleState;
        } catch {
          // Keep using current payload if switch is not allowed.
        }
      }

      let defaultRole = payload.user.defaultRole || fallbackRole;
      let activeRoles =
        payload.activeRoles && payload.activeRoles.length > 0
          ? payload.activeRoles
          : [defaultRole];

      // Backend can be temporarily stale for freshly upgraded accounts.
      // Prefer a non-student fallback role from auth metadata/signup memory.
      if (fallbackRole !== 'student' && defaultRole === 'student') {
        defaultRole = fallbackRole;
        activeRoles = Array.from(new Set([fallbackRole, ...activeRoles]));
      }

      persistAccountRoleState({
        defaultRole,
        activeRoles,
        source: 'backend',
      });

      return {
        defaultRole,
        activeRoles,
      };
    } catch {
      const persisted = loadPersistedAccountRoleState();
      // Only trust cached role state if it matches this sign-in's resolved role.
      // This avoids cross-account stale role redirects (e.g., previous student session).
      if (persisted && persisted.defaultRole === fallbackRole) {
        return {
          defaultRole: persisted.defaultRole,
          activeRoles: persisted.activeRoles,
        };
      }
      return {
        defaultRole: fallbackRole,
        activeRoles: [fallbackRole],
      };
    }
  };

  const isPathAllowedForRole = (path: string, role: AppAccountRole) => {
    const normalizedPath = String(path || '').trim().toLowerCase();
    if (!normalizedPath.startsWith('/')) {
      return false;
    }

    if (role === 'school') {
      return normalizedPath.startsWith('/school-') || normalizedPath === '/account-roles';
    }
    if (role === 'tutor') {
      return normalizedPath.startsWith('/tutor-') || normalizedPath === '/account-roles';
    }
    if (role === 'student') {
      return (
        normalizedPath.startsWith('/student-') ||
        normalizedPath === '/student-home' ||
        normalizedPath === '/student-dashboard' ||
        normalizedPath === '/payments' ||
        normalizedPath === '/resources' ||
        normalizedPath === '/assignments' ||
        normalizedPath === '/mycourses' ||
        normalizedPath === '/course-learning' ||
        normalizedPath === '/course' ||
        normalizedPath === '/performance' ||
        normalizedPath === '/notifications' ||
        normalizedPath === '/account-roles'
      );
    }
    return true;
  };

  const completeSignIn = (
    fullName: string,
    notice: string,
    role: AppAccountRole = 'student',
    user?: {
      app_metadata?: Record<string, unknown> | null;
      user_metadata?: Record<string, unknown> | null;
    } | null
  ) => {
    const currentIdentity = loadStudentIdentity();
    saveStudentIdentity({
      id: currentIdentity.id,
      name: fullName,
    });
    persistDisplayNameByRole(fullName, role, user);
    setAuthNotice(notice);

    const requestedTarget =
      location.state &&
      typeof location.state === 'object' &&
      'from' in location.state &&
      typeof (location.state as { from?: unknown }).from === 'string'
        ? ((location.state as { from?: string }).from as string)
        : '';

    const redirectTarget =
      requestedTarget && isPathAllowedForRole(requestedTarget, role)
        ? requestedTarget
        : getDefaultHomeRouteForRole(role);

    navigate(redirectTarget, { replace: true });
  };

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hasOauthMarker =
      searchParams.has('oauth') ||
      searchParams.has('code') ||
      searchParams.has('error') ||
      hashParams.has('access_token') ||
      hashParams.has('error');

    if (!hasOauthMarker) {
      return;
    }

    let cancelled = false;

    const handleOAuthReturn = async () => {
      setAuthError('');
      setAuthNotice('');
      setIsSubmitting(true);

      try {
        const oauthError =
          searchParams.get('error_description') ||
          searchParams.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error') ||
          '';

        if (oauthError) {
          if (!cancelled) {
            setAuthError(oauthError);
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          if (!cancelled) {
            setAuthError(error?.message || 'Sign-in callback failed. Please try again.');
          }
          return;
        }

        persistSupabaseSession(data.session);

        const normalizedEmail = normalizeEmail(data.session.user?.email || '');
        const knownRoleForEmail = normalizedEmail ? loadKnownAccountRoleForEmail(normalizedEmail) : null;
        const metadataRole = resolveRoleFromUser(data.session.user);
        const accountRole =
          knownRoleForEmail && metadataRole === 'student' ? knownRoleForEmail : metadataRole;
        const syncedRoleState = await syncRoleStateFromBackend(accountRole);

        if (normalizedEmail) {
          persistKnownAccountRoleForEmail(normalizedEmail, syncedRoleState.defaultRole);
        }

        const fullName = deriveFriendlyName(
          data.session.user?.email || normalizedEmail || 'student@edamaa.local',
          (data.session.user?.user_metadata as Record<string, unknown> | undefined)?.full_name,
          'Student'
        );

        if (!cancelled) {
          completeSignIn(
            fullName,
            'Sign-in successful. Redirecting to your dashboard...',
            syncedRoleState.defaultRole,
            data.session.user
          );
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unable to complete sign-in.';
          setAuthError(message);
        }
      } finally {
        if (!cancelled) {
          setIsSubmitting(false);
        }
        if (window.location.pathname === '/signin') {
          window.history.replaceState({}, document.title, '/signin');
        }
      }
    };

    void handleOAuthReturn();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    setAuthNotice('');

    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setAuthError('Please enter your email address and password to continue.');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      setAuthError('Use the email address linked to your Edamaa account.');
      return;
    }

    const knownRoleForEmail = loadKnownAccountRoleForEmail(normalizedEmail);

    if (!isSupabaseBrowserConfigured()) {
      if (!import.meta.env.DEV) {
        setAuthError('Sign-in is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        return;
      }

      const fallbackName = deriveFriendlyName(normalizedEmail, '', 'Student');
      const fallbackRoleState = loadPersistedAccountRoleState();
      const fallbackRole =
        knownRoleForEmail ||
        fallbackRoleState?.defaultRole ||
        loadPersistedLocalDevAuthSession()?.defaultRole ||
        'student';

      persistLocalDevAuthSession(normalizedEmail, fallbackRole, {
        defaultRole: fallbackRole,
        activeRoles: fallbackRoleState?.activeRoles || [fallbackRole],
      });

      const syncedRoleState = await syncRoleStateFromBackend(fallbackRole);
      persistLocalDevAuthSession(normalizedEmail, syncedRoleState.defaultRole, {
        defaultRole: syncedRoleState.defaultRole,
        activeRoles: syncedRoleState.activeRoles,
      });
      persistKnownAccountRoleForEmail(normalizedEmail, syncedRoleState.defaultRole);

      completeSignIn(
        fallbackName,
        'You are signed in using local development mode. Add Supabase keys to enable cloud authentication.',
        syncedRoleState.defaultRole
      );
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError('Unable to initialize the sign-in service. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error || !data.session) {
        setAuthError(error?.message || 'Sign-in failed. Please check your credentials and try again.');
        return;
      }

      persistSupabaseSession(data.session);
      const metadataRole = resolveRoleFromUser(data.user);
      const accountRole =
        knownRoleForEmail && metadataRole === 'student' ? knownRoleForEmail : metadataRole;
      const syncedRoleState = await syncRoleStateFromBackend(accountRole);
      persistKnownAccountRoleForEmail(normalizedEmail, syncedRoleState.defaultRole);
      const fullName = deriveFriendlyName(
        data.user?.email || normalizedEmail,
        (data.user?.user_metadata as Record<string, unknown> | undefined)?.full_name,
        'Student'
      );
      completeSignIn(
        fullName,
        'Sign-in successful. Redirecting to your dashboard...',
        syncedRoleState.defaultRole,
        data.user
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in right now.';
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    setAuthError('');
    setAuthNotice('');

    if (!isSupabaseBrowserConfigured()) {
      setAuthError('Google sign-in is not configured yet.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError('Unable to initialize Google sign-in right now.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/signin?oauth=google`,
      },
    });

    if (error) {
      setAuthError(error.message || 'Google sign-in could not start. Please try again.');
      setIsSubmitting(false);
      return;
    }

    setAuthNotice('Taking you to Google for secure sign-in...');
  };

  const handleLinkedInSignIn = async (): Promise<void> => {
    setAuthError('');
    setAuthNotice('');

    if (!isSupabaseBrowserConfigured()) {
      setAuthError('LinkedIn sign-in is not configured yet.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError('Unable to initialize LinkedIn sign-in right now.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc' as any,
      options: {
        redirectTo: `${window.location.origin}/signin?oauth=linkedin`,
      },
    });

    if (error) {
      setAuthError(
        error.message ||
          'LinkedIn sign-in could not start. Enable LinkedIn provider in Supabase Auth settings.'
      );
      setIsSubmitting(false);
      return;
    }

    setAuthNotice('Taking you to LinkedIn for secure sign-in...');
  };

  return (
    <div className='fixed inset-0 w-full h-full overflow-y-auto bg-white'>
      <div className='min-h-full flex flex-col items-center justify-center px-4 sm:px-6 py-8'>
        
        {/* Main Content */}
        <div className='w-full max-w-md'>
          {/* Logo */}
          {/* <div className='mb-8 flex justify-center'>
            <Logo logoWidth={60} logoHeight={60} textSize="text-xl sm:text-2xl" gap="gap-2" centered={false} />
          </div> */}

          {/* Title */}
          <h1 className='text-[25px] font-semibold text-[#3D08BA] mb-2 text-center'>
            Welcome Back
          </h1>
          <p className='text-gray-600 text-sm mb-8 text-center'>
            Sign in to continue your learning journey
          </p>

          {/* Login Form */}
          <form className='space-y-4 mb-6' onSubmit={handleSignIn}>
            <div>
              <label className='block text-gray-700 text-sm font-medium mb-2'>
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className='w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-700'
              />
            </div>

            <div>
              <label className='block text-gray-700 text-sm font-medium mb-2'>
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className='w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-700'
              />
            </div>

            {/* Forgot Password Link */}
            <div className='flex justify-end'>
              <button 
                onClick={() => handleNavigate('/password-recovery')}
                className='text-[#3D08BA] text-sm font-medium hover:underline'
              >
                Forgot password?
              </button>
            </div>

            {authError && (
              <p className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                {authError}
              </p>
            )}

            {authNotice && (
              <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>
                {authNotice}
              </p>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl font-medium text-lg transition-opacity mb-2 text-white ${
                isSubmitting ? 'cursor-not-allowed bg-[#6f48c8] opacity-80' : 'bg-[#3D08BA] hover:opacity-90'
              }`}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className='flex items-center my-6'>
            <div className='flex-1 h-px bg-gray-300'></div>
            <span className='px-4 text-gray-500 text-sm font-medium'>OR</span>
            <div className='flex-1 h-px bg-gray-300'></div>
          </div>

          {/* Google Sign In Button */}
          <button 
            onClick={handleGoogleSignIn}
            type="button"
            disabled={isSubmitting}
            className='w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-2'
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 2.9 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7z"
              />
              <path
                fill="#34A853"
                d="M3.2 7.3l3.2 2.3C7.3 8.1 9.5 6.7 12 6.7c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 2.9 14.7 2 12 2 8.2 2 4.9 4.1 3.2 7.3z"
              />
              <path
                fill="#4A90E2"
                d="M12 22c2.6 0 4.8-.9 6.4-2.5l-3-2.4c-.8.6-2 1-3.4 1-4.1 0-5.3-2.8-5.5-3.9l-3.3 2.5C4.9 19.9 8.2 22 12 22z"
              />
              <path
                fill="#FBBC05"
                d="M6.5 14.2c-.1-.4-.2-.8-.2-1.2s.1-.8.2-1.2L3.2 9.3C2.4 10.8 2 11.9 2 13s.4 2.2 1.2 3.7l3.3-2.5z"
              />
            </svg>
            Continue with Google
          </button>
          <button 
            onClick={handleLinkedInSignIn}
            type="button"
            disabled={isSubmitting}
            className='w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-2'
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="3" fill="#0A66C2" />
              <rect x="6" y="10" width="2.3" height="8" fill="#fff" />
              <circle cx="7.15" cy="7.2" r="1.25" fill="#fff" />
              <path
                fill="#fff"
                d="M11 10h2.2v1.1h.1c.3-.6 1.1-1.3 2.4-1.3 2.5 0 3 1.6 3 3.8V18h-2.3v-3.8c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2V18H11z"
              />
            </svg>
            Continue with LinkedIn
          </button>

          {/* Sign Up Link */}
          <div className='text-center flex justify-center items-center gap-2'>
            <p className='text-gray-600 text-sm'>
              Don't have an account yet?
            </p>
            <button 
              onClick={() => handleNavigate('/signup')}
              className='underline text-[#3D08BA] '
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
