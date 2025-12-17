
import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import AvatarUploader from '../components/AvatarUploader';
import { useAuth } from '../context/AuthContext';
import { authApi, bookingsApi } from '../services/api';
import { 
  ArrowLeft, 
  User, 
  Star, 
  Image as ImageIcon, 
  Bell, 
  Shield, 
  LogOut, 
  ChevronRight,
  Mail,
  MapPin,
  Calendar,
  BadgeCheck,
  AlertCircle,
  Settings,
  Users,
  Mountain,
  Store,
  BarChart3,
  QrCode,
  LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MenuRowProps {
  icon: React.ElementType;
  label: string;
  isDestructive?: boolean;
  onClick?: () => void;
  badge?: string;
}

const MenuRow: React.FC<MenuRowProps> = ({ icon: Icon, label, isDestructive, onClick, badge }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={label}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-sky-50 text-sky-600'}`}>
          <Icon size={20} />
        </div>
        <span className="font-medium text-slate-900">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-600 rounded-full">
            {badge}
          </span>
        )}
        <ChevronRight size={20} className="text-gray-300" />
      </div>
    </button>
  );
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);

  useEffect(() => {
    if (user?.role === 'guide' && bookingsApi) {
      bookingsApi.getAsGuide()
        .then(res => {
          if (res.data?.bookings) {
            const pending = res.data.bookings.filter(b => b.status === 'pending').length;
            setPendingBookingsCount(pending);
          }
        })
        .catch(err => console.error('Failed to fetch booking requests:', err));
    }
  }, [user?.role]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleAvatarUpload = async (url: string) => {
    const response = await authApi.updateProfile({ avatar: url });
    if (response.error) {
      setAvatarError(response.error);
      setTimeout(() => setAvatarError(null), 3000);
    } else {
      // Refresh user data to get updated avatar
      await refreshUser();
    }
  };

  const handleAvatarError = (error: string) => {
    setAvatarError(error);
    setTimeout(() => setAvatarError(null), 3000);
  };

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    const response = await authApi.resendVerification();
    
    if (response.error) {
      setVerificationMessage(response.error);
    } else {
      setVerificationMessage('Verification email sent! Check your inbox.');
    }
    
    setIsResendingVerification(false);
    setTimeout(() => setVerificationMessage(''), 5000);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleBackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBackClick();
    }
  };

  // Format join date
  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return 'Recently joined';
    const date = new Date(dateString);
    return `Joined ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  };

  // Role badge color
  const getRoleBadgeStyles = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700';
      case 'guide':
        return 'bg-green-100 text-green-700';
      case 'business_owner':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-sky-100 text-sky-700';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'guide':
        return 'Tour Guide';
      case 'business_owner':
        return 'Business Owner';
      default:
        return 'Tourist';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white p-6 pt-10 pb-8 flex flex-col items-center sticky top-0 z-10">
        <div className="w-full flex justify-between items-center mb-4">
          <button
            type="button"
            onClick={handleBackClick}
            onKeyDown={handleBackKeyDown}
            tabIndex={0}
            aria-label="Go back"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-lg">Profile</h1>
          <div className="w-10" />
        </div>

        {/* Avatar */}
        <div className="relative mb-4">
          <AvatarUploader
            currentAvatar={user?.avatar}
            username={user?.username || 'User'}
            onUploadComplete={handleAvatarUpload}
            onError={handleAvatarError}
            size="lg"
          />
        </div>

        {/* Avatar error */}
        {avatarError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg mb-2">
            {avatarError}
          </div>
        )}

        {/* User info */}
        <h2 className="text-2xl font-bold text-slate-900">{user?.username || 'User'}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleBadgeStyles(user?.role)}`}>
            {getRoleLabel(user?.role)}
          </span>
          {user?.isEmailVerified && (
            <BadgeCheck className="w-5 h-5 text-green-500" aria-label="Verified email" />
          )}
        </div>
        <p className="text-slate-500 text-sm mt-2">
          {user?.stats?.reviewCount || 0} reviews · {user?.stats?.contributionCount || 0} contributions
        </p>
        <p className="text-slate-400 text-xs mt-1">{formatJoinDate(user?.createdAt)}</p>
      </div>

      {/* Email verification banner */}
      {user && !user.isEmailVerified && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 font-medium">Verify your email</p>
              <p className="text-xs text-amber-600 mt-1">
                Please verify your email address to unlock all features.
              </p>
              {verificationMessage && (
                <p className={`text-xs mt-2 ${verificationMessage.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
                  {verificationMessage}
                </p>
              )}
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingVerification}
                className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-800 underline disabled:opacity-50"
              >
                {isResendingVerification ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu sections */}
      <div className="px-6 mt-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Account</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <MenuRow
            icon={User}
            label="Edit personal info"
            onClick={() => alert('Personal Info settings coming soon')}
          />
          <div className="h-[1px] bg-gray-100 mx-4" />
          <MenuRow
            icon={Mail}
            label="Email"
            badge={user?.email}
            onClick={() => alert('Email settings coming soon')}
          />
          <div className="h-[1px] bg-gray-100 mx-4" />
          <MenuRow
            icon={Star}
            label="Review history"
            badge={`${user?.stats?.reviewCount || 0}`}
            onClick={() => alert('History feature coming soon')}
          />
          <div className="h-[1px] bg-gray-100 mx-4" />
          <MenuRow
            icon={ImageIcon}
            label="Contributions"
            badge={`${user?.stats?.contributionCount || 0}`}
            onClick={() => alert('Contributions feature coming soon')}
          />
        </div>

        {/* Guide section - only show for guides */}
        {user?.role === 'guide' && user.guideProfile && (
          <>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Guide Profile</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <MenuRow
                icon={MapPin}
                label="My tours"
                onClick={() => navigate('/bookings')}
              />
              <div className="h-[1px] bg-gray-100 mx-4" />
              <MenuRow
                icon={Calendar}
                label="Booking requests"
                badge={pendingBookingsCount > 0 ? `${pendingBookingsCount} new` : undefined}
                onClick={() => navigate('/bookings')}
              />
              <div className="h-[1px] bg-gray-100 mx-4" />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Status</span>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    user.guideProfile.status === 'available'
                      ? 'bg-green-100 text-green-700'
                      : user.guideProfile.status === 'on_tour'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.guideProfile.status === 'available'
                      ? 'Available'
                      : user.guideProfile.status === 'on_tour'
                      ? 'On Tour'
                      : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Admin section - only show for admins */}
        {user?.role === 'admin' && (
          <>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Admin Dashboard</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <MenuRow
                icon={LayoutDashboard}
                label="Dashboard Overview"
                onClick={() => navigate('/admin')}
              />
              <div className="h-[1px] bg-gray-100 mx-4" />
              <MenuRow
                icon={QrCode}
                label="QR Code Generator"
                onClick={() => navigate('/admin/qr-generator')}
              />
              <div className="h-[1px] bg-gray-100 mx-4" />
              <MenuRow
                icon={Mountain}
                label="Manage Attractions"
                onClick={() => navigate('/admin/attractions')}
              />
              <div className="h-[1px] bg-gray-100 mx-4" />
              <MenuRow
                icon={Store}
                label="Manage Businesses"
                onClick={() => navigate('/admin/businesses')}
              />
              <div className="h-[1px] bg-gray-100 mx-4" />
              <MenuRow
                icon={Calendar}
                label="Manage Events"
                onClick={() => navigate('/admin/events')}
              />
              <div className="h-[1px] bg-gray-100 mx-4" />
              <MenuRow
                icon={Users}
                label="Manage Users"
                onClick={() => navigate('/admin/users')}
              />
              <div className="h-[1px] bg-gray-100 mx-4" />
              <MenuRow
                icon={BadgeCheck}
                label="Verifications"
                onClick={() => navigate('/admin/verifications')}
              />
              <div className="h-[1px] bg-gray-100 mx-4" />
              <MenuRow
                icon={Settings}
                label="Game Settings"
                onClick={() => navigate('/admin/game-settings')}
              />
              <div className="h-[1px] bg-gray-100 mx-4" />
              <MenuRow
                icon={BarChart3}
                label="Analytics"
                onClick={() => alert('Analytics coming soon')}
              />
            </div>
          </>
        )}

        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Settings</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <MenuRow
            icon={Bell}
            label="Notifications"
            onClick={() => alert('Notification settings coming soon')}
          />
          <div className="h-[1px] bg-gray-100 mx-4" />
          <MenuRow
            icon={Shield}
            label="Privacy"
            onClick={() => alert('Privacy settings coming soon')}
          />
          <div className="h-[1px] bg-gray-100 mx-4" />
          <MenuRow
            icon={LogOut}
            label="Logout"
            isDestructive
            onClick={() => setShowLogoutConfirm(true)}
          />
        </div>

        {/* Version info */}
        <div className="mt-8 mb-4 text-center">
          <p className="text-xs text-slate-400">
            Version 0.3 · Development Build
          </p>
        </div>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-fade-slide-up">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Log out?</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to log out of your account?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-slate-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-3 px-4 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Profile;
