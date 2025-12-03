import React from 'react';
import { Home, Map, List, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface BottomNavProps {
  className?: string;
}

const BottomNav: React.FC<BottomNavProps> = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Map, label: 'Map', path: '/map' },
    { icon: List, label: 'Directory', path: '/directory' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className={`bg-white border-t border-gray-200 py-2 px-6 flex justify-between items-center z-50 ${className || 'fixed bottom-0 left-0 right-0'}`}>
      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={() => navigate(item.path)}
          className="flex flex-col items-center gap-1 focus:outline-none"
        >
          <item.icon
            size={24}
            className={isActive(item.path) ? 'text-sky-600' : 'text-gray-400'}
            strokeWidth={isActive(item.path) ? 2.5 : 2}
          />
          <span className={`text-[10px] ${isActive(item.path) ? 'text-sky-600 font-medium' : 'text-gray-400'}`}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default BottomNav;