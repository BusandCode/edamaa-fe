import { useNavigate, type To } from 'react-router-dom';
import { FaGoogle, FaFacebookF, FaApple } from 'react-icons/fa';

const PasswordRecovery = () => {
  const navigate = useNavigate();

  const handleNavigate = (path: To) => {
    navigate(path);
  };

  return (
    <div className='fixed inset-0 w-full h-full overflow-y-auto bg-white'>
      <div className='min-h-full flex flex-col items-center justify-center px-4 sm:px-6 py-8'>
        
        {/* Main Content */}
        <div className='w-full max-w-md'>
          {/* Title */}
          <h1 className='text-[30px] font-semibold text-[#3D08BA] mb-16 text-center'>
            Password Recovery
          </h1>

          {/* Email Input Section */}
          <div className='mb-8'>
            <label className='block text-gray-800 text-base font-medium mb-4'>
              Enter your email here
            </label>
            <input
              type="email"
              placeholder="ajaoabduulahi2024@gmail"
              defaultValue="ajaoabduulahi2024@gmail"
              className='w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#3D08BA] transition-colors text-gray-600'
            />
          </div>

          {/* Send Button */}
          <button className='w-full bg-[#3D08BA] text-white py-4 rounded-xl font-medium text-lg hover:opacity-90 transition-opacity mb-8'>
            Send
          </button>

          {/* Divider */}
          <div className='flex items-center my-8'>
            <div className='flex-1 h-px bg-gray-300'></div>
            <span className='px-4 text-gray-500 text-sm font-medium'>OR</span>
            <div className='flex-1 h-px bg-gray-300'></div>
          </div>

          {/* Social Login Icons */}
          <div className='flex justify-center items-center gap-6 mb-12'>
            <button className='w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors'>
              <FaGoogle size={24} className='text-gray-700' />
            </button>
            <button className='w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors'>
              <FaFacebookF size={24} className='text-gray-700' />
            </button>
            <button className='w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors'>
              <FaApple size={28} className='text-gray-700' />
            </button>
          </div>

          {/* Sign Up Link */}
          <div className='text-center'>
            <p className='text-gray-600 text-sm mb-4'>
              Don't have an account yet?
            </p>
            <button
              onClick={() => handleNavigate('/signup')}
              className='block w-full py-4 border-2 border-[#3D08BA] text-[#3D08BA] rounded-xl font-medium text-lg hover:bg-[#3D08BA] hover:text-white transition-all'
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordRecovery;