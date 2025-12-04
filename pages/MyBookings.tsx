import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  MessageCircle
} from 'lucide-react';
import { bookingsApi, GuideBooking, Guide } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ======================
// BOOKING CARD COMPONENT
// ======================

interface BookingCardProps {
  booking: GuideBooking;
  onCancel?: (id: string) => void;
  isGuideView?: boolean;
  onUpdateStatus?: (id: string, status: GuideBooking['status']) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ 
  booking, 
  onCancel, 
  isGuideView = false,
  onUpdateStatus 
}) => {
  const navigate = useNavigate();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const statusConfig = {
    pending: { color: 'bg-amber-100 text-amber-700', label: 'Pending' },
    accepted: { color: 'bg-green-100 text-green-700', label: 'Confirmed' },
    declined: { color: 'bg-red-100 text-red-700', label: 'Declined' },
    completed: { color: 'bg-sky-100 text-sky-700', label: 'Completed' },
    cancelled: { color: 'bg-gray-100 text-gray-500', label: 'Cancelled' },
  };

  const status = statusConfig[booking.status] || statusConfig.pending;
  const guide = booking.guideId as Guide | undefined;
  const isPast = new Date(booking.date) < new Date();
  const canCancel = ['pending', 'accepted'].includes(booking.status) && !isPast;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
            {status.label}
          </span>
          <span className="text-sm text-slate-400">
            #{booking._id.slice(-6).toUpperCase()}
          </span>
        </div>

        {/* Guide info (for tourist view) */}
        {!isGuideView && guide && typeof guide === 'object' && (
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate(`/guide/${guide._id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate(`/guide/${guide._id}`);
            }}
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
              {guide.avatar ? (
                <img
                  src={guide.avatar}
                  alt={guide.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {guide.username.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">{guide.username}</h3>
              <p className="text-sm text-slate-500">Tour Guide</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="w-4 h-4 text-sky-600" />
          <span className="text-slate-700">{formatDate(booking.date)}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Clock className="w-4 h-4 text-sky-600" />
          <span className="text-slate-700">
            {formatTime(booking.startTime)} · {booking.duration} hours
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Users className="w-4 h-4 text-sky-600" />
          <span className="text-slate-700">{booking.groupSize} person{booking.groupSize !== 1 ? 's' : ''}</span>
        </div>
        {booking.notes && (
          <div className="flex items-start gap-3 text-sm">
            <MessageCircle className="w-4 h-4 text-sky-600 mt-0.5" />
            <span className="text-slate-500 italic">"{booking.notes}"</span>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
        <span className="text-sm text-slate-500">Total</span>
        <span className="text-lg font-bold text-sky-600">
          ₱{booking.totalPrice.toLocaleString()}
        </span>
      </div>

      {/* Actions */}
      {(canCancel || (isGuideView && booking.status === 'pending')) && (
        <div className="p-4 border-t border-gray-100">
          {!isGuideView && canCancel && !showCancelConfirm && (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="w-full py-2 text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
            >
              Cancel Booking
            </button>
          )}

          {!isGuideView && showCancelConfirm && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 text-center mb-2">
                Are you sure you want to cancel?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2 bg-gray-100 text-slate-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  No, Keep It
                </button>
                <button
                  type="button"
                  onClick={() => onCancel?.(booking._id)}
                  className="flex-1 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          )}

          {isGuideView && booking.status === 'pending' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUpdateStatus?.(booking._id, 'declined')}
                className="flex-1 py-2 bg-gray-100 text-slate-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                Decline
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus?.(booking._id, 'accepted')}
                className="flex-1 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                Accept
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ======================
// MAIN PAGE COMPONENT
// ======================

const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [bookings, setBookings] = useState<GuideBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const isGuide = user?.role === 'guide';

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = isGuide 
          ? await bookingsApi.getAsGuide() 
          : await bookingsApi.getMine();

        if (response.data?.bookings) {
          setBookings(response.data.bookings);
        } else if (response.error) {
          setError(response.error);
        }
      } catch (err) {
        setError('Failed to load bookings');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated, isGuide]);

  const handleCancel = async (bookingId: string) => {
    try {
      const response = await bookingsApi.cancel(bookingId);
      if (response.data?.booking) {
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? response.data!.booking : b))
        );
      }
    } catch (err) {
      setError('Failed to cancel booking');
    }
  };

  const handleUpdateStatus = async (bookingId: string, status: GuideBooking['status']) => {
    try {
      const response = await bookingsApi.updateStatus(bookingId, status);
      if (response.data?.booking) {
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? response.data!.booking : b))
        );
      }
    } catch (err) {
      setError('Failed to update booking');
    }
  };

  // Filter bookings
  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b) => new Date(b.date) >= now && !['cancelled', 'declined', 'completed'].includes(b.status)
  );
  const pastBookings = bookings.filter(
    (b) => new Date(b.date) < now || ['cancelled', 'declined', 'completed'].includes(b.status)
  );

  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header showBack title={isGuide ? 'Booking Requests' : 'My Bookings'} />

      <div className="pt-20">
        {/* Tabs */}
        <div className="bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`pb-2 text-sm font-medium transition-colors ${
                activeTab === 'upcoming'
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-slate-500'
              }`}
            >
              Upcoming ({upcomingBookings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`pb-2 text-sm font-medium transition-colors ${
                activeTab === 'past'
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-slate-500'
              }`}
            >
              Past ({pastBookings.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            </div>
          )}

          {/* Bookings List */}
          {!isLoading && (
            <div className="space-y-4">
              {displayedBookings.length > 0 ? (
                displayedBookings.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    onCancel={handleCancel}
                    isGuideView={isGuide}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">
                    {activeTab === 'upcoming'
                      ? 'No upcoming bookings'
                      : 'No past bookings'}
                  </p>
                  {!isGuide && activeTab === 'upcoming' && (
                    <button
                      onClick={() => navigate('/guides')}
                      className="px-6 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 transition-colors"
                    >
                      Find a Guide
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default MyBookings;
