import React from 'react';
import { useNavigate } from 'react-router-dom';
// import { FaGoogle } from 'react-icons/fa';
// import Logo from "../components/Logo";

const SignIn: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigate = (path: string): void => {
    navigate(path);
  };

  const handleSignIn = (): void => {
    console.log('Sign in clicked');
    // Navigate to school dashboard
    navigate('/dashboard');
  };

  const handleGoogleSignIn = (): void => {
    // Google sign in logic here
    console.log('Google sign in clicked');
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
          <div className='space-y-4 mb-6'>
            <div>
              <label className='block text-gray-700 text-sm font-medium mb-2'>
                Username/Phone Number
              </label>
              <input
                type="text"
                placeholder="Enter username or phone number"
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
          </div>

          {/* Sign In Button */}
          <button 
            onClick={handleSignIn}
            className='w-full bg-[#3D08BA] text-white py-4 rounded-xl font-medium text-lg hover:opacity-90 transition-opacity mb-6'
          >
            Sign In
          </button>

          {/* Divider */}
          <div className='flex items-center my-6'>
            <div className='flex-1 h-px bg-gray-300'></div>
            <span className='px-4 text-gray-500 text-sm font-medium'>OR</span>
            <div className='flex-1 h-px bg-gray-300'></div>
          </div>

          {/* Google Sign In Button */}
          <button 
            onClick={handleGoogleSignIn}
            className='w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-2'
          >
            {/* <FaGoogle size={20} className='text-[#DB4437]' /> */}
            Continue with Google
          </button>
          <button 
            onClick={handleGoogleSignIn}
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