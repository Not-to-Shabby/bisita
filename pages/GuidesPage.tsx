import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { 
  Star, 
  MapPin, 
  Globe, 
  BadgeCheck, 
  Loader2, 
  Search, 
  Filter,
  ChevronRight,
  Users
} from 'lucide-react';
import { guidesApi, Guide } from '../services/api';

// ======================
// FILTER TYPES
// ======================

type StatusFilter = 'all' | 'available' | 'on_tour' | 'unavailable';

// ======================
// STATIC FALLBACK DATA
// ======================

const fallbackGuides: Guide[] = [
  {
    _id: '1',
    username: 'Juan dela Cruz',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    guideProfile: {
      bio: 'Born and raised in Iligan City. I\'ve been exploring the waterfalls since childhood and love sharing the hidden gems with visitors.',
      languages: ['English', 'Filipino', 'Bisaya'],
      specialties: ['Waterfalls', 'Nature Trails', 'Photography Tours'],
      rate: 500,
      status: 'available',
      isVerified: true,
      phone: '+63 912 345 6789',
      messenger: 'juan.delacruz',
    },
    stats: { reviewCount: 45 },
  },
  {
    _id: '2',
    username: 'Maria Santos',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    guideProfile: {
      bio: 'Environmental science graduate with a passion for eco-tourism. I specialize in sustainable travel experiences.',
      languages: ['English', 'Filipino'],
      specialties: ['Eco-Tourism', 'Bird Watching', 'Cultural Tours'],
      rate: 600,
      status: 'available',
      isVerified: true,
    },
    stats: { reviewCount: 32 },
  },
  {
    _id: '3',
    username: 'Pedro Garcia',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    guideProfile: {
      bio: 'Adventure enthusiast and certified first-aid responder. Perfect for those seeking off-the-beaten-path experiences.',
      languages: ['English', 'Filipino', 'Bisaya', 'Japanese'],
      specialties: ['Adventure Tours', 'Hiking', 'Canyoneering'],
      rate: 800,
      status: 'on_tour',
      isVerified: true,
    },
    stats: { reviewCount: 28 },
  },
  {
    _id: '4',
    username: 'Ana Reyes',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    guideProfile: {
      bio: 'Former hotel concierge with 10 years experience. I focus on comfortable, family-friendly tours.',
      languages: ['English', 'Filipino'],
      specialties: ['Family Tours', 'Food Tours', 'City Tours'],
      rate: 450,
      status: 'available',
      isVerified: false,
    },
    stats: { reviewCount: 15 },
  },
];

// ======================
// GUIDE CARD COMPONENT
// ======================

interface GuideCardProps {
  guide: Guide;
  onClick: () => void;
}

const GuideCard: React.FC<GuideCardProps> = ({ guide, onClick }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const statusColors = {
    available: 'bg-green-100 text-green-700',
    on_tour: 'bg-amber-100 text-amber-700',
    unavailable: 'bg-gray-100 text-gray-500',
  };

  const statusLabels = {
    available: 'Available',
    on_tour: 'On Tour',
    unavailable: 'Unavailable',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
      aria-label={`View ${guide.username}'s profile`}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-xl overflow-hidden">
            {guide.avatar ? (
              <img
                src={guide.avatar}
                alt={guide.username}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/200/200';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {guide.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {guide.guideProfile?.isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
              <BadgeCheck className="w-5 h-5 text-sky-500" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-bold text-slate-900 truncate">{guide.username}</h3>
            <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[guide.guideProfile?.status || 'unavailable']}`}>
              {statusLabels[guide.guideProfile?.status || 'unavailable']}
            </span>
            {guide.stats?.reviewCount && guide.stats.reviewCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {guide.stats.reviewCount} reviews
              </span>
            )}
          </div>

          {/* Languages */}
          {guide.guideProfile?.languages && (
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
              <Globe className="w-3 h-3" />
              <span className="truncate">{guide.guideProfile.languages.join(', ')}</span>
            </div>
          )}

          {/* Specialties */}
          {guide.guideProfile?.specialties && (
            <div className="flex flex-wrap gap-1">
              {guide.guideProfile.specialties.slice(0, 3).map((specialty, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs bg-sky-50 text-sky-700 rounded-full"
                >
                  {specialty}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rate */}
      {guide.guideProfile?.rate && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">Starting rate</span>
          <span className="text-lg font-bold text-sky-600">
            ₱{guide.guideProfile.rate.toLocaleString()}<span className="text-sm font-normal text-slate-400">/tour</span>
          </span>
        </div>
      )}
    </div>
  );
};

// ======================
// MAIN PAGE COMPONENT
// ======================

const GuidesPage: React.FC = () => {
  const navigate = useNavigate();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch guides
  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const response = await guidesApi.getAll({
          status: statusFilter === 'all' ? undefined : statusFilter,
          verified: verifiedOnly || undefined,
        });

        if (response.data?.guides) {
          setGuides(response.data.guides);
          setIsOffline(false);
        } else {
          // Use fallback data
          setGuides(fallbackGuides);
          setIsOffline(true);
        }
      } catch (error) {
        setGuides(fallbackGuides);
        setIsOffline(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGuides();
  }, [statusFilter, verifiedOnly]);

  // Filter guides by search
  const filteredGuides = guides.filter((guide) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      guide.username.toLowerCase().includes(searchLower) ||
      guide.guideProfile?.specialties?.some((s) => s.toLowerCase().includes(searchLower)) ||
      guide.guideProfile?.languages?.some((l) => l.toLowerCase().includes(searchLower));

    return matchesSearch;
  });

  const handleGuideClick = (guideId: string) => {
    navigate(`/guide/${guideId}`);
  };

  const handleFilterToggle = () => {
    setShowFilters(!showFilters);
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFilterToggle();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header showBack title="Local Guides" />

      <div className="p-6 pt-20">
        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              Showing sample data. Connect to see real guides.
            </span>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides..."
            className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={handleFilterToggle}
            onKeyDown={handleFilterKeyDown}
            tabIndex={0}
            aria-label="Toggle filters"
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
              showFilters ? 'bg-sky-100 text-sky-600' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100 animate-fade-slide-up">
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'available', 'on_tour', 'unavailable'] as StatusFilter[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                      statusFilter === status
                        ? 'bg-sky-600 text-white'
                        : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'on_tour' ? 'On Tour' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700">Verified guides only</span>
            </label>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">
            {filteredGuides.length} guide{filteredGuides.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        )}

        {/* Guides List */}
        {!isLoading && (
          <div className="space-y-4">
            {filteredGuides.length > 0 ? (
              filteredGuides.map((guide) => (
                <GuideCard
                  key={guide._id}
                  guide={guide}
                  onClick={() => handleGuideClick(guide._id)}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-slate-500">No guides found matching your criteria</p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default GuidesPage;
