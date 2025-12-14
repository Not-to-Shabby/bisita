import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Share2, 
  ExternalLink, 
  Clock,
  Navigation,
  Sparkles,
  Loader2,
  Download
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { eventsApi, Event } from '../services/api';

// Fix Leaflet marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  status: 'upcoming' | 'live' | 'ended';
}

const EventDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      const res = await eventsApi.getById(id);
      
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      
      if (res.data?.event) {
        setEvent(res.data.event);
      }
      
      setLoading(false);
    };
    
    fetchEvent();
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (!event) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const start = new Date(event.startDate).getTime();
      const end = new Date(event.endDate).getTime();

      let status: 'upcoming' | 'live' | 'ended' = 'upcoming';
      let targetTime = start;

      if (now >= end) {
        status = 'ended';
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, status });
        return;
      } else if (now >= start) {
        status = 'live';
        targetTime = end;
      }

      const difference = targetTime - now;
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds, status });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [event]);

  const handleShare = async () => {
    const shareData = {
      title: event?.title || 'Bisita Event',
      text: `Check out ${event?.title} on Bisita Iligan!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  const handleAddToCalendar = () => {
    if (!event) return;

    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`;

    window.open(calendarUrl, '_blank');
  };

  const handleGetDirections = () => {
    if (!event?.coordinates) return;
    const { lat, lng } = event.coordinates;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <p className="text-slate-600 mb-4">{error || 'Event not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl font-medium"
          aria-label="Go back"
          tabIndex={0}
        >
          Go Back
        </button>
      </div>
    );
  }

  const hasCoordinates = event.coordinates?.lat && event.coordinates?.lng;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Section */}
      <div className="relative h-72 md:h-96">
        {event.image ? (
          <>
            <img 
              src={event.image} 
              alt={event.title} 
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/800/600'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          </>
        ) : (
          <div 
            className="w-full h-full"
            style={{
              background: event.style === 'bold' && event.gradientFrom && event.gradientTo
                ? `linear-gradient(135deg, ${event.gradientFrom}, ${event.gradientTo})`
                : event.backgroundColor || '#f97316',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}
        
        <div className="absolute top-0 left-0 right-0 p-6 pt-12 flex justify-between items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="bg-white/20 backdrop-blur-md p-2 rounded-full hover:bg-white/30 transition-colors"
            aria-label="Go back"
            tabIndex={0}
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          <button 
            onClick={handleShare}
            className="bg-white/20 backdrop-blur-md p-2 rounded-full hover:bg-white/30 transition-colors relative"
            aria-label="Share event"
            tabIndex={0}
          >
            <Share2 size={24} className="text-white" />
            {shareSuccess && (
              <span className="absolute -bottom-8 right-0 text-xs bg-white text-slate-900 px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                Link copied!
              </span>
            )}
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <span 
              className="text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1 backdrop-blur-md"
              style={{ 
                backgroundColor: timeRemaining?.status === 'live' 
                  ? 'rgba(34, 197, 94, 0.85)' 
                  : timeRemaining?.status === 'ended' 
                    ? 'rgba(107, 114, 128, 0.85)' 
                    : 'rgba(59, 130, 246, 0.85)',
              }}
            >
              {event.badgeEmoji || '🎉'} {
                timeRemaining?.status === 'live' 
                  ? 'Live Now!' 
                  : timeRemaining?.status === 'ended' 
                    ? 'Event Ended' 
                    : event.badgeText || 'Upcoming'
              }
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-lg">{event.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-200">
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <span>{formatDate(event.startDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={16} />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mt-4 relative z-10 space-y-6">
        {/* Countdown Card */}
        {timeRemaining && timeRemaining.status !== 'ended' && (
          <div className="bg-white rounded-2xl p-6 shadow-xl mb-6 border border-gray-100 animate-fade-slide-up">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles size={20} className="text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">
                {timeRemaining.status === 'live' ? 'Event ends in' : 'Event starts in'}
              </h2>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-xl p-4 text-center border border-sky-100">
                <div className="text-3xl font-bold text-sky-600">{timeRemaining.days}</div>
                <div className="text-xs text-slate-600 font-medium mt-1">Days</div>
              </div>
              <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-xl p-4 text-center border border-sky-100">
                <div className="text-3xl font-bold text-sky-600">{timeRemaining.hours}</div>
                <div className="text-xs text-slate-600 font-medium mt-1">Hours</div>
              </div>
              <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-xl p-4 text-center border border-sky-100">
                <div className="text-3xl font-bold text-sky-600">{timeRemaining.minutes}</div>
                <div className="text-xs text-slate-600 font-medium mt-1">Mins</div>
              </div>
              <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-xl p-4 text-center border border-sky-100">
                <div className="text-3xl font-bold text-sky-600">{timeRemaining.seconds}</div>
                <div className="text-xs text-slate-600 font-medium mt-1">Secs</div>
              </div>
            </div>
          </div>
        )}

        {/* Event Ended Banner */}
        {timeRemaining?.status === 'ended' && (
          <div className="bg-amber-50 rounded-xl px-4 py-3 mb-6 text-amber-900 border border-amber-200 shadow-sm flex items-center gap-3">
            <Clock size={18} className="text-amber-500" />
            <div>
              <p className="text-sm font-bold">This event has ended</p>
              <p className="text-xs text-amber-700">Thanks to everyone who attended!</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleAddToCalendar}
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-slate-900 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm"
            aria-label="Add to calendar"
            tabIndex={0}
          >
            <Download size={18} />
            Add to Calendar
          </button>
          {hasCoordinates ? (
            <button
              onClick={handleGetDirections}
              className="flex items-center justify-center gap-2 bg-sky-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-sky-700 transition-colors shadow-sm"
              aria-label="Get directions"
              tabIndex={0}
            >
              <Navigation size={18} />
              Directions
            </button>
          ) : event.link ? (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-sky-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-sky-700 transition-colors shadow-sm"
            >
              <ExternalLink size={18} />
              {event.ctaLabel || 'View'}
            </a>
          ) : (
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-sky-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-sky-700 transition-colors shadow-sm"
              aria-label="Share event"
              tabIndex={0}
            >
              <Share2 size={18} />
              Share Event
            </button>
          )}
        </div>

        {/* Event Details */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Event Details</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Date & Time</p>
                <p className="font-semibold text-slate-900">{formatDate(event.startDate)}</p>
                <p className="text-sm text-slate-600">
                  {formatTime(event.startDate)} - {formatTime(event.endDate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Location</p>
                <p className="font-semibold text-slate-900">{event.location}</p>
                {hasCoordinates && (
                  <button
                    onClick={handleGetDirections}
                    className="text-sm text-sky-600 hover:underline mt-1"
                    tabIndex={0}
                    aria-label="View location on map"
                  >
                    View on map →
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Duration</p>
                <p className="font-semibold text-slate-900">
                  {(() => {
                    const start = new Date(event.startDate);
                    const end = new Date(event.endDate);
                    const diffHours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
                    const days = Math.floor(diffHours / 24);
                    const hours = diffHours % 24;
                    
                    if (days > 0) {
                      return `${days} ${days === 1 ? 'day' : 'days'}${hours > 0 ? ` ${hours}h` : ''}`;
                    }
                    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">About this Event</h2>
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        </div>

        {/* Map */}
        {hasCoordinates && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Location</h2>
            <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
              <MapContainer
                center={[event.coordinates!.lat, event.coordinates!.lng]}
                zoom={15}
                className="h-full w-full"
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[event.coordinates!.lat, event.coordinates!.lng]}>
                  <Popup>
                    <strong>{event.title}</strong>
                    <br />
                    {event.location}
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
            <button
              onClick={handleGetDirections}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-sky-600 text-white py-3 rounded-xl font-semibold hover:bg-sky-700 transition-colors"
              aria-label="Get directions to event"
              tabIndex={0}
            >
              <Navigation size={18} />
              Get Directions
            </button>
          </div>
        )}

        {/* External Link CTA */}
        {event.link && (
          <a
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all mb-6 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90 mb-1">Learn More</p>
                <p className="text-lg font-bold">{event.ctaLabel || 'Visit Event Page'}</p>
              </div>
              <ExternalLink size={24} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default EventDetail;
