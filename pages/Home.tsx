
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { Search, Menu, MapPin, X, ChevronRight, Loader2 } from 'lucide-react';
import { getMedia, getMediaSafe } from '../data/mediaLibrary';
import { attractionsApi, businessesApi, Attraction } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Static fallback data for offline support
const staticSpots = [
  { id: '1', name: 'Maria Cristina Falls', category: 'Waterfalls', location: 'Agus River', image: getMedia('mariaCristinaFalls'), rating: 4.8 },
  { id: '3', name: 'Tinago Falls', category: 'Waterfalls', location: 'Buru-un', image: getMedia('tinagoFalls'), rating: 4.9 },
  { id: '2', name: 'Paseo de Santiago', category: 'Attractions', location: 'Santiago', image: getMedia('paseoDeSantiago'), rating: 4.5 },
  { id: '4', name: 'Mimbalot Falls', category: 'Waterfalls', location: 'Buru-un', image: getMedia('mimbalotFalls'), rating: 4.4 },
  { id: '6', name: 'Macaraeg-Macapagal House', category: 'Heritage', location: 'Timoga, Buru-un', image: getMedia('macaraegHouse'), rating: 4.7 },
  { id: '101', name: "Cheding's Peanuts", category: 'Local Eats', location: "Quezon Ave.", image: getMedia('chedingsPeanuts'), rating: 4.9 },
  { id: '102', name: "Tita Fannies", category: 'Local Eats', location: "Zamora St.", type: "Halang-Halang", image: getMedia('titaFannies'), rating: 4.6 }, 
  { id: '103', name: "Timoga Lechon", category: 'Local Eats', location: "Timoga", type: "Crispy Lechon", image: getMedia('timogaLechon'), rating: 4.5 },
  { id: '201', name: "Timoga Cold Springs", category: 'Cold Springs', location: "Timoga", image: getMedia('timogaSprings'), rating: 4.6 }
];

interface SpotItem {
  id: string;
  name: string;
  category: string;
  location: string;
  image: string;
  rating: number;
  type?: string;
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
        const [attractionsRes, businessesRes] = await Promise.all([
          attractionsApi.getAll(),
          businessesApi.getAll(),
        ]);

        const apiSpots: SpotItem[] = [];

        // Transform attractions
        if (attractionsRes.data?.attractions) {
          attractionsRes.data.attractions.forEach((attraction: Attraction) => {
            apiSpots.push({
              id: attraction.legacyId || attraction._id,
              name: attraction.name,
              category: attraction.category,
              location: attraction.location.barangay || attraction.location.address,
              image: attraction.coverImage || getMediaSafe(attraction.legacyId || ''),
              rating: attraction.stats.averageRating || 4.5,
            });
          });
        }

        // Transform businesses
        if (businessesRes.data?.businesses) {
          businessesRes.data.businesses.forEach((business) => {
            apiSpots.push({
              id: business.legacyId || business._id,
              name: business.name,
              category: business.category,
              location: business.location.address,
              image: business.coverImage || getMediaSafe(business.legacyId || ''),
              rating: business.stats.averageRating || 4.5,
            });
          });
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

  const categories = useMemo(() => {
    const uniqueCategories = new Set(spots.map(s => s.category));
    return ['All', ...Array.from(uniqueCategories)];
  }, [spots]);

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
    return spots.filter(i => ['1', '2', '3', '4'].includes(i.id) || i.rating >= 4.7).slice(0, 4);
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

      {/* Header */}
      <div className="bg-white p-6 sticky top-0 z-30 shadow-sm animate-fade-slide-up">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center border border-sky-100">
              <span className="text-sky-700 font-serif font-bold text-lg">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-none">Bisita Iligan</h1>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Lanao del Norte</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && user && (
              <span className="text-sm text-slate-600 hidden sm:block">
                Hi, {user.username}
              </span>
            )}
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Open profile menu"
            >
              {isAuthenticated && user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="w-6 h-6 rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <Menu size={24} />
              )}
            </button>
          </div>
        </div>

        <div className="relative z-50 animate-fade-slide-up motion-delay-200">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => { if(searchQuery) setShowSuggestions(true); }}
            placeholder="Search waterfalls, food, hotels..."
            className="w-full bg-gray-100 pl-12 pr-10 py-3 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 transition-shadow"
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

      <div className="p-6">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          </div>
        )}

        {/* Category Filter Pills */}
        {!isLoading && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar mb-6">
            {categories.map((cat, index) => (
              <button
                type="button"
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors animate-fade-slide-up ${
                  activeCategory === cat ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-slate-600 border border-gray-200 hover:border-sky-300'
                }`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {cat}
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
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{item.rating} ★</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wide">{item.category}</span>
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
          <div className="space-y-6 animate-fade-slide-up">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-bold text-slate-900">Tourism Triangle</h2>
              <button
                type="button"
                className="text-xs font-bold text-sky-600 hover:underline"
                onClick={() => setActiveCategory('Waterfalls')}
              >
                See All
              </button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 animate-carousel-glide">
              {featuredSpots.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => handleSpotClick(item.id)}
                  onKeyDown={(e) => handleSpotKeyDown(e, item.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View ${item.name}`}
                  className="min-w-[260px] bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group animate-fade-slide-up"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="h-44 bg-gray-200 relative overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300?blur=2';
                      }} 
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                      <span className="text-[10px] font-bold text-slate-800">{item.rating} ★</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-slate-900 leading-tight mb-1">{item.name}</h3>
                    <div className="flex items-center gap-1 text-slate-500 text-xs">
                      <MapPin size={12} />
                      {item.location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-orange-50 rounded-2xl p-6 mb-8 flex items-center justify-between border border-orange-100 animate-fade-slide-up motion-delay-300">
              <div>
                <h3 className="font-bold text-lg text-slate-900 mb-1">Diyandi Festival</h3>
                <p className="text-sm text-slate-600 mb-3">Celebrate with us every September!</p>
                <button 
                  type="button"
                  onClick={() => alert("Redirecting to Diyandi Festival details...")}
                  className="bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-orange-600 transition-colors"
                >
                  Learn More
                </button>
              </div>
              <div className="w-20 h-20 bg-orange-200 rounded-full flex items-center justify-center text-4xl shadow-inner animate-float-pulse">
                🎉
              </div>
            </div>

            {localEats.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Taste of Iligan</h2>
                <div className="flex gap-4 overflow-x-auto no-scrollbar animate-carousel-glide">
                  {localEats.map((food) => (
                    <div
                      key={food.id}
                      onClick={() => handleSpotClick(food.id)}
                      onKeyDown={(e) => handleSpotKeyDown(e, food.id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View ${food.name}`}
                      className="min-w-[150px] bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer animate-fade-slide-up hover:shadow-md transition-shadow"
                    >
                      <div className="h-28 bg-gray-200 relative">
                        <img 
                          src={food.image} 
                          className="w-full h-full object-cover" 
                          alt={food.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://picsum.photos/200/200?food';
                          }}
                        />
                      </div>
                      <div className="p-3">
                        <h4 className="font-bold text-sm text-slate-900 truncate">{food.name}</h4>
                        <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-1">
                          <MapPin size={10} />
                          {food.location}
                        </div>
                        <span className="text-[10px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">{food.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Home;
