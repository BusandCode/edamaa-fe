import React from 'react'
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/common/Logo';

const SignUp: React.FC = () => {
    const navigate = useNavigate();

    const handleNavigate = (path: string): void => {
        navigate(path);
    }

  return (
    <div className='fixed inset-0 w-full h-full overflow-y-auto'>
      <div className='min-h-full flex flex-col'>
        {/* Main Content */}
        <div className='flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8'>
          {/* Logo Section */}
          <div className='mb-4 sm:mb-6'>
            <Logo logoWidth={70} logoHeight={70} textSize="text-xl sm:text-2xl" gap="gap-2" centered={false} />
          </div>

          {/* Tagline */}
          <div className='text-center mb-6 sm:mb-8'>
            <h2 className='text-sm sm:text-base font-semibold text-gray-900 mb-1'>
              Borderless Education for the Future
            </h2>
            <p className='text-xs sm:text-sm text-gray-600'>
              Connecting Classrooms • Empowering Students • Globalizing Learning
            </p>
          </div>

          {/* Welcome Section */}
          <div className='text-center mb-6 sm:mb-8 mt-4 sm:mt-10'>
            <h1 className='text-[25px] font-semibold text-[#3D08BA] leading-tight mb-1'>
              Welcome
            </h1>
          </div>

          {/* Action Buttons */}
          <div className='flex flex-col gap-3 sm:gap-4 w-full max-w-70 sm:max-w-[320px] mb-5 sm:mb-6'>
            <button 
              onClick={() => handleNavigate('/student-registration')}
              className='bg-[#3D08BA] cursor-pointer rounded-lg sm:rounded-xl w-full h-12 sm:h-14 text-white text-sm sm:text-base font-medium hover:bg-[#2F0695] active:scale-98 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2'
            >
              Join as Student
            </button>
            <div>
              <button 
                onClick={() => handleNavigate('/tutor-registration')}
                className='bg-[#3D08BA] cursor-pointer rounded-lg sm:rounded-xl w-full h-12 sm:h-14 text-white text-sm sm:text-base font-medium hover:bg-[#2F0695] active:scale-98 transition-all text-center flex items-center justify-center shadow-lg hover:shadow-xl'
              >
                Register as an Independent Tutor
              </button>
              <p className='mt-1 text-[11px] text-gray-500'>
                For private tutoring centers and skill instructors.
              </p>
            </div>
            <div>
              <button 
                onClick={() => handleNavigate('/school-registration')}
                className='bg-[#3D08BA] cursor-pointer rounded-lg sm:rounded-xl w-full h-12 sm:h-14 text-white text-sm sm:text-base font-medium hover:bg-[#2F0695] active:scale-98 transition-all text-center flex items-center justify-center shadow-lg hover:shadow-xl'
              >
                Enroll Your School
              </button>
              <p className='mt-1 text-[11px] text-gray-500'>
                School staff teachers do not need tutor registration. They join via school invite links.
              </p>
            </div>
          </div>

          {/* Sign In Link */}
          <button 
            onClick={() => handleNavigate('/signin')}
            className='flex justify-center items-center gap-1 max-w-70 sm:max-w-[320px] mt-5 border border-[#3D08BA] rounded-lg sm:rounded-xl w-full h-12 sm:h-14 text-[#3D08BA] text-sm sm:text-base font-medium hover:bg-[#f9f7f7] active:scale-98 transition-all shadow-lg hover:shadow-xl'
          >
            Already a user?<span className='text-[#3D08BA] font-medium underline ml-1'>Sign in</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignUp
