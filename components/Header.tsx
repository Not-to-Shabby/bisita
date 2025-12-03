import React from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  transparent?: boolean;
  rightAction?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, showBack, showMenu, transparent, rightAction }) => {
  const navigate = useNavigate();

  return (
    <div className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-4 ${transparent ? 'bg-transparent text-white' : 'bg-white text-slate-800'}`}>
      <div className="flex items-center gap-4">
        {showBack && (
          <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-black/10 transition-colors">
            <ArrowLeft size={24} />
          </button>
        )}
        {showMenu && (
          <button className="p-1">
            <Menu size={24} />
          </button>
        )}
        {title && <h1 className="text-xl font-bold">{title}</h1>}
      </div>
      <div>
        {rightAction}
      </div>
    </div>
  );
};

export default Header;