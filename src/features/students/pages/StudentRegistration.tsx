import React, { useMemo, useState, type FormEvent } from 'react';
import { IoMdCamera } from "react-icons/io";
import Logo from '../../../components/common/Logo';
import {languages} from '../../../components/ui/Language';
import { useNavigate } from "react-router-dom";
import { loadStudentIdentity, saveStudentIdentity } from '../utils/studentIdentity';
import {
  persistAccountRoleState,
  persistKnownAccountRoleForEmail,
  persistLocalDevAuthSession,
  persistSupabaseSession,
} from '../../../utils/authSession';
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from '../../../utils/supabaseClient';


const StudentRegistration: React.FC = () => {
  const [dateOfBirth, setDateOfBirth] = useState('');
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 101 }, (_, index) => currentYear - 80 + index);
  }, []);
  const monthOptions = useMemo(
    () => [
      { value: '01', label: 'Jan' },
      { value: '02', label: 'Feb' },
      { value: '03', label: 'Mar' },
      { value: '04', label: 'Apr' },
      { value: '05', label: 'May' },
      { value: '06', label: 'Jun' },
      { value: '07', label: 'Jul' },
      { value: '08', label: 'Aug' },
      { value: '09', label: 'Sep' },
      { value: '10', label: 'Oct' },
      { value: '11', label: 'Nov' },
      { value: '12', label: 'Dec' },
    ],
    []
  );

  const navigate = useNavigate();

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
    const phone = String(formData.get('phone') || '').trim();
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');

    if (!fullName) {
      alert('Please enter your full name so we can personalize your account.');
      return;
    }

    if (!email) {
      alert('Please enter your email address to create your account.');
      return;
    }

    if (!password || password.length < 6) {
      alert('Please choose a password with at least 6 characters.');
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
            full_name: fullName,
            role: 'student',
            account_role: 'student',
          },
        },
      });

      if (error) {
        alert(error.message || 'Unable to create your account right now.');
        return;
      }

      persistSupabaseSession(data.session ?? null);
    } else if (import.meta.env.DEV && email) {
      // Keep local development smooth even before Supabase keys are configured.
      persistLocalDevAuthSession(email, 'student', {
        defaultRole: 'student',
        activeRoles: ['student'],
      });
    }

    persistAccountRoleState({
      defaultRole: 'student',
      activeRoles: ['student'],
      source: 'local-dev',
    });
    persistKnownAccountRoleForEmail(email, 'student');

    // Persist a stable student identity so messaging/call routing can target this student id.
    const currentIdentity = loadStudentIdentity();
    saveStudentIdentity({
      id: currentIdentity.id,
      name: fullName || currentIdentity.name,
      phone: phone || currentIdentity.phone,
    });
    window.localStorage.setItem('edamaa_student_display_name', fullName || currentIdentity.name);
    
    console.log('Student registration form submitted');
    
    // Send new students to the premium home, where they can open Student Dashboard from the header button.
    alert('Registration successful! Redirecting to your learning home...');
    navigate('/student-home');
  }

  return (
    <div className='fixed inset-0 w-full h-full overflow-y-auto bg-white'>
      <div className='min-h-full flex flex-col'>
        {/* Main Content */}
        <div className='flex-1 flex flex-col items-center px-4 sm:px-6 py-4 pb-8'>
          {/* Logo Section */}
           <div className='mb-4'>
            <Logo logoWidth={50} logoHeight={50} textSize="text-lg sm:text-xl" gap="gap-2" centered={false} />
          </div>

          {/* Title */}
          <h1 className='text-[20px] sm:text-[24px] font-bold text-[#3D08BA] mb-6'>Student Registration</h1>

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

            <input
              type="tel"
              name="phone"
              placeholder="Phone Number(Optional)"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors'
            />

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

            {/* Fixed Date Field with Label */}
            <div className="relative space-y-2">
                <label
                  htmlFor="dob"
                  className="absolute left-4 -top-2 bg-white px-1 text-xs text-gray-500"
                >
                  Date of Birth
                </label>

                <input
                  id="dob"
                  type="date"
                  name="dateOfBirth"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg
                            focus:outline-none focus:border-[#3D08BA]"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500">Jump year:</label>
                  <select
                    value={dateOfBirth ? dateOfBirth.slice(0, 4) : ''}
                    onChange={(event) => {
                      const selectedYear = event.target.value;
                      if (!selectedYear) {
                        return;
                      }
                      setDateOfBirth((prev) => {
                        const base = prev || `${new Date().getFullYear()}-01-01`;
                        const [, month = '01', day = '01'] = base.split('-');
                        return `${selectedYear}-${month}-${day}`;
                      });
                    }}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                  >
                    <option value="">Select year</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <label className="text-xs font-semibold text-gray-500">Month:</label>
                  <select
                    value={dateOfBirth ? dateOfBirth.slice(5, 7) : ''}
                    onChange={(event) => {
                      const selectedMonth = event.target.value;
                      if (!selectedMonth) {
                        return;
                      }
                      setDateOfBirth((prev) => {
                        const base = prev || `${new Date().getFullYear()}-01-01`;
                        const [year = String(new Date().getFullYear()), , day = '01'] = base.split('-');
                        return `${year}-${selectedMonth}-${day}`;
                      });
                    }}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                  >
                    <option value="">Select month</option>
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>


            {/* Language Select - Using imported languages data */}
            <select
              name="language"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-500'
            >
              <option value="">Select Language</option>
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>

            <select
              name="gender"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-500'
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            <input
              type="text"
              name="address"
              placeholder="Address"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors'
            />

            <select
              name="country"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-500'
            >
              <option value="">Country</option>
              <option value="nigeria">Nigeria</option>
              <option value="usa">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="canada">Canada</option>
            </select>

            <select
              name="department"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-500'
            >
              <option value="">Department (Optional)</option>
              <option value="science">Science</option>
              <option value="arts">Arts</option>
              <option value="commerce">Commerce</option>
            </select>

            <select
              name="currentClass"
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-500'
            >
              <option value="">Current Class</option>
              <option value="jss1">JSS 1</option>
              <option value="jss2">JSS 2</option>
              <option value="jss3">JSS 3</option>
              <option value="ss1">SS 1</option>
              <option value="ss2">SS 2</option>
              <option value="ss3">SS 3</option>
            </select>

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

export default StudentRegistration;
