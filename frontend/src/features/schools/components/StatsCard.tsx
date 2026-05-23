import React from 'react';
import type { IconType } from 'react-icons';

interface StatsCardProps {
  icon: IconType;
  label: string;
  value: string | number;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon: Icon, label, value, color }) => {
  return (
    <div className='bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow'>
      <div className='flex flex-col items-center gap-2'>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className='text-white' size={20} />
        </div>
        <p className='text-xs font-semibold text-gray-700 text-center'>{label}</p>
        <p className='text-lg font-bold text-gray-900'>{value}</p>
      </div>
    </div>
  );
};

export default StatsCard;