
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { Search, Menu, MapPin, X, ChevronRight, Loader2, Compass, Bus, Trophy, Sun, CloudRain, Moon, Waves, Utensils, Landmark, Droplets, Camera, Trees, LayoutGrid, User, Calendar, Star, Building2, PlusCircle, TrendingUp, Scan, Cloud, CloudLightning, CloudSun, CloudDrizzle } from 'lucide-react';
import { getMedia, getMediaSafe } from '../data/mediaLibrary';
import { attractionsApi, businessesApi, guidesApi, bookingsApi, eventsApi, questsApi, Attraction, Guide, GuideBooking, Business, Event, Quest, UserQuest } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Static fallback data for offline support
const staticSpots = [
  { id: '1', name: 'Maria Cristina Falls', category: 'Waterfall', location: 'Agus River', image: getMedia('mariaCristinaFalls'), rating: 0, transport: 'Jeepney (1C)' },
  { id: '3', name: 'Tinago Falls', category: 'Waterfall', location: 'Buru-un', image: getMedia('tinagoFalls'), rating: 0, transport: 'Jeepney + Habal' },
  { id: '2', name: 'Paseo de Santiago', category: 'Attraction', location: 'Santiago', image: getMedia('paseoDeSantiago'), rating: 0, transport: 'Jeepney (1A)' },
  { id: '4', name: 'Mimbalot Falls', category: 'Waterfall', location: 'Buru-un', image: getMedia('mimbalotFalls'), rating: 0, transport: 'Jeepney + Walk' },
  { id: '6', name: 'Macaraeg-Macapagal House', category: 'Heritage', location: 'Timoga, Buru-un', image: getMedia('macaraegHouse'), rating: 0, transport: 'Jeepney (1C)' },
  { id: '101', name: "Cheding's Peanuts", category: 'Local Eats', location: "Quezon Ave.", image: getMedia('chedingsPeanuts'), rating: 0, transport: 'Tricycle' },
  { id: '102', name: "Tita Fannies", category: 'Local Eats', location: "Zamora St.", type: "Halang-Halang", image: getMedia('titaFannies'), rating: 0, transport: 'Tricycle' }, 
  { id: '103', name: "Timoga Lechon", category: 'Local Eats', location: "Timoga", type: "Crispy Lechon", image: getMedia('timogaLechon'), rating: 0, transport: 'Jeepney (1C)' },
  { id: '201', name: "Timoga Cold Springs", category: 'Cold Springs', location: "Timoga", image: getMedia('timogaSprings'), rating: 0, transport: 'Jeepney (1C)' }
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

interface WeatherData {
  temperature: number;
  weathercode: number;
  is_day: number;
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
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [myBookings, setMyBookings] = useState<GuideBooking[]>([]);
  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [allUserQuests, setAllUserQuests] = useState<UserQuest[]>([]);
  const [userQuestProgress, setUserQuestProgress] = useState<UserQuest | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [currentQuestIndex, setCurrentQuestIndex] = useState(0);

  // Auto-rotate events
  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentEventIndex(prev => (prev + 1) % events.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [events.length]);

  // Auto-rotate quests
  useEffect(() => {
    if (quests.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentQuestIndex(prev => (prev + 1) % quests.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [quests.length]);

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

  // Fetch Weather for Iligan City
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Iligan City Coordinates: 8.2280° N, 124.2452° E
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=8.2280&longitude=124.2452&current_weather=true');
        const data = await res.json();
        if (data.current_weather) {
          setWeather(data.current_weather);
        }
      } catch (e) {
        console.error('Failed to fetch weather', e);
      }
    };
    
    if (isOnline) fetchWeather();
  }, [isOnline]);

  // Fetch attractions from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const [attractionsRes, businessesRes, featuredBusinessesRes, guidesRes, eventsRes, questsRes] = await Promise.all([
          attractionsApi.getAll(),
          businessesApi.getAll({ limit: 50 }),
          businessesApi.getAll({ featured: true }),
          guidesApi.getAll({ verified: true }),
          eventsApi.getAll(true),
          questsApi.getAll()
        ]);

        if (eventsRes.data?.events) {
          setEvents(eventsRes.data.events);
        }

        if (guidesRes.data?.guides) {
          setGuides(guidesRes.data.guides);
        }

        // Set active quest (first active quest from API)
        if (questsRes.data?.quests && questsRes.data.quests.length > 0) {
          setQuests(questsRes.data.quests);
          const firstQuest = questsRes.data.quests[0];
          setActiveQuest({ ...firstQuest, tasks: firstQuest.tasks || [] });
        }

        const apiSpots: SpotItem[] = [];
        const processedIds = new Set<string>();

        // Transform attractions
        if (attractionsRes.data?.attractions) {
          attractionsRes.data.attractions.forEach((attraction: Attraction) => {
            const id = attraction.legacyId || attraction._id;
            if (!processedIds.has(id)) {
              const primaryImage = (attraction.images && attraction.images.length > 0)
                ? attraction.images[0].url
                : attraction.coverImage || getMediaSafe(attraction.legacyId || '');

              apiSpots.push({
                id,
                name: attraction.name,
                category: attraction.category ? attraction.category.charAt(0).toUpperCase() + attraction.category.slice(1) : 'Attraction',
                location: attraction.location.barangay || attraction.location.address,
                image: primaryImage,
                rating: attraction.stats.rating || 0,
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

  // Fetch user bookings and quest progress
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

      // Fetch user quest progress
      questsApi.getMyProgress().then(res => {
        if (res.data?.userQuests && res.data.userQuests.length > 0) {
          setAllUserQuests(res.data.userQuests);
          // Find progress for active quest
          if (activeQuest) {
            const progress = res.data.userQuests.find(uq => 
              (typeof uq.questId === 'string' ? uq.questId : uq.questId._id) === activeQuest._id
            );
            if (progress) {
              setUserQuestProgress(progress);
            }
          } else {
            // If no active quest set yet, use the first user quest
            setUserQuestProgress(res.data.userQuests[0]);
          }
        }
      });
    }
  }, [isAuthenticated, isOnline, user?.role, activeQuest]);

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
      if (activeCategory === 'Featured') {
        return item.isFeatured && (item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.location.toLowerCase().includes(searchQuery.toLowerCase()));
      }
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
    // Only show items explicitly marked as featured
    return spots.filter(i => i.isFeatured).slice(0, 6);
  }, [spots]);

  // Easy Commute Spots (Simulated logic)
  const easyCommuteSpots = useMemo(() => {
    return spots.filter(i => i.transport && (i.transport.includes('Jeepney') || i.transport.includes('Tricycle'))).slice(0, 5);
  }, [spots]);

  // Local eats
  const localEats = useMemo(() => {
    return spots.filter(i => i.category === 'Local Eats');
  }, [spots]);

  const getWeatherIcon = (code: number) => {
    // WMO Weather interpretation codes (WW)
    if (code === 0) return <Sun size={14} className="text-orange-500" />;
    if (code >= 1 && code <= 3) return <CloudSun size={14} className="text-orange-400" />;
    if (code >= 45 && code <= 48) return <Cloud size={14} className="text-gray-400" />;
    if (code >= 51 && code <= 55) return <CloudDrizzle size={14} className="text-blue-400" />;
    if (code >= 61 && code <= 82) return <CloudRain size={14} className="text-blue-500" />;
    if (code >= 95) return <CloudLightning size={14} className="text-purple-500" />;
    return <Sun size={14} className="text-orange-500" />;
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return "It's a sunny day in Iligan!";
    if (code >= 1 && code <= 3) return "It's a cloudy day in Iligan";
    if (code >= 45 && code <= 48) return "It's a foggy day in Iligan";
    if (code >= 51 && code <= 55) return "It's a drizzly day in Iligan";
    if (code >= 61 && code <= 82) return "It's a rainy day in Iligan";
    if (code >= 95) return "It's a stormy day in Iligan";
    return "It's a beautiful day in Iligan!";
  };

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
              {weather ? (
                <>
                  {getWeatherIcon(weather.weathercode)}
                  <span>{getWeatherDescription(weather.weathercode)} ({weather.temperature}°C)</span>
                </>
              ) : (
                <>
                  <Sun size={14} className="text-orange-500" />
                  <span>It's a sunny day in Iligan!</span>
                </>
              )}
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
                    src={item.image || undefined} 
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
                      src={item.image || undefined} 
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
                        {item.rating > 0 ? (
                          <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{item.rating.toFixed(1)} ★</span>
                        ) : (
                          <span className="text-xs font-bold bg-gray-100 text-slate-600 px-2 py-0.5 rounded">New</span>
                        )}
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
            
            <div className={`gap-3 md:gap-4 ${events.length > 0 || quests.length > 0 ? 'grid grid-cols-2' : 'block'}`}>
              {/* Quest / Gamification Carousel */}
              {quests.length > 0 && (
                <div className={`relative h-full min-h-[240px] group/quests perspective-1000 ${!events.length ? 'col-span-2' : ''}`}>
                  {quests.map((quest, index) => {
                    const position = (index - currentQuestIndex + quests.length) % quests.length;
                    const isActive = position === 0;
                    const isNext = position === 1;
                    const isNextNext = position === 2;
                    
                    // Only render top 3 cards
                    if (position > 2 && position !== quests.length - 1) return null;

                    let zIndex = 0;
                    let scale = 0.9;
                    let opacity = 0;
                    let translateY = 0;
                    let translateX = 0;

                    if (isActive) {
                      zIndex = 30;
                      scale = 1;
                      opacity = 1;
                    } else if (isNext) {
                      zIndex = 20;
                      scale = 0.96;
                      opacity = 1;
                      translateY = 8;
                      translateX = 8;
                    } else if (isNextNext) {
                      zIndex = 10;
                      scale = 0.92;
                      opacity = 0.8;
                      translateY = 16;
                      translateX = 16;
                    } else if (position === quests.length - 1) {
                      zIndex = 0;
                      scale = 1.05;
                      opacity = 0;
                    }

                    // Find progress for this specific quest
                    const questProgress = allUserQuests.find(uq => 
                      (typeof uq.questId === 'string' ? uq.questId : uq.questId._id) === quest._id
                    );
                    
                    const totalTasks = quest.tasks?.length ?? 0;
                    const completedTasks = questProgress?.completedTaskIds?.length ?? 0;
                    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                    return (
                      <div 
                        key={quest._id}
                        className={`absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-500 rounded-[2rem] p-5 text-white shadow-sm border border-white/15 overflow-hidden cursor-pointer flex flex-col justify-between transition-all duration-500 ease-out ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
                        style={{
                          zIndex,
                          opacity,
                          transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                        }}
                        onClick={() => quest._id && navigate(`/quest/${quest._id}`)}
                        role="button"
                        tabIndex={isActive ? 0 : -1}
                        aria-hidden={!isActive}
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                        <div className="relative z-10 h-full flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
                              {progressPercent === 100 ? 'Completed' : progressPercent > 0 ? 'Active Quest' : 'New Quest'}
                            </span>
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner border border-white/10 overflow-hidden">
                              {quest.badgeImage ? (
                                <img src={quest.badgeImage} alt="Badge" className="w-full h-full object-cover" />
                              ) : (
                                <Trophy size={32} className="text-yellow-300 drop-shadow-sm" />
                              )}
                            </div>
                          </div>
                          
                          <div className="mb-auto">
                            <h3 className="text-xl font-bold mt-2 leading-tight">{quest.title}</h3>
                            <p className="text-indigo-100 text-sm mt-1 line-clamp-2">{quest.description}</p>
                          </div>
                          
                          <div className="space-y-2 mt-4">
                            <div className="flex justify-between text-xs font-bold text-white">
                              <span>{completedTasks}/{totalTasks} Visited</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="h-2.5 bg-black/20 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Manual Navigation Overlay */}
                  {quests.length > 1 && (
                    <div className="absolute inset-x-0 bottom-0 h-16 z-40 flex justify-end items-end p-4 opacity-0 group-hover/quests:opacity-100 transition-opacity pointer-events-none">
                      <div className="flex gap-2 pointer-events-auto">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentQuestIndex(prev => (prev - 1 + quests.length) % quests.length); }}
                          className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 text-white shadow-sm transition-colors"
                          aria-label="Previous quest"
                        >
                          <ChevronRight size={16} className="rotate-180" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentQuestIndex(prev => (prev + 1) % quests.length); }}
                          className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 text-white shadow-sm transition-colors"
                          aria-label="Next quest"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Event Stack Carousel */}
              {events.length > 0 && (
                <div className={`relative h-full min-h-[240px] group/events perspective-1000 ${!quests.length ? 'col-span-2' : ''}`}>
                  {events.map((evt, index) => {
                    const position = (index - currentEventIndex + events.length) % events.length;
                    const isActive = position === 0;
                    const isNext = position === 1;
                    const isNextNext = position === 2;
                    
                    // Only render top 3 cards for performance and visual clarity
                    if (position > 2 && position !== events.length - 1) return null;

                    let zIndex = 0;
                    let scale = 0.9;
                    let opacity = 0;
                    let translateY = 0;
                    let translateX = 0;

                    if (isActive) {
                      zIndex = 30;
                      scale = 1;
                      opacity = 1;
                    } else if (isNext) {
                      zIndex = 20;
                      scale = 0.96;
                      opacity = 1;
                      translateY = 8;
                      translateX = 8;
                    } else if (isNextNext) {
                      zIndex = 10;
                      scale = 0.92;
                      opacity = 0.8;
                      translateY = 16;
                      translateX = 16;
                    } else if (position === events.length - 1) {
                      // Previous card fading out
                      zIndex = 0;
                      scale = 1.05;
                      opacity = 0;
                    }

                    // Adaptive text color logic
                    const isImage = !!evt.image;
                    const isBold = evt.style === 'bold';
                    // Force white text if image or bold style is present to ensure readability
                    const textColor = (isImage || isBold) ? '#ffffff' : (evt.textColor || '#0f172a');
                    const badgeBg = isImage || isBold ? 'rgba(255,255,255,0.2)' : `${evt.accentColor}20`;
                    const badgeText = isImage || isBold ? '#ffffff' : evt.accentColor;

                    return (
                      <div
                        key={evt._id}
                        className={`absolute inset-0 rounded-[2rem] p-5 flex flex-col justify-between border border-gray-100 shadow-sm cursor-pointer transition-all duration-500 ease-out ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
                        style={{
                          background: evt.style === 'bold' && evt.gradientFrom && evt.gradientTo
                            ? `linear-gradient(135deg, ${evt.gradientFrom}, ${evt.gradientTo})`
                            : evt.backgroundColor || '#fff7ed',
                          color: textColor,
                          zIndex,
                          opacity,
                          transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                        }}
                        onClick={() => navigate(`/event/${evt._id}`)}
                        role="button"
                        tabIndex={isActive ? 0 : -1}
                        aria-hidden={!isActive}
                      >
                        {evt.image && (
                          <div className="absolute inset-0 z-0">
                            <img src={evt.image} alt="" className="w-full h-full object-cover rounded-[2rem]" />
                            <div className="absolute inset-0 bg-black/40 rounded-[2rem]" />
                          </div>
                        )}
                        
                        <div 
                          className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20"
                          style={{ backgroundColor: evt.accentColor || '#f97316' }}
                        ></div>

                        <div className="relative z-10 w-full h-full flex flex-col items-start">
                          <div className="flex justify-between items-start w-full mb-auto">
                            <span 
                              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-flex items-center gap-1 backdrop-blur-sm"
                              style={{ 
                                backgroundColor: badgeBg,
                                color: badgeText
                              }}
                            >
                              {evt.badgeEmoji || '🎉'} {evt.badgeText || 'Upcoming'}
                            </span>
                            {events.length > 1 && (
                              <div className="flex gap-1">
                                {events.map((_, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentEventIndex ? 'bg-current opacity-100' : 'bg-current opacity-30'}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="w-full mt-8">
                            <h3 className="font-bold text-xl mb-1 line-clamp-2 leading-tight drop-shadow-md" style={{ color: 'inherit' }}>{evt.title}</h3>
                            <p className="text-sm line-clamp-2 opacity-90 drop-shadow-sm" style={{ color: 'inherit' }}>{evt.description}</p>
                          </div>
                        </div>
                        
                        <div 
                          className="text-4xl animate-bounce absolute bottom-4 right-4 z-0 opacity-90"
                          style={{ animationDuration: '3s' }}
                        >
                          {evt.badgeEmoji || '🎉'}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Manual Navigation Overlay */}
                  {events.length > 1 && (
                    <div className="absolute inset-x-0 bottom-0 h-16 z-40 flex justify-end items-end p-4 opacity-0 group-hover/events:opacity-100 transition-opacity pointer-events-none">
                      <div className="flex gap-2 pointer-events-auto">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentEventIndex(prev => (prev - 1 + events.length) % events.length); }}
                          className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 text-slate-800 shadow-sm transition-colors"
                          aria-label="Previous event"
                        >
                          <ChevronRight size={16} className="rotate-180" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentEventIndex(prev => (prev + 1) % events.length); }}
                          className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 text-slate-800 shadow-sm transition-colors"
                          aria-label="Next event"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Featured Section */}
            {featuredSpots.length > 0 && (
              <div>
                <div className="flex justify-between items-end mb-4">
                  <h2 className="text-xl font-bold text-slate-900">Don't Miss These</h2>
                  <button
                    type="button"
                    className="text-xs font-bold text-sky-600 hover:underline"
                    onClick={() => setActiveCategory('Featured')}
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
                            src={item.image || undefined} 
                            alt={item.name} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300?blur=2';
                            }} 
                          />
                          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                            {item.rating > 0 ? (
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                <span className="text-orange-500">★</span> {item.rating.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-600">New</span>
                            )}
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
                            src={item.image || undefined} 
                            alt={item.name} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300?blur=2';
                            }} 
                          />
                          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                            {item.rating > 0 ? (
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                <span className="text-orange-500">★</span> {item.rating.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-600">New</span>
                            )}
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
            )}

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
                      <img src={item.image || undefined} className="w-full h-full object-cover" alt={item.name} />
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
                            src={food.image || undefined} 
                            className="w-full h-full object-cover" 
                            alt={food.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://picsum.photos/200/200?food';
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-800">
                            {food.rating > 0 ? `${food.rating.toFixed(1)} ★` : 'New'}
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
                            src={food.image || undefined} 
                            className="w-full h-full object-cover" 
                            alt={food.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://picsum.photos/200/200?food';
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-800">
                            {food.rating > 0 ? `${food.rating.toFixed(1)} ★` : 'New'}
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
