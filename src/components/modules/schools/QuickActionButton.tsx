import React from 'react';
import type { IconType } from 'react-icons';

interface QuickActionButtonProps {
  icon: IconType;
  label: string;
  badge?: string | number;
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon: Icon, label, badge, onClick }) => {
  return (
    <button 
      onClick={onClick} 
      className='bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-3 relative'
    >
      <div className='w-12 h-12 bg-[#3D08BA] rounded-xl flex items-center justify-center'>
        <Icon className='text-white' size={20} />
      </div>
      <span className='text-xs font-semibold text-gray-900 text-center'>{label}</span>
      {badge && (
        <span className='absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full'>
          {badge}
        </span>
      )}
    </button>
  );
};

export default QuickActionButton;