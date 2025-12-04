import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { 
  MapPin, 
  Building2, 
  Users, 
  Star,
  ChevronRight,
  Loader2,
  AlertCircle,
  Settings,
  BarChart3,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { attractionsApi, businessesApi, guidesApi, Attraction, Business, Guide } from '../../services/api';

// ======================
// STAT CARD
// ======================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color, onClick }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
};

// ======================
// MENU ROW
// ======================

interface MenuRowProps {
  icon: React.ElementType;
  label: string;
  badge?: string | number;
  onClick: () => void;
}

const MenuRow: React.FC<MenuRowProps> = ({ icon: Icon, label, badge, onClick }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
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
        <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
          <Icon size={20} />
        </div>
        <span className="font-medium text-slate-900">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge !== undefined && (
          <span className="px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-600 rounded-full">
            {badge}
          </span>
        )}
        <ChevronRight size={20} className="text-gray-300" />
      </div>
    </button>
  );
};

// ======================
// MAIN COMPONENT
// ======================

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [stats, setStats] = useState({
    attractions: 0,
    businesses: 0,
    pendingVerifications: 0,
    guides: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (user?.role !== 'admin') {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [attractionsRes, businessesRes, guidesRes] = await Promise.all([
          attractionsApi.getAll(),
          businessesApi.getAll(),
          guidesApi.getAll(),
        ]);

        const attractions = attractionsRes.data?.attractions || [];
        const businesses = businessesRes.data?.businesses || [];
        const guides = guidesRes.data?.guides || [];

        setStats({
          attractions: attractions.length,
          businesses: businesses.length,
          pendingVerifications: businesses.filter(b => !b.isVerified).length,
          guides: guides.length,
        });
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="Admin Dashboard" />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header showBack title="Admin Dashboard" />

      <div className="p-6 pt-20">
        {/* Admin Badge */}
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">Administrator</span>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard
            icon={MapPin}
            label="Attractions"
            value={stats.attractions}
            color="bg-sky-500"
            onClick={() => navigate('/admin/attractions')}
          />
          <StatCard
            icon={Building2}
            label="Businesses"
            value={stats.businesses}
            color="bg-green-500"
            onClick={() => navigate('/admin/businesses')}
          />
          <StatCard
            icon={Users}
            label="Guides"
            value={stats.guides}
            color="bg-amber-500"
            onClick={() => navigate('/admin/guides')}
          />
          <StatCard
            icon={Star}
            label="Pending"
            value={stats.pendingVerifications}
            color="bg-red-500"
            onClick={() => navigate('/admin/verifications')}
          />
        </div>

        {/* Management Menu */}
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Content Management
        </h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <MenuRow
            icon={MapPin}
            label="Manage Attractions"
            badge={stats.attractions}
            onClick={() => navigate('/admin/attractions')}
          />
          <div className="h-[1px] bg-gray-100 mx-4" />
          <MenuRow
            icon={Building2}
            label="Manage Businesses"
            badge={stats.businesses}
            onClick={() => navigate('/admin/businesses')}
          />
          <div className="h-[1px] bg-gray-100 mx-4" />
          <MenuRow
            icon={Users}
            label="Manage Guides"
            badge={stats.guides}
            onClick={() => navigate('/admin/guides')}
          />
        </div>

        {/* Verification Queue */}
        {stats.pendingVerifications > 0 && (
          <>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Requires Attention
            </h3>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900">Pending Verifications</h4>
                  <p className="text-sm text-amber-700">
                    {stats.pendingVerifications} business{stats.pendingVerifications !== 1 ? 'es' : ''} awaiting review
                  </p>
                </div>
                <button
                  onClick={() => navigate('/admin/verifications')}
                  className="px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Review
                </button>
              </div>
            </div>
          </>
        )}

        {/* System */}
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          System
        </h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <MenuRow
            icon={BarChart3}
            label="Analytics"
            onClick={() => alert('Analytics coming soon!')}
          />
          <div className="h-[1px] bg-gray-100 mx-4" />
          <MenuRow
            icon={Settings}
            label="Settings"
            onClick={() => alert('Settings coming soon!')}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
