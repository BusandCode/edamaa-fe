import React, { useState, useEffect } from 'react';
import { IoMdCamera } from 'react-icons/io';
import { MdEdit, MdClose } from 'react-icons/md';

interface StudentProfileProps {
  onClose?: () => void;
  onSave?: (profile: { 
    name: string;
    username: string;
    email: string;
    bio: string; 
    profileImage: string | null;
  }) => void;
  initialName?: string;
  initialUsername?: string;
  initialEmail?: string;
  initialBio?: string;
  initialProfileImage?: string | null;
}

const StudentProfile: React.FC<StudentProfileProps> = ({ 
  onClose, 
  onSave,
  initialName = 'Andrew Adetokunbo',
  initialUsername = 'Andrewtoks',
  initialEmail = 'adetokunboandrew@example.com',
  initialBio = 'Computer Science student passionate about learning',
  initialProfileImage = null
}) => {
  const [profile, setProfile] = useState({
    name: initialName,
    username: initialUsername,
    email: initialEmail,
    bio: initialBio,
    profileImage: initialProfileImage
  });

  const [isEditing, setIsEditing] = useState({
    name: false,
    username: false,
    email: false,
    bio: false
  });

  // Update profile when initial values change
  useEffect(() => {
    setProfile({
      name: initialName,
      username: initialUsername,
      email: initialEmail,
      bio: initialBio,
      profileImage: initialProfileImage
    });
  }, [initialName, initialUsername, initialEmail, initialBio, initialProfileImage]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, profileImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfile({ ...profile, [field]: value });
  };

  const toggleEdit = (field: keyof typeof isEditing) => {
    setIsEditing({ ...isEditing, [field]: !isEditing[field] });
  };

  const removeProfileImage = () => {
    setProfile({ ...profile, profileImage: null });
  };

  const handleSave = () => {
    // Send all profile data back to the parent component
    if (onSave) {
      onSave({
        name: profile.name,
        username: profile.username,
        email: profile.email,
        bio: profile.bio,
        profileImage: profile.profileImage
      });
    }
    // Close the modal
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className='min-h-screen w-full bg-gradient-to-br from-purple-50 to-white relative rounded-xl sm:rounded-2xl overflow-hidden'>
      {/* Close Button - Top Right */}
      {onClose && (
        <button
          onClick={onClose}
          className='absolute top-2 right-2 sm:top-4 sm:right-4 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-all hover:scale-110'
          aria-label="Close profile"
        >
          <MdClose size={20} className='text-gray-700 sm:w-6 sm:h-6' />
        </button>
      )}

      <div className='max-w-2xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8'>
        {/* Header */}
        <div className='mb-6 sm:mb-10'>
          <h1 className='text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2' style={{ color: '#3D08BA' }}>
            Edit Profile
          </h1>
          <p className='text-center text-gray-600 text-xs sm:text-sm md:text-base'>
            Update your personal information
          </p>
        </div>

        {/* Profile Card */}
        <div className='bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8'>
          {/* Profile Photo Section */}
          <div className='flex flex-col items-center mb-6 sm:mb-8'>
            <div className='relative mb-3 sm:mb-4'>
              <div className='w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-lg' style={{ border: '3px solid #3D08BA' }}>
                {profile.profileImage ? (
                  <img 
                    src={profile.profileImage} 
                    alt="Profile" 
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50'>
                    <svg className='w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20' style={{ color: '#3D08BA' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Camera Button */}
              <label className='absolute bottom-0 right-0 w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110' style={{ backgroundColor: '#3D08BA' }}>
                <IoMdCamera size={18} className='text-white sm:w-5 sm:h-5 md:w-6 md:h-6' />
                <input 
                  type="file" 
                  accept="image/*" 
                  className='hidden'
                  onChange={handleImageChange}
                />
              </label>

              {/* Remove Button */}
              {profile.profileImage && (
                <button 
                  onClick={removeProfileImage}
                  className='absolute top-0 right-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 transition-all hover:scale-110'
                >
                  <MdClose size={16} className='text-white sm:w-5 sm:h-5' />
                </button>
              )}
            </div>
            <p className='text-[10px] sm:text-xs md:text-sm text-gray-500 text-center mt-1 sm:mt-2 px-4'>
              Click the camera icon to upload a photo
            </p>
          </div>

          {/* Profile Form */}
          <div className='space-y-4 sm:space-y-6'>
            {/* Name Field */}
            <div>
              <div className='flex items-center justify-between mb-1 sm:mb-2'>
                <label className='text-xs sm:text-sm font-semibold text-gray-700'>
                  Name
                </label>
                <button
                  onClick={() => toggleEdit('name')}
                  className='p-1.5 sm:p-2 rounded-full hover:bg-purple-50 transition-colors'
                  style={{ color: '#3D08BA' }}
                  aria-label="Edit name"
                >
                  <MdEdit size={16} className='sm:w-5 sm:h-5' />
                </button>
              </div>
              <input
                type='text'
                value={profile.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing.name}
                className='w-full px-2 py-1.5 sm:py-2 bg-transparent text-gray-900 font-medium text-sm sm:text-base md:text-lg focus:outline-none disabled:text-gray-600 transition-colors'
                style={{ 
                  borderBottom: isEditing.name ? '2px solid #3D08BA' : '2px solid #e5e7eb'
                }}
              />
            </div>

            {/* Username Field */}
            <div>
              <div className='flex items-center justify-between mb-1 sm:mb-2'>
                <label className='text-xs sm:text-sm font-semibold text-gray-700'>
                  Username
                </label>
                <button
                  onClick={() => toggleEdit('username')}
                  className='p-1.5 sm:p-2 rounded-full hover:bg-purple-50 transition-colors'
                  style={{ color: '#3D08BA' }}
                  aria-label="Edit username"
                >
                  <MdEdit size={16} className='sm:w-5 sm:h-5' />
                </button>
              </div>
              <input
                type='text'
                value={profile.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                disabled={!isEditing.username}
                className='w-full px-2 py-1.5 sm:py-2 bg-transparent text-gray-900 font-medium text-sm sm:text-base md:text-lg focus:outline-none disabled:text-gray-600 transition-colors'
                style={{ 
                  borderBottom: isEditing.username ? '2px solid #3D08BA' : '2px solid #e5e7eb'
                }}
              />
            </div>

            {/* Email Field */}
            <div>
              <div className='flex items-center justify-between mb-1 sm:mb-2'>
                <label className='text-xs sm:text-sm font-semibold text-gray-700'>
                  Email Address
                </label>
                <button
                  onClick={() => toggleEdit('email')}
                  className='p-1.5 sm:p-2 rounded-full hover:bg-purple-50 transition-colors'
                  style={{ color: '#3D08BA' }}
                  aria-label="Edit email"
                >
                  <MdEdit size={16} className='sm:w-5 sm:h-5' />
                </button>
              </div>
              <input
                type='email'
                value={profile.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing.email}
                className='w-full px-2 py-1.5 sm:py-2 bg-transparent text-gray-900 font-medium text-sm sm:text-base md:text-lg focus:outline-none disabled:text-gray-600 transition-colors'
                style={{ 
                  borderBottom: isEditing.email ? '2px solid #3D08BA' : '2px solid #e5e7eb'
                }}
              />
            </div>

            {/* Bio Field */}
            <div>
              <div className='flex items-center justify-between mb-1 sm:mb-2'>
                <label className='text-xs sm:text-sm font-semibold text-gray-700'>
                  Bio
                </label>
                <button
                  onClick={() => toggleEdit('bio')}
                  className='p-1.5 sm:p-2 rounded-full hover:bg-purple-50 transition-colors'
                  style={{ color: '#3D08BA' }}
                  aria-label="Edit bio"
                >
                  <MdEdit size={16} className='sm:w-5 sm:h-5' />
                </button>
              </div>
              <textarea
                value={profile.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                disabled={!isEditing.bio}
                rows={3}
                maxLength={150}
                className='w-full px-2 py-1.5 sm:py-2 bg-transparent text-gray-900 font-medium text-sm sm:text-base md:text-lg focus:outline-none disabled:text-gray-600 resize-none transition-colors'
                style={{ 
                  borderBottom: isEditing.bio ? '2px solid #3D08BA' : '2px solid #e5e7eb'
                }}
              />
              <p className='mt-1 text-[10px] sm:text-xs text-gray-500 text-right'>
                {profile.bio.length}/150 characters
              </p>
            </div>

            {/* Save Button */}
            <button 
              onClick={handleSave}
              className='w-full py-2.5 sm:py-3 md:py-4 text-white font-semibold text-sm sm:text-base md:text-lg rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] mt-4 sm:mt-6'
              style={{ backgroundColor: '#3D08BA' }}
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Footer Space */}
        <div className='h-4 sm:h-8'></div>
      </div>
    </div>
  );
};

export default StudentProfile;