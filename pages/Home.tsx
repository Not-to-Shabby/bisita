
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { Search, Menu, MapPin, X, ChevronRight } from 'lucide-react';
import { getMedia } from '../data/mediaLibrary';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Consolidated Data for Search & Filtering
  const allSpots = [
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

  const categories = ['All', 'Waterfalls', 'Cold Springs', 'Heritage', 'Local Eats', 'Attractions'];

  // Filter Logic
  const filteredSpots = allSpots.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const suggestions = searchQuery.length > 0 
    ? allSpots.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5) 
    : [];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(e.target.value.length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
    setActiveCategory('All');
  };

  const isFiltering = searchQuery.length > 0 || activeCategory !== 'All';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white p-6 sticky top-0 z-30 shadow-sm">
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
          <button onClick={() => navigate('/profile')} className="p-2 hover:bg-gray-100 rounded-full">
            <Menu size={24} />
          </button>
        </div>

        <div className="relative z-50">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => { if(searchQuery) setShowSuggestions(true); }}
            placeholder="Search waterfalls, food, hotels..."
            className="w-full bg-gray-100 pl-12 pr-10 py-3 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 transition-shadow"
          />
          {searchQuery && (
            <button 
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
                <X size={16} />
            </button>
          )}

          {/* Auto-suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                {suggestions.map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => {
                            navigate(`/attraction/${item.id}`);
                            setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-none"
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
        {/* Category Filter Pills */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                activeCategory === cat ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-slate-600 border border-gray-200 hover:border-sky-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Conditional Rendering: Dashboard vs Search Results */}
        {isFiltering ? (
           <div className="animate-fade-in">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                    {activeCategory !== 'All' ? `${activeCategory} in Iligan` : 'Search Results'}
                    <span className="text-slate-400 font-normal text-sm ml-2">({filteredSpots.length} found)</span>
                </h2>
                {filteredSpots.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredSpots.map((item) => (
                            <div 
                                key={item.id} 
                                onClick={() => navigate(`/attraction/${item.id}`)}
                                className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-4 cursor-pointer hover:shadow-md transition-all"
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
                        <button onClick={clearSearch} className="text-sky-600 font-bold mt-2">Clear filters</button>
                    </div>
                )}
           </div>
        ) : (
           /* Default Dashboard View */
           <div className="animate-fade-in">
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-xl font-bold text-slate-900">Tourism Triangle</h2>
                    <span className="text-xs font-bold text-sky-600 cursor-pointer" onClick={() => setActiveCategory('Waterfalls')}>See All</span>
                </div>
                
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6">
                {allSpots.filter(i => ['1', '2', '3', '4'].includes(i.id)).map((item) => (
                    <div
                    key={item.id}
                    onClick={() => navigate(`/attraction/${item.id}`)}
                    className="min-w-[260px] bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
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
                
                <div className="bg-orange-50 rounded-2xl p-6 mb-8 flex items-center justify-between border border-orange-100">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-1">Diyandi Festival</h3>
                        <p className="text-sm text-slate-600 mb-3">Celebrate with us every September!</p>
                        <button 
                            onClick={() => alert("Redirecting to Diyandi Festival details...")}
                            className="bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-orange-600"
                        >
                            Learn More
                        </button>
                    </div>
                    <div className="w-20 h-20 bg-orange-200 rounded-full flex items-center justify-center text-4xl shadow-inner">
                        🎉
                    </div>
                </div>

                <h2 className="text-xl font-bold text-slate-900 mb-4">Taste of Iligan</h2>
                <div className="flex gap-4 overflow-x-auto no-scrollbar">
                {allSpots.filter(i => i.category === 'Local Eats').map((food) => (
                    <div
                    key={food.id}
                    onClick={() => navigate(`/attraction/${food.id}`)}
                    className="min-w-[150px] bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer"
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
            </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Home;
