
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { ScanLine, Clock, MapPin, User, Info, Ticket, Star } from 'lucide-react';
import { getMedia } from '../data/mediaLibrary';
import { attractionsApi, businessesApi, reviewsApi, Attraction, Business, Review } from '../services/api';

const AttractionDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [remoteAttraction, setRemoteAttraction] = useState<Attraction | null>(null);
  const [remoteBusiness, setRemoteBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<{ averageRating: number; reviewCount: number } | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Expanded Data dictionary for Iligan Attractions & Businesses
  const attractionsData: Record<string, any> = {
    '1': {
      name: 'Maria Cristina Falls',
      location: 'Agus River, Brgy. Maria Cristina',
      description: "Known as the 'Twin Falls' due to the rock at the brink that separates the flow, it powers the Agus VI Hydroelectric Plant. It stands 320 feet tall and is the primary landmark of Iligan City.",
      image: getMedia('mariaCristinaFalls'),
      entranceFee: '₱50.00',
      shuttleFee: '₱10.00',
      hours: '8:00 AM – 4:00 PM',
      tips: 'Best viewed on weekends when the plant releases full water capacity.'
    },
    '2': {
      name: 'Paseo de Santiago',
      location: 'Barangay Santiago',
      description: "A popular seaside park known for the giant 'Iligan City' letters and the best sunset views in the city. It's a favorite hangout for locals to enjoy barbecue (sinugba) and live bands by the bay.",
      image: getMedia('paseoDeSantiago'),
      entranceFee: '₱20.00',
      shuttleFee: 'N/A',
      hours: '3:00 PM – 11:00 PM',
      tips: 'Come around 5:30 PM to catch the sunset behind the Iligan Bay.'
    },
    '3': {
      name: 'Tinago Falls',
      location: 'Deep Ravine, Brgy. Ditucalan',
      description: "True to its name 'Tinago' (Hidden), this waterfall requires descending about 500 winding steps. The effort is rewarded by a stunning blue-green lagoon perfect for swimming and bamboo rafting under the curtain of water.",
      image: getMedia('tinagoFalls'),
      entranceFee: '₱50.00',
      shuttleFee: '₱25.00 (Habal-habal)',
      hours: '7:00 AM – 5:00 PM',
      tips: 'Rent a life vest (required) and try the bamboo raft to go under the falls.'
    },
    '4': {
      name: 'Mimbalot Falls',
      location: 'Brgy. Buru-un',
      description: "Part of Iligan's Tourism Triangle, Mimbalot is the most accessible waterfall. It features natural rock formations and cascading waters suitable for a relaxing dip. The area is surrounded by picnic cottages and resorts.",
      image: getMedia('mimbalotFalls'),
      entranceFee: '₱50.00',
      shuttleFee: 'N/A',
      hours: '8:00 AM – 5:00 PM',
      tips: 'Great for picnics. Try the nearby Iligan Paradise Resort for ziplines.'
    },
    '6': {
      name: 'Macaraeg-Macapagal House',
      location: 'Timoga, Buru-un',
      description: "The ancestral house of two Philippine Presidents: Diosdado Macapagal (9th) and Gloria Macapagal-Arroyo (14th). It showcases memorabilia, antique furniture, and the history of the Macaraeg family in Iligan.",
      image: getMedia('macaraegHouse'),
      entranceFee: 'Donation',
      shuttleFee: 'N/A',
      hours: '8:00 AM – 5:00 PM',
      tips: 'Located along the highway, easily accessible by jeepney.'
    },
    '5': {
      name: 'Go Hotels Iligan',
      location: 'Robinson\'s Place, Iligan',
      description: "A modern, budget-friendly hotel located right next to Robinson's Place Iligan. Perfect for business travelers and tourists looking for comfortable and accessible accommodation.",
      image: getMedia('goHotels'),
      entranceFee: 'N/A',
      shuttleFee: 'N/A',
      hours: '24/7 Check-in',
      tips: 'Book online for better rates.'
    },
    '101': {
        name: "Cheding's Peanuts",
        location: "Quezon Ave.",
        description: "The pride of Iligan! Famous for their toasted peanuts which are roasted without oil. A must-buy pasalubong for anyone visiting the city.",
        image: getMedia('chedingsPeanuts'),
        entranceFee: 'Free',
        shuttleFee: 'N/A',
        hours: '8:00 AM - 6:00 PM',
        tips: 'Try their Spicy Peanuts.'
    },
    '102': {
        name: "Tita Fannies",
        location: "Zamora St.",
        description: "Famous for their Halang-halang (spicy beef soup) and Lechon Manok. A local favorite institution for affordable and delicious comfort food.",
        image: getMedia('titaFannies'),
        entranceFee: 'N/A',
        shuttleFee: 'N/A',
        hours: '7:00 AM - 9:00 PM',
        tips: 'Halang-halang is spicy! Have water ready.'
    },
    '201': {
        name: "Timoga Cold Springs",
        location: "Timoga, Buru-un",
        description: "A collection of swimming pools fed by icy-cold spring waters flowing from the mountains. Known for its pristine, non-chlorinated water.",
        image: getMedia('timogaSprings'),
        entranceFee: '₱100.00',
        shuttleFee: 'N/A',
        hours: '6:00 AM - 6:00 PM',
        tips: 'Bring food, corkage fees may apply but cottages are available.'
    }
  };

  const staticAttraction = useMemo(() => attractionsData[id || '1'] || attractionsData['1'], [id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await attractionsApi.getById(id);
        if (res.data?.attraction) {
          setRemoteAttraction(res.data.attraction);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        // continue to business lookup
      }

      try {
        const bizRes = await businessesApi.getById(id);
        if (bizRes.data?.business) {
          setRemoteBusiness(bizRes.data.business);
        }
      } catch (err) {
        // swallow and fall back to static
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Fetch reviews when we have a remote attraction or business
  useEffect(() => {
    const fetchReviews = async () => {
      const targetId = remoteAttraction?._id || remoteBusiness?._id;
      const targetType = remoteBusiness ? 'business' : 'attraction';
      if (!targetId) return;

      setIsLoadingReviews(true);
      try {
        const response = await reviewsApi.getByTarget(targetType, targetId, { limit: 10, offset: 0 });
        if (response.data) {
          setReviews(response.data.reviews || []);
          setReviewStats(response.data.stats || null);
        }
      } catch (err) {
        console.error('Failed to fetch reviews:', err);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [remoteAttraction, remoteBusiness]);

  const heroImage = useMemo(() => {
    if (remoteAttraction || remoteBusiness) {
      const primaryImage = remoteAttraction?.images?.[0]?.url || remoteBusiness?.images?.[0];
      const coverImage = remoteAttraction?.coverImage || remoteBusiness?.coverImage;
      const legacyFallback = remoteAttraction ? getMedia(remoteAttraction.legacyId || '') : getMedia(remoteBusiness?.legacyId || '');
      return primaryImage || coverImage || legacyFallback || getMedia('tinagoFalls');
    }
    return staticAttraction?.image || getMedia('tinagoFalls');
  }, [remoteAttraction, remoteBusiness, staticAttraction]);

  const galleryImages = useMemo(() => {
    if (remoteAttraction?.images?.length) {
      return remoteAttraction.images.map((img) => img.url).filter(Boolean);
    }
    if (remoteBusiness?.images?.length) {
      return remoteBusiness.images.filter(Boolean);
    }
    return [] as string[];
  }, [remoteAttraction, remoteBusiness]);

  const additionalImages = useMemo(() => {
    if (galleryImages.length <= 1) return [] as string[];
    return galleryImages.slice(1);
  }, [galleryImages]);

  const detailName = useMemo(() => {
    return remoteAttraction?.name || remoteBusiness?.name || staticAttraction?.name || 'Attraction';
  }, [remoteAttraction, remoteBusiness, staticAttraction]);

  const detailLocation = useMemo(() => {
    if (remoteAttraction) {
      return remoteAttraction.location?.barangay || remoteAttraction.location?.address || staticAttraction?.location;
    }
    if (remoteBusiness) {
      return remoteBusiness.location?.address;
    }
    return staticAttraction?.location;
  }, [remoteAttraction, remoteBusiness, staticAttraction]);

  const detailDescription = useMemo(() => {
    return remoteAttraction?.description || remoteBusiness?.description || staticAttraction?.description || '';
  }, [remoteAttraction, remoteBusiness, staticAttraction]);

  const isBusiness = !!remoteBusiness;

  const entranceFee = remoteAttraction?.visitorInfo?.fee || (staticAttraction as any)?.entranceFee || '';
  const transportInfo = remoteAttraction?.visitorInfo?.difficulty || (staticAttraction as any)?.shuttleFee || '';
  const operatingHours = remoteAttraction?.visitorInfo?.hours || (staticAttraction as any)?.hours || '';
  const visitTip = remoteAttraction?.visitorInfo?.bestTimeToVisit || (staticAttraction as any)?.tips || '';

  if (isLoading && !remoteAttraction && !remoteBusiness) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="Loading attraction" />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-sky-200 border-t-sky-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="relative h-80 overflow-hidden bg-slate-900 animate-gradient-pan">
      <img 
        src={heroImage} 
        alt={detailName}
        className="w-full h-full object-cover scale-105 opacity-90"
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/800/600?nature' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
      <div className="absolute inset-x-0 top-0 z-10 animate-fade-slide-up">
        <Header showBack transparent />
      </div>
      </div>

      <div className="bg-white -mt-8 rounded-t-3xl relative p-6 shadow-sm min-h-screen animate-fade-slide-up">
       <div className="flex flex-col items-center -mt-16 mb-4 animate-fade-slide-up motion-delay-50">
            <div className="bg-white p-2 rounded-xl shadow-md">
                <div className="w-16 h-16 bg-sky-100 rounded-lg flex items-center justify-center">
                    <MapPin className="text-sky-600" size={32} />
                </div>
            </div>
         </div>

      <h1 className="text-2xl font-bold text-slate-900 text-center mb-1 animate-fade-slide-up motion-delay-100">{detailName}</h1>
          <p className="text-center text-sky-600 font-medium text-sm mb-6 animate-fade-slide-up motion-delay-150">{detailLocation}</p>
         
         <p className="text-slate-600 leading-relaxed mb-6 text-sm text-justify animate-fade-slide-up motion-delay-200">
          {detailDescription}
        </p>

         {!isBusiness && (
         <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-100 shadow-sm animate-fade-slide-up motion-delay-250">
             <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
               <Info size={18} className="text-sky-600" />
               Visitor Information
             </h3>
             <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2"><Ticket size={14}/> Entrance Fee</span>
                <span className="font-bold text-slate-900">{entranceFee || '—'}</span>
              </div>
              {(transportInfo) && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2"><User size={14}/> Transport/Shuttle</span>
                <span className="font-bold text-slate-900">{transportInfo}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-slate-500 flex items-center gap-2"><Clock size={14}/> Operating Hours</span>
                <span className="font-bold text-slate-900">{operatingHours || '—'}</span>
              </div>
             </div>
               
             {(visitTip) && (
             <div className="mt-4 bg-sky-100 p-3 rounded-lg animate-float-pulse">
                 <p className="text-xs text-sky-800 font-medium">💡 Tip: {visitTip}</p>
               </div>
             )}
           </div>
         )}

         {additionalImages.length > 0 && (
            <div className="mb-8 animate-fade-slide-up motion-delay-275">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">Gallery</h3>
                <span className="text-xs text-slate-500">{galleryImages.length} photos</span>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {additionalImages.map((imgUrl, index) => (
                  <div key={`${imgUrl}-${index}`} className="min-w-[180px] h-28 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                    <img
                      src={imgUrl}
                      alt={`${detailName} photo ${index + 2}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300?nature'; }}
                    />
                  </div>
                ))}
              </div>
            </div>
         )}

         <button 
            onClick={() => navigate('/scan')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 mb-8 transition-colors animate-fade-slide-up motion-delay-300"
         >
            <ScanLine size={20} />
            Scan QR for History & Facts
         </button>

         {/* Reviews Section */}
         {(remoteAttraction || remoteBusiness) && (
           <div className="mb-8 animate-fade-slide-up motion-delay-325">
             <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-slate-900">Reviews</h3>
               {reviewStats && reviewStats.reviewCount > 0 && (
                 <div className="flex items-center gap-2">
                   <Star size={16} className="text-amber-500 fill-amber-500" />
                   <span className="font-bold text-slate-900">{reviewStats.averageRating.toFixed(1)}</span>
                   <span className="text-xs text-slate-500">({reviewStats.reviewCount})</span>
                 </div>
               )}
             </div>

             {isLoadingReviews ? (
               <div className="flex justify-center py-8">
                 <div className="animate-spin rounded-full h-8 w-8 border-4 border-sky-200 border-t-sky-600" />
               </div>
             ) : reviews.length === 0 ? (
               <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
                 <p className="text-sm text-slate-500 mb-3">No reviews yet</p>
                 <button
                   onClick={() => {
                     const reviewTargetId = remoteAttraction?._id || remoteBusiness?._id;
                     const reviewTargetType = remoteBusiness ? 'Business' : 'Attraction';
                     if (!reviewTargetId) return;
                     navigate(`/write-review?targetId=${encodeURIComponent(reviewTargetId)}&type=${encodeURIComponent(reviewTargetType)}`);
                   }}
                   className="text-sm font-medium text-sky-600 hover:text-sky-700"
                 >
                   Be the first to review
                 </button>
               </div>
             ) : (
               <div className="space-y-4">
                 {reviews.map((review) => {
                   const username = typeof review.userId === 'object' ? review.userId.username : 'User';
                   const avatar = typeof review.userId === 'object' ? review.userId.avatar : undefined;
                   return (
                     <div key={review._id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                       <div className="flex items-start gap-3 mb-2">
                         <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                           {avatar ? (
                             <img src={avatar} alt={username} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-400">
                               <User size={20} />
                             </div>
                           )}
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between mb-1">
                             <span className="font-medium text-slate-900 text-sm">{username}</span>
                             <div className="flex items-center gap-1">
                               {Array.from({ length: 5 }).map((_, i) => (
                                 <Star
                                   key={i}
                                   size={14}
                                   className={i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                                 />
                               ))}
                             </div>
                           </div>
                           {review.title && (
                             <p className="font-medium text-slate-800 text-sm mb-1">{review.title}</p>
                           )}
                           <p className="text-slate-600 text-sm leading-relaxed">{review.text}</p>
                           {review.images && review.images.length > 0 && (
                             <div className="flex gap-2 mt-2 overflow-x-auto">
                               {review.images.map((img, idx) => (
                                 <img
                                   key={idx}
                                   src={img}
                                   alt={`Review photo ${idx + 1}`}
                                   className="w-20 h-20 rounded-lg object-cover"
                                 />
                               ))}
                             </div>
                           )}
                           <p className="text-xs text-slate-400 mt-2">
                             {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                           </p>
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
           </div>
         )}

         {/* Guides */}
         <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900">Registered Guides</h3>
            <button 
                onClick={() => navigate('/directory')}
                className="text-xs text-sky-600 font-bold hover:underline"
            >
                See All
            </button>
         </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar mb-8 animate-carousel-glide">
          <GuideCard name="Alex Reyes" status="Available" img="https://picsum.photos/100/100?random=60" delayClass="motion-delay-50" />
          <GuideCard name="Sarah Labao" status="Available" img="https://picsum.photos/100/100?random=61" delayClass="motion-delay-100" />
          <GuideCard name="Mang Jose" status="On Tour" img="https://picsum.photos/100/100?random=62" delayClass="motion-delay-150" />
         </div>

         {/* Souvenirs */}
         <h3 className="font-bold text-slate-900 mb-4">Nearby & Pasalubong</h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar animate-carousel-glide">
          <StallCard name="Cheding's Peanuts" status="Must Buy" img={getMedia('chedingsPeanuts')} delayClass="motion-delay-50" />
          <StallCard name="Sukang Pinakurat" status="Local Vinegar" img={getMedia('sukangPinakurat')} delayClass="motion-delay-100" />
         </div>
      </div>
      
      {/* Floating Review Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
            onClick={() => {
              const reviewTargetId = remoteAttraction?._id || remoteBusiness?._id;
              const reviewTargetType = remoteBusiness ? 'Business' : 'Attraction';
              if (!reviewTargetId) return;
              navigate(
                `/write-review?targetId=${encodeURIComponent(reviewTargetId)}&type=${encodeURIComponent(reviewTargetType)}`
              );
            }}
          className="bg-sky-600 text-white p-4 rounded-full shadow-xl hover:bg-sky-700 transition-colors animate-marker-pop"
        >
            <span className="font-bold text-sm">Write Review</span>
        </button>
      </div>
    </div>
  );
};

const GuideCard = ({ name, status, img, delayClass = '' }: { name: string; status: string; img: string; delayClass?: string }) => (
  <div className={`flex flex-col items-center min-w-[100px] animate-fade-slide-up ${delayClass}`}>
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md mb-2">
            <img src={img} alt={name} className="w-full h-full object-cover" />
        </div>
        <span className="text-xs font-bold text-center text-slate-900 leading-tight">{name}</span>
        <span className={`text-[10px] ${status === 'Available' ? 'text-green-600' : 'text-orange-400'}`}>{status}</span>
    </div>
);

const StallCard = ({ name, status, img, delayClass = '' }: { name: string; status: string; img: string; delayClass?: string }) => (
  <div className={`min-w-[160px] animate-fade-slide-up ${delayClass}`}>
        <div className="h-32 rounded-xl overflow-hidden mb-2 bg-gray-200 border border-gray-100">
            <img src={img} alt={name} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).src='https://picsum.photos/200/200?shop'} />
        </div>
        <h4 className="font-bold text-sm text-slate-900">{name}</h4>
        <span className="text-xs text-sky-600 font-medium">{status}</span>
    </div>
);

export default AttractionDetail;
