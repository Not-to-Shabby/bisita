import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import Header from '../../components/Header';
import ImageUploader from '../../components/ImageUploader';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2,
  AlertCircle,
  X,
  MapPin,
  Star,
  Check,
  Store,
  Phone,
  Mail,
  Globe,
  BadgeCheck,
  Clock,
  Filter,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { businessesApi, Business, attractionsApi, Attraction, OsmBusinessPlace } from '../../services/api';
import 'leaflet/dist/leaflet.css';

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

// Iligan City center
const ILIGAN_CENTER: [number, number] = [8.228, 124.245];

// Transport segment options
const TRANSPORT_SEGMENTS = ['Jeepney', 'Tricycle', 'Habal-habal', 'Walk', 'Bus'] as const;
type TransportSegment = typeof TRANSPORT_SEGMENTS[number];

// ======================
// MULTI-SELECT COMPONENT
// ======================

interface MultiSelectProps {
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, label }) => {
  const handleToggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-2 block">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleToggle(option)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
              }`}
              aria-label={`Toggle ${option}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};

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
    <div className="relative h-48 rounded-xl overflow-hidden border border-gray-200">
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

// Business type options
const BUSINESS_TYPES = [
  { value: 'accommodation', label: 'Accommodation', icon: '🏨' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'activity', label: 'Activity', icon: '🎯' },
  { value: 'guide_service', label: 'Guide Service', icon: '🧭' },
  { value: 'shop', label: 'Shop', icon: '🛍️' },
  { value: 'transport', label: 'Transport', icon: '🚐' },
] as const;

type BusinessType = typeof BUSINESS_TYPES[number]['value'];

const getTypeLabel = (type: string): string => {
  return BUSINESS_TYPES.find(t => t.value === type)?.label || type;
};

const getTypeIcon = (type: string): string => {
  return BUSINESS_TYPES.find(t => t.value === type)?.icon || '🏢';
};

// ======================
// BUSINESS FORM MODAL
// ======================

interface BusinessFormProps {
  business?: Business | null;
  attractions: Attraction[];
  onClose: () => void;
  onSave: (data: Partial<Business>) => Promise<void>;
}

