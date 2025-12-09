import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';
import { Search, ChevronRight, Star, MapPin, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMedia } from '../data/mediaLibrary';
import { attractionsApi, businessesApi, guidesApi } from '../services/api';

interface DirectoryItem {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  location: string;
  image: string;
  type: 'Attraction' | 'Business' | 'Guide';
  isVerified?: boolean;
}

const Directory: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const hardcodedItems: DirectoryItem[] = [
    { id: '5', name: "Go Hotels Iligan", category: 'Accommodation', rating: 4.4, reviews: 320, location: 'Robinson\'s Place, Iligan', image: getMedia('goHotels'), type: 'Business' },
    { id: '7', name: "Jacko's Kan-anan", category: 'Restaurants', rating: 4.7, reviews: 542, location: 'Hinaplanon, Iligan', image: getMedia('jackosKananan'), type: 'Business' },
    { id: '6', name: "Macaraeg-Macapagal House", category: 'Heritage', rating: 4.9, reviews: 120, location: 'Timoga, Buru-un', image: getMedia('macaraegHouse'), type: 'Attraction' },
    { id: '8', name: "Delecta Diner and Café", category: 'Restaurants', rating: 4.6, reviews: 210, location: 'Gen. Aguinaldo St.', image: getMedia('delectaDiner'), type: 'Business' },
    { id: '9', name: "NPC Nature's Park", category: 'Activities', rating: 4.8, reviews: 150, location: 'Maria Cristina', image: getMedia('npcNaturesPark'), type: 'Attraction' },
    { id: '10', name: "Buru-un Wet Market", category: 'Market', rating: 4.3, reviews: 85, location: 'Buru-un', image: getMedia('buruunMarket'), type: 'Business' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attractionsRes, businessesRes, guidesRes] = await Promise.all([
          attractionsApi.getAll(),
          businessesApi.getAll(),
          guidesApi.getAll({ verified: false })
        ]);

        const apiItems: DirectoryItem[] = [];

        if (attractionsRes.data?.attractions) {
          apiItems.push(...attractionsRes.data.attractions.map(a => ({
            id: a._id,
            name: a.name,
            category: a.category.charAt(0).toUpperCase() + a.category.slice(1),
            rating: a.stats.averageRating || 0,
            reviews: a.stats.reviewCount || 0,
            location: a.location.address || a.location.barangay,
            image: a.coverImage || (a.gallery && a.gallery[0]) || '',
            type: 'Attraction' as const
          })));
        }

        if (businessesRes.data?.businesses) {
          apiItems.push(...businessesRes.data.businesses.map(b => ({
            id: b._id,
            name: b.name,
            category: b.type.charAt(0).toUpperCase() + b.type.slice(1),
            rating: b.stats.rating || 0,
            reviews: b.stats.reviewCount || 0,
            location: b.location.address,
            image: b.images && b.images[0] ? b.images[0] : '',
            type: 'Business' as const
          })));
        }

        if (guidesRes.data?.guides) {
          apiItems.push(...guidesRes.data.guides.map(g => ({
            id: g._id,
            name: g.username,
            category: 'Guide',
            rating: g.guideProfile?.rate || 5.0, 
            reviews: g.stats.reviewCount || 0,
            location: 'Iligan City',
            image: g.avatar || '',
            type: 'Guide' as const,
            isVerified: g.guideProfile?.isVerified
          })));
        }

        setItems([...hardcodedItems, ...apiItems]);
      } catch (error) {
        console.error("Error fetching directory data:", error);
        setItems(hardcodedItems);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const categories = ['All', 'Guide', 'Accommodation', 'Restaurants', 'Heritage', 'Activities', 'Market', 'Waterfall'];

  const filteredItems = items.filter(item => {
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory || (filterCategory === 'Restaurants' && item.category === 'Restaurant');
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header showBack title="Directory" />
      <div className="px-6 pt-20 animate-fade-slide-up">
        <div className="relative mb-6 animate-fade-slide-up">
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
          {categories.map((cat, index) => (
                <button 
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border animate-fade-slide-up ${
                        filterCategory === cat 
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-gray-200 hover:border-sky-300'
                    }`}
              style={{ animationDelay: `${index * 60}ms` }}
                >
                    {cat}
                </button>
            ))}
        </div>

        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            </div>
          ) : filteredItems.length > 0 ? filteredItems.map((item, index) => (
            <div 
                key={`${item.type}-${item.id}`} 
                onClick={() => {
                    if (item.type === 'Guide') {
                        navigate(`/guide/${item.id}`);
                    } else {
                        navigate(`/attraction/${item.id}`);
                    }
                }}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer animate-fade-slide-up"
            style={{ animationDelay: `${index * 70}ms` }}
            >
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-20 h-20 rounded-xl object-cover bg-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/100/100?random=' + item.id }} 
              />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{item.name}</h3>
                      {item.isVerified && (
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    {item.type === 'Guide' && (
                        <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">GUIDE</span>
                    )}
                </div>
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
             <div className="text-center py-10 text-slate-400 animate-fade-slide-up">
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