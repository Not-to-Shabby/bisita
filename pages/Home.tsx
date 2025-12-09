
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { Search, Menu, MapPin, X, ChevronRight, Loader2, Compass, Bus, Trophy, Sun, CloudRain, Moon, Waves, Utensils, Landmark, Droplets, Camera, Trees, LayoutGrid, User, Calendar, Star, Building2, PlusCircle, TrendingUp, Scan } from 'lucide-react';
import { getMedia, getMediaSafe } from '../data/mediaLibrary';
import { attractionsApi, businessesApi, guidesApi, bookingsApi, eventsApi, Attraction, Guide, GuideBooking, Business, Event } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Static fallback data for offline support
const staticSpots = [
  { id: '1', name: 'Maria Cristina Falls', category: 'Waterfalls', location: 'Agus River', image: getMedia('mariaCristinaFalls'), rating: 4.8, transport: 'Jeepney (1C)' },
  { id: '3', name: 'Tinago Falls', category: 'Waterfalls', location: 'Buru-un', image: getMedia('tinagoFalls'), rating: 4.9, transport: 'Jeepney + Habal' },
  { id: '2', name: 'Paseo de Santiago', category: 'Attractions', location: 'Santiago', image: getMedia('paseoDeSantiago'), rating: 4.5, transport: 'Jeepney (1A)' },
  { id: '4', name: 'Mimbalot Falls', category: 'Waterfalls', location: 'Buru-un', image: getMedia('mimbalotFalls'), rating: 4.4, transport: 'Jeepney + Walk' },
  { id: '6', name: 'Macaraeg-Macapagal House', category: 'Heritage', location: 'Timoga, Buru-un', image: getMedia('macaraegHouse'), rating: 4.7, transport: 'Jeepney (1C)' },
  { id: '101', name: "Cheding's Peanuts", category: 'Local Eats', location: "Quezon Ave.", image: getMedia('chedingsPeanuts'), rating: 4.9, transport: 'Tricycle' },
  { id: '102', name: "Tita Fannies", category: 'Local Eats', location: "Zamora St.", type: "Halang-Halang", image: getMedia('titaFannies'), rating: 4.6, transport: 'Tricycle' }, 
  { id: '103', name: "Timoga Lechon", category: 'Local Eats', location: "Timoga", type: "Crispy Lechon", image: getMedia('timogaLechon'), rating: 4.5, transport: 'Jeepney (1C)' },
  { id: '201', name: "Timoga Cold Springs", category: 'Cold Springs', location: "Timoga", image: getMedia('timogaSprings'), rating: 4.6, transport: 'Jeepney (1C)' }
];

interface SpotItem {
  id: string;
  name: string;
  category: string;
  location: string;
  image: string;
  rating: number;
  type?: string;
  transport?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [spots, setSpots] = useState<SpotItem[]>(staticSpots);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [greeting, setGreeting] = useState('');
  const [guides, setGuides] = useState<Guide[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [myBookings, setMyBookings] = useState<GuideBooking[]>([]);
  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);

  // Time-based greeting logic
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Maayong Buntag'); // Good Morning
    else if (hour < 18) setGreeting('Maayong Hapon'); // Good Afternoon
    else setGreeting('Maayong Gabii'); // Good Evening
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch attractions from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const [attractionsRes, businessesRes, featuredBusinessesRes, guidesRes, eventsRes] = await Promise.all([
          attractionsApi.getAll(),
          businessesApi.getAll({ limit: 50 }),
          businessesApi.getAll({ featured: true }),
          guidesApi.getAll({ verified: true }),
          eventsApi.getAll(true)
        ]);

        if (eventsRes.data?.events) {
          setEvents(eventsRes.data.events);
        }

        if (guidesRes.data?.guides) {
          setGuides(guidesRes.data.guides);
        }

        const apiSpots: SpotItem[] = [];
        const processedIds = new Set<string>();

        // Transform attractions
        if (attractionsRes.data?.attractions) {
          attractionsRes.data.attractions.forEach((attraction: Attraction) => {
            const id = attraction.legacyId || attraction._id;
            if (!processedIds.has(id)) {
              apiSpots.push({
                id,
                name: attraction.name,
                category: attraction.category,
                location: attraction.location.barangay || attraction.location.address,
                image: attraction.coverImage || getMediaSafe(attraction.legacyId || ''),
                rating: attraction.stats.averageRating || 4.5,
                transport: 'Jeepney Available', // Placeholder for API data
                isFeatured: attraction.isFeatured
              });
              processedIds.add(id);
            }
          });
        }

