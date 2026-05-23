import React, { useState, useEffect } from 'react';
import { IoMdCamera } from 'react-icons/io';
import { MdEdit, MdClose } from 'react-icons/md';

interface TutorProfileProps {
  onClose?: () => void;
  onSave?: (profile: { 
    name: string;
    username?: string;
    email: string;
    bio: string;
    subjects: string;
    experience: string;
    profileImage: string | null;
  }) => void;
  initialName?: string;
  initialUsername?: string;
  initialEmail?: string;
  initialBio?: string;
  initialSubjects?: string;
  initialExperience?: string;
  initialProfileImage?: string | null;
}

const TutorProfile: React.FC<TutorProfileProps> = ({ 
  onClose, 
  onSave,
  initialName = 'Dr. Jane Smith',
  initialUsername = '',
  initialEmail = 'jane.smith@example.com',
  initialBio = 'Passionate educator with expertise in Computer Science and Mathematics. Committed to helping students achieve their academic goals.',
  initialSubjects = 'Computer Science, Mathematics, Physics',
  initialExperience = '8 years',
  initialProfileImage = null
}) => {
  const [profile, setProfile] = useState({
    name: initialName,
    username: initialUsername,
    email: initialEmail,
    bio: initialBio,
    subjects: initialSubjects,
    experience: initialExperience,
    profileImage: initialProfileImage
  });

  const [isEditing, setIsEditing] = useState({
    name: false,
    username: false,
    email: false,
    bio: false,
    subjects: false,
    experience: false
  });

  useEffect(() => {
    setProfile({
      name: initialName,
      username: initialUsername,
      email: initialEmail,
      bio: initialBio,
      subjects: initialSubjects,
      experience: initialExperience,
      profileImage: initialProfileImage
    });
  }, [initialName, initialUsername, initialEmail, initialBio, initialSubjects, initialExperience, initialProfileImage]);

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
    if (onSave) {
      onSave({
        name: profile.name,
        username: (profile as any).username || '',
        email: profile.email,
        bio: profile.bio,
        subjects: profile.subjects,
        experience: profile.experience,
        profileImage: profile.profileImage
      });
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className='min-h-screen w-full bg-linear-to-br from-purple-50 to-white relative rounded-xl overflow-hidden'>
      {onClose && (
        <button
          onClick={onClose}
          className='absolute top-4 right-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-all hover:scale-110'
          aria-label="Close profile"
        >
          <MdClose size={24} className='text-gray-700' />
        </button>
      )}

      <div className='max-w-2xl mx-auto px-6 py-8'>
        <div className='mb-10'>
          <h1 className='text-4xl font-bold text-center mb-2' style={{ color: '#3D08BA' }}>
            Tutor Profile
          </h1>
          <p className='text-center text-gray-600'>
            Manage your professional information
          </p>
        </div>

        <div className='bg-white rounded-3xl shadow-xl p-8'>
          {/* Profile Photo Section */}
          <div className='flex flex-col items-center mb-8'>
            <div className='relative mb-4'>
              <div className='w-40 h-40 rounded-full overflow-hidden shadow-lg' style={{ border: '3px solid #3D08BA' }}>
                {profile.profileImage ? (
                  <img 
                    src={profile.profileImage} 
                    alt="Profile" 
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center bg-linear-to-br from-purple-100 to-purple-50'>
                    <svg className='w-20 h-20' style={{ color: '#3D08BA' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
              </div>
              
              <label className='absolute bottom-0 right-0 w-12 h-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110' style={{ backgroundColor: '#3D08BA' }}>
                <IoMdCamera size={24} className='text-white' />
                <input 
                  type="file" 
                  accept="image/*" 
                  className='hidden'
                  onChange={handleImageChange}
                />
              </label>

              {profile.profileImage && (
                <button 
                  onClick={removeProfileImage}
                  className='absolute top-0 right-0 w-9 h-9 bg-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 transition-all hover:scale-110'
                >
                  <MdClose size={20} className='text-white' />
                </button>
              )}
            </div>
            <p className='text-sm text-gray-500 text-center'>
              Click the camera icon to upload a photo
            </p>
          </div>

          {/* Profile Form */}
          <div className='space-y-6'>
            {/* Name Field */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-sm font-semibold text-gray-700'>
                  Full Name
                </label>
                <button
                  onClick={() => toggleEdit('name')}
                  className='p-2 rounded-full hover:bg-purple-50 transition-colors'
                  style={{ color: '#3D08BA' }}
                  aria-label="Edit name"
                >
                  <MdEdit size={18} />
                </button>
              </div>
              <input
                type='text'
                value={profile.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing.name}
                className='w-full px-2 py-2 bg-transparent text-gray-900 font-medium text-lg focus:outline-none disabled:text-gray-600 transition-colors'
                style={{ 
                  borderBottom: isEditing.name ? '2px solid #3D08BA' : '2px solid #e5e7eb'
                }}
              />
            </div>

            {/* Username Field */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-sm font-semibold text-gray-700'>
                  Username
                </label>
                <button
                  onClick={() => toggleEdit('username')}
                  className='p-2 rounded-full hover:bg-purple-50 transition-colors'
                  style={{ color: '#3D08BA' }}
                  aria-label="Edit username"
                >
                  <MdEdit size={18} />
                </button>
              </div>
              <input
                type='text'
                value={(profile as any).username || ''}
                onChange={(e) => handleInputChange('username', e.target.value)}
                disabled={!isEditing.username}
                className='w-full px-2 py-2 bg-transparent text-gray-900 font-medium text-lg focus:outline-none disabled:text-gray-600 transition-colors'
                style={{ 
                  borderBottom: isEditing.username ? '2px solid #3D08BA' : '2px solid #e5e7eb'
                }}
                placeholder="username"
              />
            </div>

            {/* Email Field */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-sm font-semibold text-gray-700'>
                  Email Address
                </label>
                <button
                  onClick={() => toggleEdit('email')}
                  className='p-2 rounded-full hover:bg-purple-50 transition-colors'
                  style={{ color: '#3D08BA' }}
                  aria-label="Edit email"
                >
                  <MdEdit size={18} />
                </button>
              </div>
              <input
                type='email'
                value={profile.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing.email}
                className='w-full px-2 py-2 bg-transparent text-gray-900 font-medium text-lg focus:outline-none disabled:text-gray-600 transition-colors'
                style={{ 
                  borderBottom: isEditing.email ? '2px solid #3D08BA' : '2px solid #e5e7eb'
                }}
              />
            </div>

            {/* Subjects Field */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-sm font-semibold text-gray-700'>
                  Subjects/Specializations
                </label>
                <button
                  onClick={() => toggleEdit('subjects')}
                  className='p-2 rounded-full hover:bg-purple-50 transition-colors'
                  style={{ color: '#3D08BA' }}
                  aria-label="Edit subjects"
                >
                  <MdEdit size={18} />
                </button>
              </div>
              <input
                type='text'
                value={profile.subjects}
                onChange={(e) => handleInputChange('subjects', e.target.value)}
                disabled={!isEditing.subjects}
                placeholder="e.g., Mathematics, Physics, Chemistry"
                className='w-full px-2 py-2 bg-transparent text-gray-900 font-medium text-lg focus:outline-none disabled:text-gray-600 transition-colors'
                style={{ 
                  borderBottom: isEditing.subjects ? '2px solid #3D08BA' : '2px solid #e5e7eb'
                }}
              />
            </div>

            {/* Experience Field */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-sm font-semibold text-gray-700'>
                  Years of Experience
                </label>
                <button
                  onClick={() => toggleEdit('experience')}
                  className='p-2 rounded-full hover:bg-purple-50 transition-colors'
                  style={{ color: '#3D08BA' }}
                  aria-label="Edit experience"
                >
                  <MdEdit size={18} />
                </button>
              </div>
              <input
                type='text'
                value={profile.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                disabled={!isEditing.experience}
                placeholder="e.g., 5 years"
                className='w-full px-2 py-2 bg-transparent text-gray-900 font-medium text-lg focus:outline-none disabled:text-gray-600 transition-colors'
                style={{ 
                  borderBottom: isEditing.experience ? '2px solid #3D08BA' : '2px solid #e5e7eb'
                }}
              />
            </div>

            {/* Bio Field */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-sm font-semibold text-gray-700'>
                  Professional Bio
                </label>
                <button
                  onClick={() => toggleEdit('bio')}
                  className='p-2 rounded-full hover:bg-purple-50 transition-colors'
                  style={{ color: '#3D08BA' }}
                  aria-label="Edit bio"
                >
                  <MdEdit size={18} />
                </button>
              </div>
              <textarea
                value={profile.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                disabled={!isEditing.bio}
                rows={4}
                maxLength={250}
                placeholder="Share your teaching philosophy and experience..."
                className='w-full px-2 py-2 bg-transparent text-gray-900 font-medium text-lg focus:outline-none disabled:text-gray-600 resize-none transition-colors'
                style={{ 
                  borderBottom: isEditing.bio ? '2px solid #3D08BA' : '2px solid #e5e7eb'
                }}
              />
              <p className='mt-1 text-xs text-gray-500 text-right'>
                {profile.bio.length}/250 characters
              </p>
            </div>

            {/* Save Button */}
            <button 
              onClick={handleSave}
              className='w-full py-4 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] mt-6'
              style={{ backgroundColor: '#3D08BA' }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorProfile;