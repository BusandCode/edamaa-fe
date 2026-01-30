import React, { type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdArrowDropleft, IoMdCamera } from "react-icons/io";
import { MdFolder, MdPeople } from "react-icons/md";
import Logo from '../../../components/common/Logo';

const SchoolRegistration: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = (): void => {
    navigate(-1);
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
  event.preventDefault();
  

  const formData = new FormData(event.currentTarget);
  
  const agreedToTerms = formData.get('agreedToTerms');
  if (!agreedToTerms) {
    alert('Please agree to the terms and conditions');
    return;
  }
  
  console.log('School registration form submitted');
  
  // Navigate to School Dashboard
  navigate('/school-dashboard');
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
          <h1 className='text-xl sm:text-2xl font-bold text-gray-800 mb-1 text-center'>Register As a School/Tutorial Centre</h1>
          <p className='text-xs text-gray-600 mb-1 text-center'>Upload Your school Admin.Picture here</p>
          <p className='text-xs text-gray-600 mb-6 text-center'>Upload Your Passport</p>

          {/* Profile Photo Upload */}
          <div className='relative mb-8'>
            <div className='w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-lg'>
              <div className='w-full h-full flex items-center justify-center'>
                <svg className='w-20 h-20 text-gray-400' fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </div>
            <label className='absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-md'>
              <IoMdCamera size={22} className='text-gray-700' />
              <input 
                type="file" 
                accept="image/*" 
                className='hidden'
              />
            </label>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className='w-full max-w-md space-y-3'>
            <input
              type="text"
              name="schoolName"
              placeholder="School/Centre name"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-sm'
            />

            <div className='relative'>
              <select
                name="schoolType"
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-500 appearance-none text-sm'
              >
                <option value="">School Type</option>
                <option value="primary">Primary School</option>
                <option value="secondary">Secondary School</option>
                <option value="tutorial">Tutorial Centre</option>
                <option value="university">University</option>
              </select>
              <div className='absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none'>
                <svg className='w-4 h-4 text-gray-500' fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <input
              type="text"
              name="registrationNumber"
              placeholder="Registration/License Number"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-sm'
            />

            <input
              type="text"
              name="website"
              placeholder="Website (optional)"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-sm'
            />

            {/* Contact Details Divider */}
            <div className='flex items-center my-6'>
              <div className='flex-1 h-px bg-gray-300'></div>
              <span className='px-4 text-[#3D08BA] font-bold text-sm'>Contact Details</span>
              <div className='flex-1 h-px bg-gray-300'></div>
            </div>

            <input
              type="text"
              name="adminFullName"
              placeholder="Admin Full Name"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-sm'
            />

            <div className='relative'>
              <select
                name="language"
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-500 appearance-none text-sm'
              >
                <option value="">Language</option>
                <option value="english">English</option>
                <option value="french">French</option>
                <option value="spanish">Spanish</option>
                <option value="yoruba">Yoruba</option>
                <option value="hausa">Hausa</option>
                <option value="igbo">Igbo</option>
              </select>
              <div className='absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none'>
                <svg className='w-4 h-4 text-gray-500' fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-sm'
            />

            <input
              type="tel"
              name="phoneNumber"
              placeholder="Phone Number"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-sm'
            />

            <input
              type="text"
              name="address"
              placeholder="Address/Location"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-sm'
            />

            {/* Account Set up Divider */}
            <div className='flex items-center my-6'>
              <div className='flex-1 h-px bg-gray-300'></div>
              <span className='px-4 text-[#3D08BA] font-bold text-sm'>Account Set up</span>
              <div className='flex-1 h-px bg-gray-300'></div>
            </div>

            <input
              type="text"
              name="username"
              placeholder="Username"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-sm'
            />

            <input
              type="password"
              name="password"
              placeholder="Create Password"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-sm'
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-sm'
            />

            {/* Upload Documents Divider */}
            <div className='flex items-center my-6'>
              <div className='flex-1 h-px bg-gray-300'></div>
              <span className='px-4 text-[#3D08BA] font-bold text-sm'>Upload Documents</span>
              <div className='flex-1 h-px bg-gray-300'></div>
            </div>

            {/* Upload Proof of Accreditation */}
            <div className='relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden p-6'>
              <input
                type="file"
                accept=".pdf,image/*"
                className='hidden'
                id="accreditation"
              />
              <label 
                htmlFor="accreditation"
                className='flex flex-col items-center justify-center cursor-pointer'
              >
                <div className='text-xs text-gray-600 mb-3 flex items-center justify-between w-full'>
                  <span>Proof of Accreditation</span>
                  <span className='text-[#3D08BA] font-medium'>Upload File</span>
                </div>
                <MdFolder size={80} className='text-gray-800' />
              </label>
            </div>

            <div className='relative'>
              <input
                type="text"
                name="numberOfStaffs"
                placeholder="Number of Staffs"
                className='w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-sm'
              />
              <div className='absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none'>
                <MdPeople size={22} className='text-gray-600' />
              </div>
            </div>

            <div className='relative'>
              <select
                name="paymentPlan"
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-500 appearance-none text-sm'
              >
                <option value="">Payment Plan</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
              <div className='absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none'>
                <svg className='w-4 h-4 text-gray-500' fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className='flex items-center gap-2 py-2'>
              <input
                type="checkbox"
                name="agreedToTerms"
                id="terms"
                className='w-5 h-5 border-2 border-gray-300 rounded cursor-pointer accent-[#3D08BA]'
              />
              <label htmlFor="terms" className='text-sm text-[#3D08BA] cursor-pointer'>
                I agree to the terms and conditions
              </label>
            </div>

            <button type="submit" className='w-full bg-[#3D08BA] text-white py-3.5 rounded-lg font-semibold hover:opacity-90 transition-opacity mt-4 text-base'>
              Register
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistration