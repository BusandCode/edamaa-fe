import React from 'react';

interface SubscriptionStatusProps {
  isActive: boolean;
  activeText?: string;
  expiredText?: string;
  showBoth?: boolean;
  className?: string;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ 
  isActive, 
  activeText = "Active",
  expiredText = "Expired",
  showBoth = false,
  className = ""
}) => {
  return (
    <div className={`bg-white rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 ${className}`}>
      <span className='text-gray-900 font-medium text-sm sm:text-base'>Subscription Status</span>
      <div className='flex gap-2'>
        {showBoth ? (
          <>
            <span className='px-3 sm:px-4 py-1 bg-green-500 text-white rounded-full text-xs sm:text-sm font-medium'>
              {activeText}
            </span>
            <span className='px-3 sm:px-4 py-1 bg-red-500 text-white rounded-full text-xs sm:text-sm font-medium'>
              {expiredText}
            </span>
          </>
        ) : isActive ? (
          <span className='px-3 sm:px-4 py-1 bg-green-500 text-white rounded-full text-xs sm:text-sm font-medium'>
            {activeText}
          </span>
        ) : (
          <span className='px-3 sm:px-4 py-1 bg-red-500 text-white rounded-full text-xs sm:text-sm font-medium'>
            {expiredText}
          </span>
        )}
      </div>
    </div>
  );
};

export default SubscriptionStatus;