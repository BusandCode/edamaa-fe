import React, { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { persistLocalDevAuthSession, persistSupabaseSession } from '../../utils/authSession';
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from '../../utils/supabaseClient';
import { loadStudentIdentity, saveStudentIdentity } from '../students/utils/studentIdentity';

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

  const completeSignIn = (fullName: string, notice: string) => {
    const currentIdentity = loadStudentIdentity();
    saveStudentIdentity({
      id: currentIdentity.id,
      name: fullName,
    });

    window.localStorage.setItem('edamaa_student_display_name', fullName);
    setAuthNotice(notice);

    const redirectTarget =
      location.state &&
      typeof location.state === 'object' &&
      'from' in location.state &&
      typeof (location.state as { from?: unknown }).from === 'string'
        ? ((location.state as { from?: string }).from as string)
        : '/student-home';

    navigate(redirectTarget, { replace: true });
  };

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

    if (!isSupabaseBrowserConfigured()) {
      if (!import.meta.env.DEV) {
        setAuthError('Sign-in is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        return;
      }

      const fallbackName = deriveFriendlyName(normalizedEmail, '', 'Student');
      persistLocalDevAuthSession(normalizedEmail);
      completeSignIn(
        fallbackName,
        'You are signed in using local development mode. Add Supabase keys to enable cloud authentication.'
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
      const fullName = deriveFriendlyName(
        data.user?.email || normalizedEmail,
        (data.user?.user_metadata as Record<string, unknown> | undefined)?.full_name,
        'Student'
      );
      completeSignIn(fullName, 'Sign-in successful. Redirecting to your learning home...');
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

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/student-home`,
      },
    });

    if (error) {
      setAuthError(error.message || 'Google sign-in could not start. Please try again.');
      return;
    }

    setAuthNotice('Taking you to Google for secure sign-in...');
  };

  const handleLinkedInSignIn = (): void => {
    setAuthError('');
    setAuthNotice('LinkedIn sign-in is not enabled yet. Please use email/password or Google for now.');
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
            className='w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-2'
          >
            {/* <FaGoogle size={20} className='text-[#DB4437]' /> */}
            Continue with Google
          </button>
          <button 
            onClick={handleLinkedInSignIn}
            type="button"
            className='w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-2'
          >
            {/* <FaGoogle size={20} className='text-[#DB4437]' /> */}
            Sign in with LinkedIn
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
