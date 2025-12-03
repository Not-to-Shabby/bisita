import React, { useState } from 'react';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';
import { Search, ChevronRight, Star, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMedia } from '../data/mediaLibrary';

const Directory: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const items = [
    { id: '5', name: "Go Hotels Iligan", category: 'Accommodation', rating: 4.4, reviews: 320, location: 'Robinson\'s Place, Iligan', image: getMedia('goHotels') },
    { id: '7', name: "Jacko's Kan-anan", category: 'Restaurants', rating: 4.7, reviews: 542, location: 'Hinaplanon, Iligan', image: getMedia('jackosKananan') },
    { id: '6', name: "Macaraeg-Macapagal House", category: 'Heritage', rating: 4.9, reviews: 120, location: 'Timoga, Buru-un', image: getMedia('macaraegHouse') },
    { id: '8', name: "Delecta Diner and Café", category: 'Restaurants', rating: 4.6, reviews: 210, location: 'Gen. Aguinaldo St.', image: getMedia('delectaDiner') },
    { id: '9', name: "NPC Nature's Park", category: 'Activities', rating: 4.8, reviews: 150, location: 'Maria Cristina', image: getMedia('npcNaturesPark') },
    { id: '10', name: "Buru-un Wet Market", category: 'Market', rating: 4.3, reviews: 85, location: 'Buru-un', image: getMedia('buruunMarket') },
  ];

  const categories = ['All', 'Accommodation', 'Restaurants', 'Heritage', 'Activities', 'Market'];

  const filteredItems = items.filter(item => {
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header showBack title="Directory" />
      <div className="px-6 pt-20">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Find hotels, restos, or spots"
            className="w-full bg-white border border-gray-200 pl-12 pr-10 py-3 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 shadow-sm transition-all"
          />
          {searchTerm && (
             <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <X size={16} />
             </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6">
            {categories.map(cat => (
                <button 
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                        filterCategory === cat 
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-gray-200 hover:border-sky-300'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        <div className="flex flex-col gap-4">
          {filteredItems.length > 0 ? filteredItems.map((item) => (
            <div 
                key={item.id} 
                onClick={() => navigate(`/attraction/${item.id}`)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-20 h-20 rounded-xl object-cover bg-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/100/100?random=' + item.id }} 
              />
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{item.name}</h3>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 mb-1">
                    <MapPin size={12} />
                    {item.location}
                </div>
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-slate-800">{item.rating}</span>
                  <span className="text-sm text-gray-500">({item.reviews})</span>
                </div>
              </div>
              <ChevronRight className="text-gray-300" />
            </div>
          )) : (
             <div className="text-center py-10 text-slate-400">
                 No listings found.
             </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Directory;