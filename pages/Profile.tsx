
import React from 'react';
import BottomNav from '../components/BottomNav';
import { ArrowLeft, Edit2, User, Star, Image as ImageIcon, Bell, Shield, LogOut, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
    const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white p-6 pt-10 pb-8 flex flex-col items-center sticky top-0 z-10">
        <div className="w-full flex justify-between items-center mb-4">
            <button onClick={() => navigate(-1)}><ArrowLeft size={24} /></button>
            <h1 className="font-bold text-lg">Profile</h1>
            <div className="w-6"></div> 
        </div>

        <div className="relative mb-4">
          <div className="w-32 h-32 rounded-full bg-orange-100 border-4 border-white shadow-lg overflow-hidden">
             <img src="https://picsum.photos/300/300?random=50" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <button 
            onClick={() => alert("Edit avatar feature coming soon!")}
            className="absolute bottom-0 right-0 bg-sky-500 text-white p-2 rounded-full border-4 border-white shadow-md hover:bg-sky-600"
          >
            <Edit2 size={16} />
          </button>
        </div>

        <h2 className="text-2xl font-bold text-slate-900">Sophia Reyes</h2>
        <p className="text-slate-500">Joined 2022</p>
        <p className="text-slate-500 text-sm mt-1">12 reviews · 3 contributions</p>
      </div>

      <div className="px-6 mt-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Account</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <MenuRow icon={User} label="Edit personal info" onClick={() => alert("Personal Info settings coming soon")} />
          <div className="h-[1px] bg-gray-100 mx-4"></div>
          <MenuRow icon={Star} label="Review history" onClick={() => alert("History feature coming soon")} />
          <div className="h-[1px] bg-gray-100 mx-4"></div>
          <MenuRow icon={ImageIcon} label="Contributions" onClick={() => alert("Contributions feature coming soon")} />
        </div>

        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Settings</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <MenuRow icon={Bell} label="Notifications" onClick={() => alert("Notification settings coming soon")} />
          <div className="h-[1px] bg-gray-100 mx-4"></div>
          <MenuRow icon={Shield} label="Privacy" onClick={() => alert("Privacy settings coming soon")} />
          <div className="h-[1px] bg-gray-100 mx-4"></div>
          <MenuRow icon={LogOut} label="Logout" isDestructive onClick={() => navigate('/login')} />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

const MenuRow = ({ icon: Icon, label, isDestructive, onClick }: { icon: any, label: string, isDestructive?: boolean, onClick?: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-sky-50 text-sky-600'}`}>
        <Icon size={20} />
      </div>
      <span className={`font-medium ${isDestructive ? 'text-slate-900' : 'text-slate-900'}`}>{label}</span>
    </div>
    <ChevronRight size={20} className="text-gray-300" />
  </button>
);

export default Profile;