        // Helper to process businesses
        const processBusiness = (business: Business) => {
          const id = business.legacyId || business._id;
          if (!processedIds.has(id)) {
            const primaryImage = (business.images && business.images.length > 0)
              ? business.images[0]
              : getMediaSafe(business.legacyId || '');

            apiSpots.push({
              id,
              name: business.name,
              category: business.type === 'restaurant' ? 'Local Eats' : 
                        business.type === 'accommodation' ? 'Stay' : 
                        business.type === 'activity' ? 'Activity' : 'Shop',
              location: business.location.address,
              image: primaryImage,
              rating: business.stats.rating || 0,
              transport: 'Tricycle / Walk',
              isVerified: business.isVerified,
              isFeatured: business.isFeatured
            });
            processedIds.add(id);
          }
        };

        // Transform featured businesses first (to ensure they are included)
        if (featuredBusinessesRes.data?.businesses) {
          featuredBusinessesRes.data.businesses.forEach(processBusiness);
        }

        // Transform other businesses
        if (businessesRes.data?.businesses) {
          businessesRes.data.businesses.forEach(processBusiness);
        }

        // Use API data if available, otherwise keep static
        if (apiSpots.length > 0) {
          setSpots(apiSpots);
        }
      } catch (error) {
        console.log('Using static data (API unavailable)');
        // Keep using static data
      } finally {
        setIsLoading(false);
      }
    };

    if (isOnline) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [isOnline]);

  // Fetch user bookings
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      // Fetch bookings
      bookingsApi.getMine().then(res => {
        if (res.data?.bookings) {
          // Filter for upcoming bookings
          const upcoming = res.data.bookings.filter(b => 
            ['pending', 'accepted'].includes(b.status) && new Date(b.date) >= new Date()
          ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setMyBookings(upcoming);
        }
      });

      // Fetch businesses if owner
      if (user?.role === 'business_owner') {
        businessesApi.getMine().then(res => {
          if (res.data?.businesses) {
            setMyBusinesses(res.data.businesses);
          }
        });
      }
    }
  }, [isAuthenticated, isOnline, user?.role]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(spots.map(s => s.category).filter(Boolean));
    return ['All', ...Array.from(uniqueCategories)];
  }, [spots]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All': spots.length };
    spots.forEach(s => {
      if (s.category) {
        counts[s.category] = (counts[s.category] || 0) + 1;
      }
    });
    return counts;
  }, [spots]);

  const getCategoryIcon = (category: string) => {
    if (!category) return <MapPin size={16} />;
    const lower = category.toLowerCase();
    if (lower === 'all') return <LayoutGrid size={16} />;
    if (lower.includes('waterfall')) return <Waves size={16} />;
    if (lower.includes('spring')) return <Droplets size={16} />;
    if (lower.includes('eat') || lower.includes('food')) return <Utensils size={16} />;
    if (lower.includes('heritage') || lower.includes('history')) return <Landmark size={16} />;
    if (lower.includes('attraction')) return <Camera size={16} />;
    if (lower.includes('nature') || lower.includes('park')) return <Trees size={16} />;
    return <MapPin size={16} />;
  };

  // Filter Logic
  const filteredSpots = useMemo(() => {
    return spots.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [spots, activeCategory, searchQuery]);

  const suggestions = useMemo(() => {
    return searchQuery.length > 0 
      ? spots.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5) 
      : [];
  }, [spots, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(e.target.value.length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
    setActiveCategory('All');
  };

  const handleSuggestionClick = (id: string) => {
    navigate(`/attraction/${id}`);
    setShowSuggestions(false);
  };

  const handleSuggestionKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSuggestionClick(id);
    }
  };

  const handleSpotClick = (id: string) => {
    navigate(`/attraction/${id}`);
  };

  const handleSpotKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSpotClick(id);
    }
  };

  const isFiltering = searchQuery.length > 0 || activeCategory !== 'All';

  // Featured spots for carousel
  const featuredSpots = useMemo(() => {
    // Prioritize database "isFeatured" flag and verified high-rated businesses
    return spots.filter(i => 
      i.isFeatured || 
      (i.isVerified && i.rating >= 4.5) ||
      ['1', '3', '101', '102'].includes(i.id) // Fallback for static data
    ).sort((a, b) => {
      // Featured items always come first
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      // Then sort by rating
      return b.rating - a.rating;
    }).slice(0, 6);
  }, [spots]);

  // Easy Commute Spots (Simulated logic)
  const easyCommuteSpots = useMemo(() => {
    return spots.filter(i => i.transport && (i.transport.includes('Jeepney') || i.transport.includes('Tricycle'))).slice(0, 5);
  }, [spots]);

  // Local eats
  const localEats = useMemo(() => {
    return spots.filter(i => i.category === 'Local Eats');
  }, [spots]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-700">
          You're offline. Showing cached data.
        </div>
      )}

      {/* Smart Header */}
      <div className="bg-white p-6 sticky top-0 z-30 shadow-sm animate-fade-slide-up rounded-b-3xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Sun size={14} className="text-orange-500" />
              <span>It's a sunny day in Iligan!</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
              {greeting}, <br />
              <span className="text-sky-600">{user?.username || 'Explorer'}</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="p-1 rounded-full border-2 border-white shadow-md"
            aria-label="Open profile menu"
          >
            {isAuthenticated && user?.avatar ? (
              <img
                src={user.avatar}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-600">
                <Menu size={20} />
              </div>
            )}
          </button>
        </div>

        <div className="relative z-50 animate-fade-slide-up motion-delay-200">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => { if(searchQuery) setShowSuggestions(true); }}
            placeholder="Where to next?"
            className="w-full bg-gray-100 pl-12 pr-10 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-inner"
            aria-label="Search attractions"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}

          {/* Auto-suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
              {suggestions.map((item) => (
                <button 
                  type="button"
                  key={item.id}
                  onClick={() => handleSuggestionClick(item.id)}
                  onKeyDown={(e) => handleSuggestionKeyDown(e, item.id)}
                  tabIndex={0}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-none"
                  aria-label={`Go to ${item.name}`}
                >
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-10 h-10 rounded-lg object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/80/80?travel'; }}
                  />
                  <div>
                    <p className="font-bold text-sm text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.location}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 pt-2">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          </div>
        )}

        {/* Upcoming Booking Alert */}
        {!isLoading && myBookings.length > 0 && (
          <div className="mb-6 animate-fade-slide-up">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-sky-200 flex items-center justify-between cursor-pointer" onClick={() => navigate('/my-bookings')}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Upcoming</span>
                  <span className="text-xs text-sky-100 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(myBookings[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h3 className="font-bold text-lg">Tour with {typeof myBookings[0].guideId === 'object' ? myBookings[0].guideId.username : 'Guide'}</h3>
                <p className="text-xs text-sky-100">Tap to view details</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Compass size={24} className="text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Business Owner Dashboard Widget */}
        {!isLoading && isAuthenticated && user?.role === 'business_owner' && (
          <div className="mb-8 animate-fade-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">My Businesses</h2>
              <button className="text-sky-600 text-sm font-bold flex items-center gap-1">
                <PlusCircle size={16} /> Add New
              </button>
            </div>
            
            {myBusinesses.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {myBusinesses.map((biz, index) => (
                  <div key={biz._id} className="min-w-[260px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{biz.name}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            biz.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {biz.status === 'active' ? 'Active' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="bg-gray-50 p-2 rounded-lg text-center">
                        <div className="text-xs text-slate-500 mb-1">Views</div>
                        <div className="font-bold text-slate-900">1.2k</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg text-center">
                        <div className="text-xs text-slate-500 mb-1">Rating</div>
                        <div className="font-bold text-slate-900 flex items-center justify-center gap-1">
                          {biz.stats.rating} <Star size={10} className="fill-orange-400 text-orange-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-300 text-center">
                <Building2 size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-slate-500 text-sm mb-3">You haven't listed any businesses yet.</p>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">
                  List Your Business
                </button>
              </div>
            )}
          </div>
        )}

        {/* Category Filter Pills */}
        {!isLoading && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 py-2 px-1">
            {categories.map((cat, index) => (
              <button
                type="button"
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all animate-fade-slide-up ${
                  activeCategory === cat 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 transform scale-105 ring-2 ring-offset-2 ring-slate-900' 
                    : 'bg-white text-slate-500 border border-gray-200 hover:border-sky-300 hover:text-sky-600 hover:shadow-md'
                }`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {getCategoryIcon(cat)}
                <span>{cat}</span>
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeCategory === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-slate-400'
                }`}>
                  {categoryCounts[cat] || 0}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Conditional Rendering: Dashboard vs Search Results */}
        {!isLoading && isFiltering ? (
          <div className="space-y-4 animate-fade-slide-up">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {activeCategory !== 'All' ? `${activeCategory} in Iligan` : 'Search Results'}
              <span className="text-slate-400 font-normal text-sm ml-2">({filteredSpots.length} found)</span>
            </h2>
            {filteredSpots.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredSpots.map((item, index) => (
                  <div 
                    key={item.id} 
                    onClick={() => handleSpotClick(item.id)}
                    onKeyDown={(e) => handleSpotKeyDown(e, item.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View ${item.name}`}
                    className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-4 cursor-pointer hover:shadow-md transition-all animate-fade-slide-up"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-24 h-24 rounded-xl object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/120/120?travel'; }}
                    />
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="font-bold text-slate-900 mb-1">{item.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                        <MapPin size={12} />
                        {item.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{item.rating} ★</span>
                        {item.transport && (
                          <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded flex items-center gap-1">
                            <Bus size={10} /> {item.transport}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <p>No results found for "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-sky-600 font-bold mt-2 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        ) : !isLoading && (
          /* Default Dashboard View */
          <div className="space-y-8 animate-fade-slide-up">
            
            <div className={`gap-3 md:gap-4 ${events.length > 0 ? 'grid grid-cols-2' : 'block'}`}>
              {/* Quest / Gamification Card */}
              <div className={`bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-3 md:p-5 text-white shadow-lg shadow-indigo-200 relative overflow-hidden group cursor-pointer ${events.length === 0 ? 'w-full' : ''}`} onClick={() => navigate('/quest/waterfall-chaser')}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-2 md:mb-4">
                    <div>
                      <span className="text-[10px] md:text-xs font-bold bg-white/20 px-2 py-1 rounded-lg uppercase tracking-wider">Active Quest</span>
                      <h3 className="text-sm md:text-xl font-bold mt-2">Waterfall Chaser</h3>
                      <p className="text-indigo-100 text-[10px] md:text-sm line-clamp-1 md:line-clamp-none">Visit 3 waterfalls to earn badge!</p>
                    </div>
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm absolute top-3 right-3 md:relative md:top-0 md:right-0">
                      <Trophy size={16} className="text-yellow-300 md:w-6 md:h-6" />
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-1 md:space-y-2 mt-2">
                    <div className="flex justify-between text-[10px] md:text-xs font-medium text-indigo-100">
                      <span>1/3 Visited</span>
                      <span>33%</span>
                    </div>
                    <div className="h-1.5 md:h-2 bg-black/20 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 w-1/3 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Banner */}
              {events.length > 0 && (
                <div 
                  className="rounded-3xl p-3 md:p-6 flex flex-col justify-between animate-fade-slide-up motion-delay-300 relative overflow-hidden h-full border border-gray-100 shadow-sm"
                  style={{
                    background: events[0].style === 'bold' && events[0].gradientFrom && events[0].gradientTo
                      ? `linear-gradient(135deg, ${events[0].gradientFrom}, ${events[0].gradientTo})`
                      : events[0].backgroundColor || '#fff7ed',
                    color: events[0].textColor || '#0f172a'
                  }}
                >
                  {events[0].image && (
                    <div className={`absolute inset-0 z-0`} style={{ opacity: events[0].overlayOpacity ? events[0].overlayOpacity / 100 : (events[0].style === 'image' ? 0.8 : 0.1) }}>
                      <img src={events[0].image} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  {/* Decorative Blob */}
                  <div 
                    className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20"
                    style={{ backgroundColor: events[0].accentColor || '#f97316' }}
                  ></div>

                  <div className="relative z-10 w-full">
                    <span 
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md mb-2 inline-flex items-center gap-1"
                      style={{ 
                        backgroundColor: events[0].style === 'bold' ? 'rgba(255,255,255,0.2)' : `${events[0].accentColor}20`,
                        color: events[0].style === 'bold' ? '#ffffff' : events[0].accentColor
                      }}
                    >
                      {events[0].badgeEmoji || '🎉'} {events[0].badgeText || 'Upcoming'}
                    </span>
                    <h3 className="font-bold text-sm md:text-lg mb-1 line-clamp-1" style={{ color: events[0].textColor }}>{events[0].title}</h3>
                    <p className="text-[10px] md:text-sm mb-2 line-clamp-2 opacity-80" style={{ color: events[0].textColor }}>{events[0].description}</p>
                    {events[0].link && (
                      <a 
                        href={events[0].link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] md:text-xs font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-sm transition-opacity hover:opacity-90 inline-block"
                        style={{
                          backgroundColor: events[0].style === 'bold' ? '#ffffff' : events[0].accentColor,
                          color: events[0].style === 'bold' ? events[0].accentColor : '#ffffff'
                        }}
                      >
                        {events[0].ctaLabel || 'View'}
                      </a>
                    )}
                  </div>
                  <div 
                    className="text-3xl md:text-5xl animate-float-pulse absolute bottom-2 right-2 md:relative md:bottom-auto md:right-auto z-0 opacity-50"
                  >
                    {events[0].badgeEmoji || '🎉'}
                  </div>
                </div>
              )}
            </div>

            {/* Featured Section */}
            <div>
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-xl font-bold text-slate-900">Don't Miss These</h2>
                <button
                  type="button"
                  className="text-xs font-bold text-sky-600 hover:underline"
                  onClick={() => setActiveCategory('Waterfalls')}
                >
                  See All
                </button>
              </div>
              
              <div className="overflow-hidden relative w-full">
                <div className="flex gap-4 w-max animate-infinite-scroll pause-on-hover">
                  {/* Original items */}
                  {featuredSpots.map((item, index) => (
                    <div
                      key={item.id}
                      onClick={() => handleSpotClick(item.id)}
                      onKeyDown={(e) => handleSpotKeyDown(e, item.id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View ${item.name}`}
                      className="min-w-[280px] bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                      <div className="h-48 bg-gray-200 relative overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300?blur=2';
                          }} 
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <span className="text-orange-500">★</span> {item.rating}
                          </span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
                          <h3 className="font-bold text-xl text-white leading-tight">{item.name}</h3>
                          <div className="flex items-center gap-1 text-white/80 text-xs mt-1">
                            <MapPin size={12} />
                            {item.location}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Duplicate items for infinite scroll */}
                  {featuredSpots.map((item, index) => (
                    <div
                      key={`${item.id}-dup`}
                      onClick={() => handleSpotClick(item.id)}
                      onKeyDown={(e) => handleSpotKeyDown(e, item.id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View ${item.name}`}
                      className="min-w-[280px] bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                      <div className="h-48 bg-gray-200 relative overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300?blur=2';
                          }} 
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <span className="text-orange-500">★</span> {item.rating}
                          </span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
                          <h3 className="font-bold text-xl text-white leading-tight">{item.name}</h3>
                          <div className="flex items-center gap-1 text-white/80 text-xs mt-1">
                            <MapPin size={12} />
                            {item.location}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Meet Local Guides */}
            {guides.length > 0 && (
              <div>
                <div className="flex justify-between items-end mb-4">
                  <h2 className="text-xl font-bold text-slate-900">Meet Local Guides</h2>
                  <button
                    type="button"
                    className="text-xs font-bold text-sky-600 hover:underline"
                    onClick={() => navigate('/guides')}
                  >
                    See All
                  </button>
                </div>
                
                <div className="overflow-hidden relative w-full">
                  <div className="flex gap-4 w-max animate-infinite-scroll pause-on-hover">
                    {/* Original items */}
                    {guides.slice(0, 5).map((guide, index) => (
                      <div
                        key={guide._id}
                        onClick={() => navigate(`/guides/${guide._id}`)}
                        className="min-w-[140px] bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center cursor-pointer hover:shadow-md transition-all"
                      >
                        <div className="relative w-16 h-16 mx-auto mb-2">
                          <img 
                            src={guide.avatar || `https://ui-avatars.com/api/?name=${guide.username}&background=0ea5e9&color=fff`} 
                            alt={guide.username} 
                            className="w-full h-full rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          {guide.guideProfile.isVerified && (
                            <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-0.5 rounded-full border-2 border-white">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 truncate">{guide.username}</h3>
                        <div className="flex justify-center items-center gap-1 text-xs text-orange-500 mb-1">
                          <Star size={10} fill="currentColor" />
                          <span>{guide.guideProfile.rate > 0 ? guide.guideProfile.rate : 'New'}</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-1">
                          {guide.guideProfile.languages.slice(0, 1).map(lang => (
                            <span key={lang} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{lang}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {/* Duplicate items */}
                    {guides.slice(0, 5).map((guide, index) => (
                      <div
                        key={`${guide._id}-dup`}
                        onClick={() => navigate(`/guides/${guide._id}`)}
                        className="min-w-[140px] bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center cursor-pointer hover:shadow-md transition-all"
                      >
                        <div className="relative w-16 h-16 mx-auto mb-2">
                          <img 
                            src={guide.avatar || `https://ui-avatars.com/api/?name=${guide.username}&background=0ea5e9&color=fff`} 
                            alt={guide.username} 
                            className="w-full h-full rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          {guide.guideProfile.isVerified && (
                            <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-0.5 rounded-full border-2 border-white">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 truncate">{guide.username}</h3>
                        <div className="flex justify-center items-center gap-1 text-xs text-orange-500 mb-1">
                          <Star size={10} fill="currentColor" />
                          <span>{guide.guideProfile.rate > 0 ? guide.guideProfile.rate : 'New'}</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-1">
                          {guide.guideProfile.languages.slice(0, 1).map(lang => (
                            <span key={lang} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{lang}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Easy Commute Section (New) */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Bus size={18} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Easy Commute</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {easyCommuteSpots.slice(0, 2).map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => handleSpotClick(item.id)}
                    className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="h-24 rounded-xl bg-gray-100 mb-3 overflow-hidden">
                      <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 truncate">{item.name}</h3>
                    <p className="text-[10px] text-slate-500 mb-2 truncate">{item.location}</p>
                    <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-bold">
                      <Compass size={10} />
                      {item.transport?.split(' ')[0] || 'Accessible'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            


            {localEats.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Taste of Iligan</h2>
                <div className="overflow-hidden relative w-full">
                  <div className="flex gap-4 w-max animate-infinite-scroll pause-on-hover">
                    {/* Original items */}
                    {localEats.map((food) => (
                      <div
                        key={food.id}
                        onClick={() => handleSpotClick(food.id)}
                        onKeyDown={(e) => handleSpotKeyDown(e, food.id)}
                        tabIndex={0}
                        role="button"
                        aria-label={`View ${food.name}`}
                        className="min-w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="h-32 bg-gray-200 relative">
                          <img 
                            src={food.image} 
                            className="w-full h-full object-cover" 
                            alt={food.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://picsum.photos/200/200?food';
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-800">
                            {food.rating} ★
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-sm text-slate-900 truncate">{food.name}</h4>
                          <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-2">
                            <MapPin size={10} />
                            {food.location}
                          </div>
                          <span className="text-[10px] text-sky-600 bg-sky-50 px-2 py-1 rounded-md font-medium">{food.category}</span>
                        </div>
                      </div>
                    ))}
                    {/* Duplicate items */}
                    {localEats.map((food) => (
                      <div
                        key={`${food.id}-dup`}
                        onClick={() => handleSpotClick(food.id)}
                        onKeyDown={(e) => handleSpotKeyDown(e, food.id)}
                        tabIndex={0}
                        role="button"
                        aria-label={`View ${food.name}`}
                        className="min-w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="h-32 bg-gray-200 relative">
                          <img 
                            src={food.image} 
                            className="w-full h-full object-cover" 
                            alt={food.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://picsum.photos/200/200?food';
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-800">
                            {food.rating} ★
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-sm text-slate-900 truncate">{food.name}</h4>
                          <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-2">
                            <MapPin size={10} />
                            {food.location}
                          </div>
                          <span className="text-[10px] text-sky-600 bg-sky-50 px-2 py-1 rounded-md font-medium">{food.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {/* Floating QR Scanner Button */}
      <button
        onClick={() => navigate('/scan')}
        className="fixed bottom-24 right-6 z-40 bg-slate-900 text-white p-4 rounded-full shadow-xl shadow-slate-900/30 hover:scale-110 active:scale-95 transition-all animate-bounce"
        aria-label="Scan QR Code"
        style={{ animationDuration: '3s' }}
      >
        <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-20"></div>
        <Scan size={24} />
      </button>

      <BottomNav />
    </div>
  );
};

export default Home;