const BusinessForm: React.FC<BusinessFormProps> = ({ business, attractions, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: business?.name || '',
    type: (business?.type || 'restaurant') as BusinessType,
    tagline: business?.tagline || '',
    description: business?.description || '',
    images: business?.images || [],
    address: business?.location?.address || '',
    lat: business?.location?.coordinates?.lat || 0,
    lng: business?.location?.coordinates?.lng || 0,
    phone: business?.contact?.phone || '',
    email: business?.contact?.email || '',
    website: business?.contact?.website || '',
    facebook: business?.contact?.facebook || '',
    messenger: business?.contact?.messenger || '',
    nearAttractionIds: business?.nearAttractionIds || [],
    isVerified: business?.isVerified || false,
    isFeatured: business?.isFeatured || false,
    status: business?.status || 'pending',
    // Transport fields
    transportVehicle: business?.transport?.vehicle || '',
    transportRoute: business?.transport?.route || '',
    transportDuration: business?.transport?.duration || '',
    transportFareRegular: business?.transport?.fares?.regular || '',
    transportFareDiscounted: business?.transport?.fares?.discounted || '',
    transportFareHabal: business?.transport?.fares?.habal || '',
    transportSegments: (business?.transport?.segments || []) as TransportSegment[],
    transportNote: business?.transport?.note || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'location' | 'transport'>('basic');

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }
    if (!formData.address.trim()) {
      setError('Address is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        name: formData.name,
        type: formData.type,
        tagline: formData.tagline,
        description: formData.description,
        images: formData.images,
        location: {
          address: formData.address,
          coordinates: formData.lat && formData.lng ? {
            lat: formData.lat,
            lng: formData.lng,
          } : undefined,
        },
        contact: {
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          facebook: formData.facebook,
          messenger: formData.messenger,
        },
        transport: {
          vehicle: formData.transportVehicle,
          route: formData.transportRoute,
          duration: formData.transportDuration,
          fares: {
            regular: formData.transportFareRegular,
            discounted: formData.transportFareDiscounted,
            habal: formData.transportFareHabal,
          },
          segments: formData.transportSegments,
          note: formData.transportNote,
        },
        nearAttractionIds: formData.nearAttractionIds,
        isVerified: formData.isVerified,
        isFeatured: formData.isFeatured,
        status: formData.status as 'active' | 'pending' | 'suspended',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImagesChange = (urls: string[]) => {
    setFormData(prev => ({ ...prev, images: urls }));
  };

  const handleAttractionToggle = (attractionId: string) => {
    setFormData(prev => {
      const isSelected = prev.nearAttractionIds.includes(attractionId);
      return {
        ...prev,
        nearAttractionIds: isSelected
          ? prev.nearAttractionIds.filter(id => id !== attractionId)
          : [...prev.nearAttractionIds, attractionId],
      };
    });
  };

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info' },
    { id: 'contact' as const, label: 'Contact' },
    { id: 'location' as const, label: 'Location' },
    { id: 'transport' as const, label: 'Transport' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-900">
            {business ? 'Edit Business' : 'Add Business'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="sticky top-[60px] bg-white border-b border-gray-100 px-4 z-10">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Business Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="e.g., Cheding's Peanuts"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Business Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BUSINESS_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                      className={`p-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                        formData.type === type.value
                          ? 'bg-sky-600 text-white'
                          : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="e.g., Iligan's #1 Pasalubong since 1974!"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  placeholder="Describe the business..."
                />
              </div>

              {/* Images */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Images</label>
                <ImageUploader
                  folder="businesses"
                  maxFiles={10}
                  onUploadComplete={handleImagesChange}
                  existingImages={formData.images}
                />
              </div>

              {/* Status & Verification (Admin only) */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Admin Controls</h4>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVerified}
                      onChange={(e) => setFormData(prev => ({ ...prev, isVerified: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm text-slate-700">Verified</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm text-slate-700">Featured</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="+63 917 123 4567"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="contact@business.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="https://www.example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Facebook Page</label>
                  <input
                    type="url"
                    value={formData.facebook}
                    onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Messenger</label>
                  <input
                    type="text"
                    value={formData.messenger}
                    onChange={(e) => setFormData(prev => ({ ...prev, messenger: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="m.me/username"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Quezon Ave, Iligan City"
                />
              </div>

              {/* Map Picker */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location on Map
                </label>
                <MapPicker
                  lat={formData.lat}
                  lng={formData.lng}
                  onChange={(lat, lng) => setFormData(prev => ({ ...prev, lat, lng }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lat: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="8.228"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lng: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="124.245"
                  />
                </div>
              </div>

              {/* Near Attractions */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Show Near Attractions (for proximity ads)
                </label>
                <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-y-auto">
                  {attractions.length === 0 ? (
                    <p className="text-sm text-slate-500">No attractions available</p>
                  ) : (
                    <div className="space-y-2">
                      {attractions.map(attraction => {
                        const isSelected = formData.nearAttractionIds.includes(attraction._id);
                        return (
                          <label 
                            key={attraction._id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleAttractionToggle(attraction._id)}
                              className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                            />
                            <span className="text-sm text-slate-700">{attraction.name}</span>
                            <span className="text-xs text-slate-400">{attraction.category}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transport Tab */}
          {activeTab === 'transport' && (
            <div className="space-y-4">
              {/* Transport Segments Multi-select */}
              <MultiSelect
                options={TRANSPORT_SEGMENTS}
                selected={formData.transportSegments}
                onChange={(selected) => setFormData(prev => ({ 
                  ...prev, 
                  transportSegments: selected as TransportSegment[] 
                }))}
                label="Transport Modes Used"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Primary Vehicle</label>
                  <input
                    type="text"
                    value={formData.transportVehicle}
                    onChange={(e) => setFormData(prev => ({ ...prev, transportVehicle: e.target.value }))}
                    placeholder="e.g., Jeepney"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Primary transport vehicle"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Travel Duration</label>
                  <input
                    type="text"
                    value={formData.transportDuration}
                    onChange={(e) => setFormData(prev => ({ ...prev, transportDuration: e.target.value }))}
                    placeholder="e.g., 30 mins"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Travel duration"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Route Description</label>
                <textarea
                  value={formData.transportRoute}
                  onChange={(e) => setFormData(prev => ({ ...prev, transportRoute: e.target.value }))}
                  rows={2}
                  placeholder="e.g., Take a jeepney from Tambo Terminal..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  aria-label="Route description"
                />
              </div>

              {/* Fares */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Fare Information</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Regular Fare</label>
                    <input
                      type="text"
                      value={formData.transportFareRegular}
                      onChange={(e) => setFormData(prev => ({ ...prev, transportFareRegular: e.target.value }))}
                      placeholder="₱15"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                      aria-label="Regular fare"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Discounted</label>
                    <input
                      type="text"
                      value={formData.transportFareDiscounted}
                      onChange={(e) => setFormData(prev => ({ ...prev, transportFareDiscounted: e.target.value }))}
                      placeholder="₱12"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                      aria-label="Discounted fare"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Habal-habal</label>
                    <input
                      type="text"
                      value={formData.transportFareHabal}
                      onChange={(e) => setFormData(prev => ({ ...prev, transportFareHabal: e.target.value }))}
                      placeholder="₱50"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                      aria-label="Habal-habal fare"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Additional Notes</label>
                <textarea
                  value={formData.transportNote}
                  onChange={(e) => setFormData(prev => ({ ...prev, transportNote: e.target.value }))}
                  rows={2}
                  placeholder="e.g., Tell the driver you're going to..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  aria-label="Transport notes"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-slate-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-sky-600 text-white font-medium rounded-xl hover:bg-sky-700 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {business ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ======================
// OSM DISCOVERY MODAL
// ======================

interface OsmDiscoveryModalProps {
  onClose: () => void;
  onImported: () => void;
}

const OsmDiscoveryModal: React.FC<OsmDiscoveryModalProps> = ({ onClose, onImported }) => {
  const [osmPlaces, setOsmPlaces] = useState<OsmBusinessPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [filterQuery, setFilterQuery] = useState('');
  const [showOnlyNew, setShowOnlyNew] = useState(true);

  useEffect(() => {
    const fetchOsmPlaces = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await businessesApi.discoverOsmPlaces();
        if (response.error) {
          setError(response.error);
        } else if (response.data?.places) {
          setOsmPlaces(response.data.places);
        }
      } catch (err) {
        setError('Failed to fetch OSM places');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOsmPlaces();
  }, []);

  const handleImport = async (place: OsmBusinessPlace) => {
    setImportingIds(prev => new Set(prev).add(place.osmId));
    try {
      const response = await businessesApi.importOsmPlace({
        osmId: place.osmId,
        name: place.name,
        type: place.type,
        lat: place.lat,
        lng: place.lng,
        description: place.description,
        address: place.address,
        phone: place.phone,
        website: place.website,
      });

      if (response.error) {
        setError(response.error);
      } else {
        setImportedIds(prev => new Set(prev).add(place.osmId));
        onImported();
      }
    } catch (err) {
      setError('Failed to import business');
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev);
        next.delete(place.osmId);
        return next;
      });
    }
  };

  const filteredPlaces = osmPlaces.filter(place => {
    const matchesQuery = place.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      place.type.toLowerCase().includes(filterQuery.toLowerCase());
    const isNew = !place.alreadyExists && !importedIds.has(place.osmId);
    return matchesQuery && (showOnlyNew ? isNew : true);
  });

  const newCount = osmPlaces.filter(p => !p.alreadyExists && !importedIds.has(p.osmId)).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Discover Businesses from OSM
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Import restaurants, hotels, shops from OpenStreetMap
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-100 p-4 flex gap-3 items-center bg-gray-50">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter businesses..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
              aria-label="Filter businesses"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              checked={showOnlyNew}
              onChange={(e) => setShowOnlyNew(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm text-slate-700 whitespace-nowrap">New only ({newCount})</span>
          </label>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-3" />
              <p className="text-slate-600">Discovering businesses from OpenStreetMap...</p>
              <p className="text-xs text-slate-400 mt-1">This may take a few seconds</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No new businesses found</p>
              <p className="text-sm text-slate-400 mt-1">All OSM businesses are already in your database</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlaces.map(place => {
                const isImporting = importingIds.has(place.osmId);
                const isImported = importedIds.has(place.osmId);
                const alreadyExists = place.alreadyExists;

                return (
                  <div
                    key={place.osmId}
                    className={`bg-white rounded-xl p-4 border ${
                      alreadyExists || isImported 
                        ? 'border-gray-200 bg-gray-50 opacity-60' 
                        : 'border-gray-100 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 truncate">{place.name}</h3>
                          {(alreadyExists || isImported) && (
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              {isImported ? 'Imported' : 'Exists'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium capitalize">{place.displayType || place.type}</span>
                          <span>•</span>
                          <span className="text-xs">{place.lat.toFixed(4)}, {place.lng.toFixed(4)}</span>
                        </div>
                        {place.address && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {place.address}
                          </p>
                        )}
                        {place.phone && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {place.phone}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleImport(place)}
                        disabled={isImporting || isImported || alreadyExists}
                        className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
                          isImported || alreadyExists
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-sky-600 text-white hover:bg-sky-700 disabled:bg-gray-300'
                        }`}
                        aria-label={`Import ${place.name}`}
                      >
                        {isImporting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isImported || alreadyExists ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        {isImporting ? 'Importing...' : isImported ? 'Imported' : alreadyExists ? 'Exists' : 'Import'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex justify-between items-center">
          <p className="text-sm text-slate-500">
            {osmPlaces.length} total • {newCount} new
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-slate-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ======================
// MAIN PAGE
// ======================

const AdminBusinesses: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showOsmDiscovery, setShowOsmDiscovery] = useState(false);

  // Fetch businesses and attractions
  const fetchData = useCallback(async () => {
    try {
      const [businessResponse, attractionResponse] = await Promise.all([
        businessesApi.getAllAdmin(),
        attractionsApi.getAll(),
      ]);

      if (businessResponse.data?.businesses) {
        setBusinesses(businessResponse.data.businesses);
      } else if (businessResponse.error) {
        setError(businessResponse.error);
      }

      if (attractionResponse.data?.attractions) {
        setAttractions(attractionResponse.data.attractions);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter businesses
  const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || b.type === filterType;
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Handlers
  const handleCreate = async (data: Partial<Business>) => {
    const response = await businessesApi.create(data);
    if (response.error) throw new Error(response.error);
    await fetchData();
  };

  const handleUpdate = async (data: Partial<Business>) => {
    if (!editingBusiness) return;
    const response = await businessesApi.update(editingBusiness._id, data);
    if (response.error) throw new Error(response.error);
    await fetchData();
    setEditingBusiness(null);
  };

  const handleDelete = async (id: string) => {
    const response = await businessesApi.delete(id);
    if (response.error) {
      setError(response.error);
      return;
    }
    setBusinesses(prev => prev.filter(b => b._id !== id));
    setDeleteConfirm(null);
    setSuccessMessage('Business deleted successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleToggleVerify = async (business: Business) => {
    setTogglingId(business._id);
    setError(null);
    try {
      const response = await businessesApi.verify(business._id, !business.isVerified);
      if (response.error) {
        setError(response.error);
      } else {
        setSuccessMessage(`Business ${!business.isVerified ? 'verified' : 'unverified'} successfully`);
        await fetchData();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to update verification status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleActive = async (business: Business) => {
    setTogglingId(business._id);
    setError(null);
    try {
      const response = await businessesApi.update(business._id, { isActive: !business.isActive });
      if (response.error) {
        setError(response.error);
      } else {
        setSuccessMessage(`Business ${!business.isActive ? 'shown on map' : 'hidden from map'}`);
        await fetchData();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to update map visibility');
    } finally {
      setTogglingId(null);
    }
  };

  const handleStatusChange = async (business: Business, newStatus: 'active' | 'pending' | 'suspended') => {
    setTogglingId(business._id);
    setError(null);
    try {
      const response = await businessesApi.updateStatus(business._id, newStatus);
      if (response.error) {
        setError(response.error);
      } else {
        setSuccessMessage(`Status updated to ${newStatus}`);
        await fetchData();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700';
      case 'pending': return 'bg-yellow-50 text-yellow-700';
      case 'suspended': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="Manage Businesses" />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header showBack title="Manage Businesses" />

      <div className="p-6 pt-20">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="text-sm">{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filters</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Types</option>
              {BUSINESS_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Search & Add */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search businesses..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={() => setShowOsmDiscovery(true)}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
            aria-label="Discover from OpenStreetMap"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowOsmDiscovery(true)}
          >
            <Globe className="w-5 h-5" />
            <span className="hidden sm:inline">OSM</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-slate-500">
          <span>{filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''}</span>
          <span>•</span>
          <span>{businesses.filter(b => b.status === 'active').length} active</span>
          <span>•</span>
          <span>{businesses.filter(b => b.isVerified).length} verified</span>
          <span>•</span>
          <span className="text-yellow-600">{businesses.filter(b => b.status === 'pending').length} pending</span>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredBusinesses.map(business => (
            <div
              key={business._id}
              className={`bg-white rounded-xl p-4 shadow-sm border ${
                !business.isActive
                  ? 'border-gray-300 bg-gray-50/50 opacity-75'
                  : business.status === 'suspended' 
                    ? 'border-red-200 bg-red-50/30' 
                    : business.status === 'pending' 
                      ? 'border-yellow-200 bg-yellow-50/30' 
                      : 'border-gray-100'
              }`}
            >
              <div className="flex gap-4">
                {/* Image */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {business.images && business.images.length > 0 ? (
                    <img
                      src={business.images[0]}
                      alt={business.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Store className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 truncate">{business.name}</h3>
                      {business.isVerified && (
                        <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      {business.isFeatured && (
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!business.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-600 flex items-center gap-1">
                          <EyeOff className="w-3 h-3" />
                          Hidden
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(business.status)}`}>
                        {business.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <span>{getTypeIcon(business.type)}</span>
                    <span>{getTypeLabel(business.type)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {business.stats?.rating?.toFixed(1) || '—'}
                    </span>
                    <span>•</span>
                    <span>{business.stats?.reviewCount || 0} reviews</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(business.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {business.location?.address && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {business.location.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleToggleActive(business)}
                  disabled={togglingId === business._id}
                  className={`py-2 px-3 text-sm font-medium rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 ${
                    business.isActive
                      ? 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                  aria-label={business.isActive ? 'Hide from map' : 'Show on map'}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && !togglingId && handleToggleActive(business)}
                >
                  {togglingId === business._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : business.isActive ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  {business.isActive ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => handleToggleVerify(business)}
                  disabled={togglingId === business._id}
                  className={`py-2 px-3 text-sm font-medium rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 ${
                    business.isVerified
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                  }`}
                >
                  {togglingId === business._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BadgeCheck className="w-4 h-4" />
                  )}
                  {business.isVerified ? 'Verified' : 'Verify'}
                </button>
                <select
                  value={business.status}
                  onChange={(e) => handleStatusChange(business, e.target.value as 'active' | 'pending' | 'suspended')}
                  disabled={togglingId === business._id}
                  className="py-2 px-3 text-sm font-medium rounded-lg bg-gray-100 text-slate-600 hover:bg-gray-200 disabled:opacity-50 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspend</option>
                </select>
                <button
                  onClick={() => {
                    setEditingBusiness(business);
                    setShowForm(true);
                  }}
                  className="flex-1 py-2 text-sm font-medium rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(business._id)}
                  className="py-2 px-3 text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredBusinesses.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No businesses found</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <BusinessForm
          business={editingBusiness}
          attractions={attractions}
          onClose={() => {
            setShowForm(false);
            setEditingBusiness(null);
          }}
          onSave={editingBusiness ? handleUpdate : handleCreate}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Business?</h3>
            <p className="text-slate-600 mb-6">This will suspend the business listing.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-slate-700 font-medium rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OSM Discovery Modal */}
      {showOsmDiscovery && (
        <OsmDiscoveryModal
          onClose={() => setShowOsmDiscovery(false)}
          onImported={() => fetchData()}
        />
      )}
    </div>
  );
};

export default AdminBusinesses;
