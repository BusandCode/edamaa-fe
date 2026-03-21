import React from 'react';
import type { IconType } from 'react-icons';
import { Link } from 'react-router-dom';

interface QuickActionButtonProps {
  icon: IconType;
  label: string;
  badge?: string | number;
  onClick?: () => void;
  to?: string;
  href?: string;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon: Icon, label, badge, onClick, to, href }) => {
  const className =
    'w-full h-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 relative cursor-pointer';

  const content = (
    <>
      <div className='w-12 h-12 bg-[#3D08BA] rounded-xl flex items-center justify-center'>
        <Icon className='text-white' size={20} />
      </div>
      <span className='text-xs font-semibold text-gray-900 text-center'>{label}</span>
      {badge && (
        <span className='absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full'>
          {badge}
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <button type='button' onClick={onClick} className={className}>
      {content}
    </button>
  );
};

export default QuickActionButton;
