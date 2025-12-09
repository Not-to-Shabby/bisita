import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Header from '../../components/Header';
import { 
  Calendar, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  ExternalLink,
  MapPin,
  Navigation
} from 'lucide-react';
import { eventsApi, Event } from '../../services/api';
import ImageUploader from '../../components/ImageUploader';

// Fix Leaflet default marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const ILIGAN_CENTER: [number, number] = [8.228, 124.245];

// ======================
// MAP PICKER COMPONENT
// ======================

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

const DraggableMarker: React.FC<{
  position: [number, number];
  onChange: (lat: number, lng: number) => void;
}> = ({ position, onChange }) => {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        onChange(lat, lng);
      }
    },
  };

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
};

const MapClickHandler: React.FC<{ onChange: (lat: number, lng: number) => void }> = ({ onChange }) => {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const MapPicker: React.FC<MapPickerProps> = ({ lat, lng, onChange }) => {
  const position: [number, number] = lat && lng ? [lat, lng] : ILIGAN_CENTER;
  const hasValidCoords = lat !== 0 && lng !== 0;

  return (
    <div className="relative h-64 rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={position}
        zoom={hasValidCoords ? 15 : 12}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onChange={onChange} />
        <MapRecenter center={position} />
        {hasValidCoords && (
          <DraggableMarker position={position} onChange={onChange} />
        )}
      </MapContainer>
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-slate-600">
        Click or drag marker to set location
      </div>
    </div>
  );
};

const AdminEvents: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    location: string;
    image: string;
    link: string;
    isActive: boolean;
    style: 'soft' | 'bold' | 'image';
    accentColor: string;
    textColor: string;
    backgroundColor: string;
    gradientFrom: string;
    gradientTo: string;
    badgeText: string;
    badgeEmoji: string;
    ctaLabel: string;
    overlayOpacity: number;
    textTheme: 'light' | 'dark';
    lat: number;
    lng: number;
  }>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    image: '',
    link: '',
    isActive: true,
    style: 'soft',
    accentColor: '#f97316',
    textColor: '#0f172a',
    backgroundColor: '#ffffff',
    gradientFrom: '',
    gradientTo: '',
    badgeText: 'Upcoming',
    badgeEmoji: '🎉',
    ctaLabel: 'View',
    overlayOpacity: 10,
    textTheme: 'light',
    lat: 0,
    lng: 0
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await eventsApi.getAll();
      if (res.data?.events) {
        setEvents(res.data.events);
      }
    } catch (err) {
      setError('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description,
        startDate: event.startDate.split('T')[0],
        endDate: event.endDate.split('T')[0],
        location: event.location,
        image: event.image,
        link: event.link,
        isActive: event.isActive,
        style: (event as Event & { style?: 'soft' | 'bold' | 'image' }).style || 'soft',
        accentColor: (event as Event & { accentColor?: string }).accentColor || '#f97316',
        textColor: (event as Event & { textColor?: string }).textColor || '#0f172a',
        backgroundColor: (event as Event & { backgroundColor?: string }).backgroundColor || '#ffffff',
        gradientFrom: (event as Event & { gradientFrom?: string }).gradientFrom || '',
        gradientTo: (event as Event & { gradientTo?: string }).gradientTo || '',
        badgeText: (event as Event & { badgeText?: string }).badgeText || 'Upcoming',
        badgeEmoji: (event as Event & { badgeEmoji?: string }).badgeEmoji || '🎉',
        ctaLabel: (event as Event & { ctaLabel?: string }).ctaLabel || 'View',
        overlayOpacity: (event as Event & { overlayOpacity?: number }).overlayOpacity ?? 10,
        textTheme: (event as Event & { textTheme?: 'light' | 'dark' }).textTheme || 'light',
        lat: event.coordinates?.lat || 0,
        lng: event.coordinates?.lng || 0
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        location: '',
        image: '',
        link: '',
        isActive: true,
        style: 'soft',
        accentColor: '#f97316',
        textColor: '#0f172a',
        backgroundColor: '#ffffff',
        gradientFrom: '',
        gradientTo: '',
        badgeText: 'Upcoming',
        badgeEmoji: '🎉',
        ctaLabel: 'View',
        overlayOpacity: 10,
        textTheme: 'light',
        lat: 0,
        lng: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload: Partial<Event> = {
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        location: formData.location,
        image: formData.image,
        link: formData.link,
        isActive: formData.isActive,
        style: formData.style,
        accentColor: formData.accentColor,
        textColor: formData.textColor,
        backgroundColor: formData.backgroundColor,
        gradientFrom: formData.gradientFrom,
        gradientTo: formData.gradientTo,
        badgeText: formData.badgeText,
        badgeEmoji: formData.badgeEmoji,
        ctaLabel: formData.ctaLabel,
        overlayOpacity: formData.overlayOpacity,
        textTheme: formData.textTheme,
        coordinates: (formData.lat !== 0 && formData.lng !== 0) ? {
          lat: formData.lat,
          lng: formData.lng
        } : undefined
      };

      if (editingEvent) {
        await eventsApi.update(editingEvent._id, payload);
      } else {
        await eventsApi.create(payload);
      }
      await fetchEvents();
      handleCloseModal();
    } catch (err) {
      setError('Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await eventsApi.delete(id);
      setEvents(events.filter(e => e._id !== id));
    } catch (err) {
      setError('Failed to delete event');
    }
  };

  const handleCoordinateChange = (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, lat, lng }));
  };

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return { label: 'Upcoming', chip: 'bg-orange-100 text-orange-700 border border-orange-200' };
    }

    if (now > end) {
      return { label: 'Past', chip: 'bg-gray-100 text-gray-600 border border-gray-200' };
    }

    return { label: 'Ongoing', chip: 'bg-green-100 text-green-700 border border-green-200' };
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header showBack title="Manage Events" />

      <div className="p-6 pt-20">
        <div className="flex justify-between items-center mb-6">
          <div className="relative flex-1 mr-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-sky-600 text-white p-2 rounded-xl hover:bg-sky-700 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map(event => (
              <div
                key={event._id}
                className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-orange-100 shadow-sm"
              >
                {event.image && (
                  <div className="absolute inset-0 opacity-15">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/800/400'; }}
                    />
                  </div>
                )}

                <div className="relative p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full ${getEventStatus(event.startDate, event.endDate).chip}`}>
                        {getEventStatus(event.startDate, event.endDate).label}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full border ${event.isActive ? 'bg-white/70 text-green-700 border-green-200' : 'bg-white/70 text-gray-500 border-gray-200'}`}>
                        {event.isActive ? 'Visible' : 'Hidden'}
                      </span>
                      {event.coordinates && (
                        <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                          <MapPin size={12} /> Map Pin
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {event.link && (
                        <a
                          href={event.link}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-sky-700 bg-white/70 hover:bg-white rounded-xl border border-sky-100"
                          aria-label="Open event link"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button
                        onClick={() => handleOpenModal(event)}
                        className="p-2 text-sky-700 bg-white/70 hover:bg-white rounded-xl border border-sky-100"
                        aria-label="Edit event"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(event._id)}
                        className="p-2 text-red-600 bg-white/70 hover:bg-white rounded-xl border border-red-100"
                        aria-label="Delete event"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{event.title}</h3>
                    <div className="text-slate-600 text-sm flex items-center gap-2">
                      <MapPin size={16} className="text-orange-500" />
                      <span>{event.location}</span>
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      <Calendar size={16} className="text-sky-600" />
                      <span>
                        {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {' · '}
                        {new Date(event.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {event.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                <p>No events found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-900">
                {editingEvent ? 'Edit Event' : 'New Event'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location Name</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., City Public Plaza"
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Card Style</label>
                <select
                  value={formData.style}
                  onChange={(e) => {
                    const newStyle = e.target.value as 'soft' | 'bold' | 'image';
                    setFormData(prev => ({ 
                      ...prev, 
                      style: newStyle,
                      gradientFrom: newStyle === 'bold' && !prev.gradientFrom ? '#f97316' : prev.gradientFrom,
                      gradientTo: newStyle === 'bold' && !prev.gradientTo ? '#fbbf24' : prev.gradientTo
                    }));
                  }}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                >
                  <option value="soft">Soft pastel (default)</option>
                  <option value="bold">Bold gradient</option>
                  <option value="image">Full image hero</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Controls how the event banner renders on the home screen.</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Appearance & Colors</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.accentColor}
                        onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                        className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                      />
                      <input 
                        type="text" 
                        value={formData.accentColor}
                        onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                        className="flex-1 p-2 text-sm rounded-lg border border-gray-200 uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.textColor}
                        onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                        className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                      />
                      <input 
                        type="text" 
                        value={formData.textColor}
                        onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                        className="flex-1 p-2 text-sm rounded-lg border border-gray-200 uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                        className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                      />
                      <input 
                        type="text" 
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                        className="flex-1 p-2 text-sm rounded-lg border border-gray-200 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {formData.style === 'bold' && (
                   <div className="grid grid-cols-2 gap-4 pt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Gradient Start</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.gradientFrom || '#f97316'}
                            onChange={(e) => setFormData({ ...formData, gradientFrom: e.target.value })}
                            className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                          />
                          <span className="text-xs text-gray-500">{formData.gradientFrom}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Gradient End</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.gradientTo || '#fbbf24'}
                            onChange={(e) => setFormData({ ...formData, gradientTo: e.target.value })}
                            className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                          />
                          <span className="text-xs text-gray-500">{formData.gradientTo}</span>
                        </div>
                      </div>
                   </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={formData.badgeText}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Badge Emoji</label>
                  <input
                    type="text"
                    value={formData.badgeEmoji}
                    onChange={(e) => setFormData({ ...formData, badgeEmoji: e.target.value })}
                    maxLength={4}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CTA Label</label>
                  <input
                    type="text"
                    value={formData.ctaLabel}
                    onChange={(e) => setFormData({ ...formData, ctaLabel: e.target.value })}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Image Overlay (for readability)</label>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={formData.overlayOpacity}
                    onChange={(e) => setFormData({ ...formData, overlayOpacity: Number(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">{formData.overlayOpacity}% overlay applied on the banner image.</p>
                </div>
              </div>

              {/* Map Picker */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  Map Location (Optional)
                </label>
                <MapPicker
                  lat={formData.lat}
                  lng={formData.lng}
                  onChange={handleCoordinateChange}
                />
                {formData.lat !== 0 && formData.lng !== 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    Selected: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">External Link (Optional)</label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="url"
                    value={formData.link}
                    onChange={e => setFormData({...formData, link: e.target.value})}
                    placeholder="https://..."
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Banner Image</label>
                <ImageUploader
                  folder="events"
                  maxFiles={1}
                  onUploadComplete={(urls) => setFormData({ ...formData, image: urls[0] || '' })}
                  existingImages={formData.image ? [formData.image] : []}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                  Active (Visible on Home Screen)
                </label>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 className="animate-spin" size={18} />}
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;
