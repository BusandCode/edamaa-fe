import React, { type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdArrowDropleft,IoMdCamera } from "react-icons/io";
import { MdWork, MdFolder } from "react-icons/md";
import Logo from "../../../components/common/Logo";
import {
  persistAccountRoleState,
  persistKnownAccountRoleForEmail,
  persistLocalDevAuthSession,
  persistSupabaseSession,
} from '../../../utils/authSession';
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from '../../../utils/supabaseClient';

const TutorRegistration: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = (): void => {
    navigate(-1);
  }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    
    const agreedToTerms = formData.get('agreedToTerms');
    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    const fullName = String(formData.get('fullName') || '').trim();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');

    if (!email || !email.includes('@')) {
      alert('Please enter a valid tutor email address.');
      return;
    }

    if (!password || password.length < 6) {
      alert('Please create a password with at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Password confirmation does not match. Please re-enter it.');
      return;
    }

    if (isSupabaseBrowserConfigured()) {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        alert('Sign-up service is unavailable right now. Please refresh and try again.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || 'Tutor',
            role: 'tutor',
            account_role: 'tutor',
          },
        },
      });

      if (error) {
        alert(error.message || 'Unable to create your tutor account right now.');
        return;
      }

      persistSupabaseSession(data.session ?? null);
    } else if (import.meta.env.DEV) {
      persistLocalDevAuthSession(email, 'tutor', {
        defaultRole: 'tutor',
        activeRoles: ['tutor'],
      });
    }

    persistAccountRoleState({
      defaultRole: 'tutor',
      activeRoles: ['tutor'],
      source: 'local-dev',
    });
    persistKnownAccountRoleForEmail(email, 'tutor');

    window.localStorage.setItem('edamaa_tutor_display_name', fullName || 'Tutor');
    alert('Tutor account created successfully. Redirecting to your tutor dashboard...');
    navigate('/tutor-dashboard');
  }
  

  return (
    <div className='fixed inset-0 w-full h-full overflow-y-auto bg-white'>
      <div className='min-h-full flex flex-col'>
        {/* Header with Navigation Arrows */}
        <div className='flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 shrink-0'>
          <button onClick={handleBack} className='w-9 h-9 sm:w-10 sm:h-10 bg-[#3D08BA] rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity'>
            <IoMdArrowDropleft className='text-white' size={30} />
          </button>
          {/* <button className='w-9 h-9 sm:w-10 sm:h-10 bg-[#3D08BA] rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity'>
            <IoMdArrowDropright className='text-white' size={30} />
          </button> */}
        </div>

        {/* Main Content */}
        <div className='flex-1 flex flex-col items-center px-4 sm:px-6 py-4 pb-8'>
          {/* Logo Section */}
          <div className='mb-4'>
            <Logo logoWidth={50} logoHeight={50} textSize="text-lg sm:text-xl" gap="gap-2" centered={false} />
          </div>

          {/* Title */}
          <h1 className='text-2xl sm:text-3xl text-[#3D08BA] font-bold mb-2'>Register As a Tutor</h1>
          <p className='text-sm text-gray-600 mb-6'>Upload Your Picture</p>

          {/* Profile Photo Upload */}
          <div className='relative mb-8'>
            <div className='w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gray-200 overflow-hidden'>
              <div className='w-full h-full flex items-center justify-center'>
                <svg className='w-20 h-20 text-gray-400' fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </div>
            <label className='absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50'>
              <IoMdCamera size={20} className='text-gray-600' />
              <input 
                type="file" 
                accept="image/*" 
                className='hidden'
              />
            </label>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className='w-full max-w-md space-y-4'>
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors'
            />

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors'
            />

            <div className='relative'>
              <select
                name="phoneNumber"
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-500 appearance-none'
              >
                <option value="">Phone Number</option>
                <option value="+234">+234 (Nigeria)</option>
                <option value="+1">+1 (USA)</option>
                <option value="+44">+44 (UK)</option>
              </select>
              <div className='absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none'>
                <svg className='w-4 h-4 text-gray-500' fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <input
              type="password"
              name="password"
              placeholder="Password"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors'
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors'
            />

            {/* Professional Details Divider */}
            <div className='flex items-center my-6'>
              <div className='flex-1 h-px bg-gray-300'></div>
              <span className='px-4 text-[#3D08BA] font-bold text-sm'>PROFESSIONAL DETAILS</span>
              <div className='flex-1 h-px bg-gray-300'></div>
            </div>

            <div className='relative'>
              <select
                name="highestQualification"
                className='w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-500 appearance-none'
              >
                <option value="">Highest Qualification</option>
                <option value="bachelors">Bachelor's Degree</option>
                <option value="masters">Master's Degree</option>
                <option value="phd">PhD</option>
                <option value="diploma">Diploma</option>
              </select>
              <div className='absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 pointer-events-none'>
                <MdWork size={20} className='text-gray-500' />
                <svg className='w-4 h-4 text-gray-500' fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className='relative'>
              <select
                name="areaOfExpertise"
                className='w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-500 appearance-none'
              >
                <option value="">Area of Expertise</option>
                <option value="mathematics">Mathematics</option>
                <option value="science">Science</option>
                <option value="english">English</option>
                <option value="programming">Programming</option>
              </select>
              <div className='absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 pointer-events-none'>
                <svg className='w-5 h-5 text-gray-500' fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <svg className='w-4 h-4 text-gray-500' fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <input
              type="text"
              name="yearsOfExperience"
              placeholder="Years Of Experience"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors'
            />

            {/* Upload Resume/CV */}
            <div className='relative border border-gray-300 rounded-lg overflow-hidden'>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className='hidden'
                id="resume"
              />
              <label 
                htmlFor="resume"
                className='flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50'
              >
                <span className='text-gray-500'>Upload Resume/CV</span>
                <div className='w-16 h-16 bg-gray-800 rounded flex items-center justify-center'>
                  <svg className='w-8 h-8 text-white' fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
                  </svg>
                </div>
              </label>
            </div>

            {/* Upload ID/Certification */}
            <div className='relative border border-gray-300 rounded-lg overflow-hidden'>
              <input
                type="file"
                accept="image/*,.pdf"
                className='hidden'
                id="certification"
              />
              <label 
                htmlFor="certification"
                className='flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50'
              >
                <span className='text-gray-500'>Upload ID/Certification</span>
                <div className='w-16 h-16 bg-gray-800 rounded flex items-center justify-center'>
                  <MdFolder size={32} className='text-white' />
                </div>
              </label>
            </div>

            <input
              type="text"
              name="preferredTeachingHours"
              placeholder="Preferred Teaching Hours/days"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors'
            />

            <div className='flex items-center gap-2 py-2'>
              <input
                type="checkbox"
                name="agreedToTerms"
                id="terms"
                className='w-5 h-5 border-2 border-gray-300 rounded cursor-pointer'
              />
              <label htmlFor="terms" className='text-sm text-[#3D08BA] cursor-pointer'>
                I agree to the terms and conditions
              </label>
            </div>

            <button type="submit" className='w-full bg-[#3D08BA] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity mt-6'>
              Register
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TutorRegistration;
