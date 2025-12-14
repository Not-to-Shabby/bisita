import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { 
  Star, 
  Globe, 
  BadgeCheck, 
  Loader2, 
  Phone,
  MessageCircle,
  Calendar,
  Clock,
  Users,
  MapPin,
  ChevronRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { guidesApi, bookingsApi, attractionsApi, Guide, Attraction } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ======================
// FALLBACK DATA
// ======================

const fallbackGuide: Guide = {
  _id: '1',
  username: 'Juan dela Cruz',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  guideProfile: {
    bio: 'Born and raised in Iligan City. I\'ve been exploring the waterfalls since childhood and love sharing the hidden gems with visitors. I know all the best spots for photography, swimming, and experiencing the natural beauty of our city. Let me show you the real Iligan!',
    languages: ['English', 'Filipino', 'Bisaya'],
    specialties: ['Waterfalls', 'Nature Trails', 'Photography Tours', 'Adventure'],
    rate: 500,
    status: 'available',
    isVerified: true,
    phone: '+63 912 345 6789',
    messenger: 'juan.delacruz',
  },
  stats: { reviewCount: 0 },
};

// ======================
// BOOKING MODAL COMPONENT
// ======================

interface BookingModalProps {
  guide: Guide;
  attractions: Attraction[];
  onClose: () => void;
  onSuccess: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ guide, attractions, onClose, onSuccess }) => {
  const [selectedAttractions, setSelectedAttractions] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(4);
  const [groupSize, setGroupSize] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseRate = guide.guideProfile?.rate || 500;
  const totalPrice = baseRate * duration * (groupSize > 4 ? 1.5 : 1);

  const handleAttractionToggle = (id: string) => {
    setSelectedAttractions((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedAttractions.length === 0) {
      setError('Please select at least one destination');
      return;
    }
    if (!date) {
      setError('Please select a date');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await bookingsApi.create({
        guideId: guide._id,
        attractionIds: selectedAttractions,
        date,
        startTime,
        duration,
        groupSize,
        notes: notes || undefined,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl animate-fade-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Book {guide.username}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Destinations */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Select Destinations *
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {attractions.map((attraction) => (
                <label
                  key={attraction._id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedAttractions.includes(attraction._id)
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAttractions.includes(attraction._id)}
                    onChange={() => handleAttractionToggle(attraction._id)}
                    className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">{attraction.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              <Calendar className="w-4 h-4 inline mr-1" />
              Tour Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={minDateStr}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                <Clock className="w-4 h-4 inline mr-1" />
                Start Time
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="06:00">6:00 AM</option>
                <option value="07:00">7:00 AM</option>
                <option value="08:00">8:00 AM</option>
                <option value="09:00">9:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="13:00">1:00 PM</option>
                <option value="14:00">2:00 PM</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={2}>2 hours</option>
                <option value={4}>4 hours (Half day)</option>
                <option value={8}>8 hours (Full day)</option>
              </select>
            </div>
          </div>

          {/* Group Size */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              <Users className="w-4 h-4 inline mr-1" />
              Group Size
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-slate-600 hover:bg-gray-200"
              >
                −
              </button>
              <span className="text-xl font-bold text-slate-900 w-12 text-center">{groupSize}</span>
              <button
                type="button"
                onClick={() => setGroupSize(Math.min(10, groupSize + 1))}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-slate-600 hover:bg-gray-200"
              >
                +
              </button>
              <span className="text-sm text-slate-500">
                {groupSize > 4 && '(+50% for large groups)'}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Special Requests
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requirements or requests..."
              className="w-full h-24 px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {/* Price Summary */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600">Base rate (₱{baseRate}/hr × {duration}hrs)</span>
              <span className="font-medium">₱{(baseRate * duration).toLocaleString()}</span>
            </div>
            {groupSize > 4 && (
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-slate-500">Large group surcharge (+50%)</span>
                <span>+₱{((baseRate * duration) * 0.5).toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="font-bold text-slate-900">Total</span>
              <span className="text-xl font-bold text-sky-600">₱{totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Booking...
              </>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ======================
// MAIN PAGE COMPONENT
// ======================

const GuideDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [guide, setGuide] = useState<Guide | null>(null);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Fetch guide and attractions
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const [guideRes, attractionsRes] = await Promise.all([
          guidesApi.getById(id),
          attractionsApi.getAll(),
        ]);

        if (guideRes.data?.guide) {
          setGuide(guideRes.data.guide);
        } else {
          // Use fallback
          setGuide(fallbackGuide);
        }

        if (attractionsRes.data?.attractions) {
          setAttractions(attractionsRes.data.attractions);
        }
      } catch (error) {
        setGuide(fallbackGuide);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleBookClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/guide/${id}` } });
      return;
    }
    setShowBookingModal(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingModal(false);
    setBookingSuccess(true);
  };

  const statusColors = {
    available: 'bg-green-100 text-green-700',
    on_tour: 'bg-amber-100 text-amber-700',
    unavailable: 'bg-gray-100 text-gray-500',
  };

  const statusLabels = {
    available: 'Available for booking',
    on_tour: 'Currently on tour',
    unavailable: 'Not available',
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="Guide Profile" />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      </div>
    );
  }

  // Not found
  if (!guide) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="Guide Profile" />
        <div className="p-6 pt-24 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Guide Not Found</h2>
          <button
            onClick={() => navigate('/guides')}
            className="px-6 py-2 bg-sky-600 text-white rounded-lg font-medium"
          >
            Browse Guides
          </button>
        </div>
      </div>
    );
  }

  // Booking success
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="Booking Confirmed" />
        <div className="p-6 pt-24 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Booking Submitted!</h2>
          <p className="text-slate-600 mb-6">
            Your booking request has been sent to {guide.username}. 
            They will confirm or respond within 24 hours.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/profile')}
              className="w-full py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-colors"
            >
              View My Bookings
            </button>
            <button
              onClick={() => navigate('/guides')}
              className="w-full py-3 bg-gray-100 text-slate-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Browse More Guides
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <Header showBack title="Guide Profile" />

      {/* Hero Section */}
      <div className="bg-white pt-20 pb-6 px-6">
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg">
              {guide.avatar ? (
                <img
                  src={guide.avatar}
                  alt={guide.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/300/300';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {guide.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {guide.guideProfile?.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                <BadgeCheck className="w-6 h-6 text-sky-500" />
              </div>
            )}
          </div>

          {/* Name & Status */}
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{guide.username}</h1>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[guide.guideProfile?.status || 'unavailable']}`}>
            {statusLabels[guide.guideProfile?.status || 'unavailable']}
          </span>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4">
            {guide.stats?.reviewCount && guide.stats.reviewCount > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-medium text-slate-900">{guide.stats.reviewCount}</span>
                <span className="text-slate-500 text-sm">reviews</span>
              </div>
            )}
            {guide.guideProfile?.languages && (
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 text-sm">
                  {guide.guideProfile.languages.length} languages
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Bio */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-slate-900 mb-2">About</h3>
          <p className="text-slate-600 leading-relaxed">{guide.guideProfile?.bio}</p>
        </div>

        {/* Languages */}
        {guide.guideProfile?.languages && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-slate-900 mb-3">
              <Globe className="w-4 h-4 inline mr-2" />
              Languages
            </h3>
            <div className="flex flex-wrap gap-2">
              {guide.guideProfile.languages.map((lang, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-gray-100 text-slate-700 rounded-full text-sm"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Specialties */}
        {guide.guideProfile?.specialties && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-slate-900 mb-3">
              <MapPin className="w-4 h-4 inline mr-2" />
              Tour Specialties
            </h3>
            <div className="flex flex-wrap gap-2">
              {guide.guideProfile.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-full text-sm"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(guide.guideProfile?.phone || guide.guideProfile?.messenger) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-slate-900 mb-3">Contact</h3>
            <div className="space-y-3">
              {guide.guideProfile?.phone && (
                <a
                  href={`tel:${guide.guideProfile.phone}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Phone className="w-5 h-5 text-sky-600" />
                  <span className="text-slate-700">{guide.guideProfile.phone}</span>
                  <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                </a>
              )}
              {guide.guideProfile?.messenger && (
                <a
                  href={`https://m.me/${guide.guideProfile.messenger}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-sky-600" />
                  <span className="text-slate-700">Messenger</span>
                  <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl p-6 text-white">
          <h3 className="font-bold mb-2">Tour Rate</h3>
          <div className="text-3xl font-bold mb-1">
            ₱{(guide.guideProfile?.rate || 500).toLocaleString()}
            <span className="text-lg font-normal opacity-80">/hour</span>
          </div>
          <p className="text-sm opacity-80">
            Minimum 2 hours. Rates may vary for large groups or special tours.
          </p>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <button
          type="button"
          onClick={handleBookClick}
          disabled={guide.guideProfile?.status === 'unavailable'}
          className="w-full py-4 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {guide.guideProfile?.status === 'unavailable'
            ? 'Currently Unavailable'
            : `Book ${guide.username}`}
        </button>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          guide={guide}
          attractions={attractions}
          onClose={() => setShowBookingModal(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
};

export default GuideDetail;
