import React from 'react';
import { FaHome, FaGraduationCap, FaClipboardList, FaFileInvoiceDollar, FaCog } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

interface NavBarProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

const NavBar: React.FC<NavBarProps> = ({ activeTab = 'home', onTabChange }) => {
  const navigate = useNavigate();
  
  const handleHomeClick = () => {
    navigate('/school-dashboard');
  }
  
  const handleStudentListClick = () => {
    navigate('/student-list-school');
  }

  const navItems: NavItem[] = [
    { id: 'home', icon: FaHome, label: 'Home', isActive: true, onClick: handleHomeClick },
    { id: 'students', icon: FaGraduationCap, label: 'Students', onClick: handleStudentListClick },
    { id: 'reports', icon: FaClipboardList, label: 'Reports' },
    { id: 'finance', icon: FaFileInvoiceDollar, label: 'Finance' },
    { id: 'settings', icon: FaCog, label: 'Settings' },
  ];

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <nav className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10'>
      <div className='max-w-7xl mx-auto'>
        <div className='flex items-center justify-around px-2 py-3'>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                  }
                  handleTabClick(item.id);
                }}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-tr-lg rounded-tl-lg transition-all ${
                  isActive 
                    ? 'text-white bg-[#3D08BA]' 
                    : 'text-gray-600 hover:text-[#3D08BA] hover:bg-gray-50'
                }`}
              >
                <Icon className='text-xl' />
                <span className='text-xs font-medium'>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;