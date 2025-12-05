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
  Eye, 
  EyeOff,
  Loader2,
  AlertCircle,
  X,
  MapPin,
  Star,
  Navigation,
  RefreshCw,
  Database,
  Globe,
  Check,
  Download,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { attractionsApi, Attraction, OsmPlace } from '../../services/api';
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

// Iligan City bounds for coordinate validation
const ILIGAN_BOUNDS = {
  lat: { min: 8.10, max: 8.30 },
  lng: { min: 124.10, max: 124.35 },
};

const ILIGAN_CENTER: [number, number] = [8.228, 124.245];

// Transport segment options
const TRANSPORT_SEGMENTS = ['Jeepney', 'Tricycle', 'Habal-habal', 'Walk', 'Bus'] as const;
type TransportSegment = typeof TRANSPORT_SEGMENTS[number];

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
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
              }`}
              aria-label={`Toggle ${option}`}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleToggle(option)}
            >
              {isSelected && <Check className="w-3.5 h-3.5" />}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ======================
// ATTRACTION FORM MODAL
// ======================

interface AttractionFormProps {
  attraction?: Attraction | null;
  onClose: () => void;
  onSave: (data: Partial<Attraction>) => Promise<void>;
}

const AttractionForm: React.FC<AttractionFormProps> = ({ attraction, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: attraction?.name || '',
    category: attraction?.category || 'waterfall',
    description: attraction?.description || '',
    coverImage: attraction?.coverImage || '',
    gallery: attraction?.gallery || [],
    address: attraction?.location?.address || '',
    barangay: attraction?.location?.barangay || '',
    lat: attraction?.location?.manualCoordinates?.lat
      ?? attraction?.location?.coordinates?.lat
      ?? 0,
    lng: attraction?.location?.manualCoordinates?.lng
      ?? attraction?.location?.coordinates?.lng
      ?? 0,
    osmLat: attraction?.location?.osmCoordinates?.lat || 0,
    osmLng: attraction?.location?.osmCoordinates?.lng || 0,
    osmFetchedAt: attraction?.location?.osmCoordinates?.fetchedAt || '',
    distanceFromCity: attraction?.location?.distanceFromCity || '',
    hours: attraction?.visitorInfo?.hours || '',
    fee: attraction?.visitorInfo?.fee || '',
    bestTimeToVisit: attraction?.visitorInfo?.bestTimeToVisit || '',
    difficulty: attraction?.visitorInfo?.difficulty || '',
    duration: attraction?.visitorInfo?.duration || '',
    // Transport fields
    transportVehicle: attraction?.transport?.vehicle || '',
    transportRoute: attraction?.transport?.route || '',
    transportDuration: attraction?.transport?.duration || '',
    transportFareRegular: attraction?.transport?.fares?.regular || '',
    transportFareDiscounted: attraction?.transport?.fares?.discounted || '',
    transportFareHabal: attraction?.transport?.fares?.habal || '',
    transportSegments: (attraction?.transport?.segments || []) as TransportSegment[],
    transportNote: attraction?.transport?.note || '',
    // Coordinate source
    useOsmCoordinates: attraction?.useOsmCoordinates ?? false,
    isFeatured: attraction?.isFeatured || false,
    isActive: attraction?.isActive !== false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOsmRefreshing, setIsOsmRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'transport'>('basic');

  // Category options matching database enum values
  const CATEGORY_OPTIONS = [
    { value: 'waterfall', label: 'Waterfall' },
    { value: 'spring', label: 'Cold Spring' },
    { value: 'heritage', label: 'Heritage' },
    { value: 'park', label: 'Park' },
    { value: 'viewpoint', label: 'Viewpoint' },
    { value: 'museum', label: 'Museum' },
    { value: 'religious', label: 'Religious' },
    { value: 'nature', label: 'Nature' },
    { value: 'other', label: 'Other' },
  ] as const;

  const handleCoordinateChange = (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, lat, lng }));
  };

  const hasOsmCoordinates = Number.isFinite(formData.osmLat) && Number.isFinite(formData.osmLng) && (formData.osmLat !== 0 || formData.osmLng !== 0);

  const formatOsmTimestamp = (value: string) => {
    if (!value) return 'Not synced yet';
    try {
      return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (err) {
      return value;
    }
  };

  const handleRefreshOsm = async () => {
    if (!attraction?._id) {
      setError('Save the attraction first before syncing with OpenStreetMap');
      return;
    }

    setIsOsmRefreshing(true);
    setError(null);

    try {
      const response = await attractionsApi.syncOsmById(attraction._id, formData.useOsmCoordinates);
      if (response.error) {
        setError(response.error);
        return;
      }

      const updated = response.data?.attraction;
      if (updated?.location?.osmCoordinates) {
        setFormData(prev => ({
          ...prev,
          osmLat: updated.location.osmCoordinates?.lat || 0,
          osmLng: updated.location.osmCoordinates?.lng || 0,
          osmFetchedAt: updated.location.osmCoordinates?.fetchedAt || new Date().toISOString(),
        }));
      }
    } catch (err) {
      setError('Failed to fetch coordinates from OpenStreetMap');
    } finally {
      setIsOsmRefreshing(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        name: formData.name,
        category: formData.category,
        description: formData.description,
        coverImage: formData.coverImage,
        gallery: formData.gallery,
        location: {
          address: formData.address,
          barangay: formData.barangay,
          coordinates: {
            lat: formData.lat,
            lng: formData.lng,
          },
          manualCoordinates: {
            lat: formData.lat,
            lng: formData.lng,
          },
          distanceFromCity: formData.distanceFromCity,
        },
        visitorInfo: {
          hours: formData.hours,
          fee: formData.fee,
          bestTimeToVisit: formData.bestTimeToVisit,
          difficulty: formData.difficulty,
          duration: formData.duration,
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
        useOsmCoordinates: formData.useOsmCoordinates,
        isFeatured: formData.isFeatured,
        isActive: formData.isActive,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImagesChange = (urls: string[]) => {
    if (urls.length > 0 && !formData.coverImage) {
      setFormData(prev => ({ ...prev, coverImage: urls[0], gallery: urls.slice(1) }));
    } else {
      setFormData(prev => ({ ...prev, gallery: urls }));
    }
  };

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info' },
    { id: 'location' as const, label: 'Location & Map' },
    { id: 'transport' as const, label: 'Transport' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-900">
            {attraction ? 'Edit Attraction' : 'Add Attraction'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Close modal"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClose()}
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
                aria-label={`Switch to ${tab.label} tab`}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveTab(tab.id)}
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
                <label className="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  aria-label="Attraction name"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  aria-label="Attraction category"
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  aria-label="Attraction description"
                />
              </div>

              {/* Cover Image URL */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Cover Image URL</label>
                <input
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  aria-label="Cover image URL"
                />
              </div>

              {/* Gallery */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Gallery Images</label>
                <ImageUploader
                  folder="attractions"
                  maxFiles={10}
                  onUploadComplete={handleImagesChange}
                  existingImages={formData.gallery}
                />
              </div>

              {/* Visitor Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Hours</label>
                  <input
                    type="text"
                    value={formData.hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
                    placeholder="e.g., 6:00 AM - 6:00 PM"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Operating hours"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Fee</label>
                  <input
                    type="text"
                    value={formData.fee}
                    onChange={(e) => setFormData(prev => ({ ...prev, fee: e.target.value }))}
                    placeholder="e.g., ₱50 per person"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Entrance fee"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">Active</span>
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
              </div>
            </div>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              {/* Address fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Address"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Barangay</label>
                  <input
                    type="text"
                    value={formData.barangay}
                    onChange={(e) => setFormData(prev => ({ ...prev, barangay: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Barangay"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Distance from City</label>
                <input
                  type="text"
                  value={formData.distanceFromCity}
                  onChange={(e) => setFormData(prev => ({ ...prev, distanceFromCity: e.target.value }))}
                  placeholder="e.g., 10 km from city center"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                  aria-label="Distance from city center"
                />
              </div>

              {/* Coordinate Source Toggle */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Coordinate Source</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose whether to use OpenStreetMap data or manual coordinates
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, useOsmCoordinates: false }))}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      !formData.useOsmCoordinates
                        ? 'bg-sky-600 text-white'
                        : 'bg-white border border-gray-200 text-slate-600 hover:bg-gray-50'
                    }`}
                    aria-label="Use database coordinates"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setFormData(prev => ({ ...prev, useOsmCoordinates: false }))}
                  >
                    <Database className="w-4 h-4" />
                    Database (Manual)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, useOsmCoordinates: true }))}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      formData.useOsmCoordinates
                        ? 'bg-sky-600 text-white'
                        : 'bg-white border border-gray-200 text-slate-600 hover:bg-gray-50'
                    }`}
                    aria-label="Use OpenStreetMap coordinates"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setFormData(prev => ({ ...prev, useOsmCoordinates: true }))}
                  >
                    <Globe className="w-4 h-4" />
                    OpenStreetMap
                  </button>
                </div>
                {formData.useOsmCoordinates && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    OSM coordinates will be fetched automatically when viewing the map
                  </p>
                )}
              </div>

              {/* Manual Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lat: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g., 8.228"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Latitude coordinate"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lng: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g., 124.245"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Longitude coordinate"
                  />
                </div>
              </div>

              {/* Interactive Map Picker */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  Pick Location on Map
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

              {/* OSM Coordinates Summary */}
              <div className="mt-6 bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">OpenStreetMap Coordinates</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{formatOsmTimestamp(formData.osmFetchedAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshOsm}
                    disabled={!attraction?._id || isOsmRefreshing}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    aria-label="Sync coordinates from OpenStreetMap"
                  >
                    {isOsmRefreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sync
                  </button>
                </div>

                {hasOsmCoordinates ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Latitude</p>
                      <p className="font-semibold text-slate-900">{formData.osmLat.toFixed(6)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Longitude</p>
                      <p className="font-semibold text-slate-900">{formData.osmLng.toFixed(6)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No OSM coordinates stored yet. Sync to pull the latest map data.</p>
                )}
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
                  placeholder="e.g., Take a jeepney from Tambo Terminal going to Buru-un..."
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
                  placeholder="e.g., Tell the driver you're going to the falls..."
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
            aria-label="Cancel"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClose()}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-sky-600 text-white font-medium rounded-xl hover:bg-sky-700 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2"
            aria-label={attraction ? 'Update attraction' : 'Create attraction'}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleSubmit()}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {attraction ? 'Update' : 'Create'}
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
  const [osmPlaces, setOsmPlaces] = useState<OsmPlace[]>([]);
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
        const response = await attractionsApi.discoverOsmPlaces();
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

  const handleImport = async (place: OsmPlace) => {
    setImportingIds(prev => new Set(prev).add(place.osmId));
    try {
      const response = await attractionsApi.importOsmPlace({
        osmId: place.osmId,
        name: place.name,
        category: place.category,
        lat: place.lat,
        lng: place.lng,
        description: place.description,
        address: place.address,
      });

      if (response.error) {
        setError(response.error);
      } else {
        setImportedIds(prev => new Set(prev).add(place.osmId));
        onImported();
      }
    } catch (err) {
      setError('Failed to import place');
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
      place.category.toLowerCase().includes(filterQuery.toLowerCase());
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
              Discover from OpenStreetMap
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Import attractions from OSM data in Iligan City
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
              placeholder="Filter places..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
              aria-label="Filter places"
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
              <p className="text-slate-600">Discovering places from OpenStreetMap...</p>
              <p className="text-xs text-slate-400 mt-1">This may take a few seconds</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No new places found</p>
              <p className="text-sm text-slate-400 mt-1">All OSM places are already in your database</p>
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
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium capitalize">{place.displayCategory || place.category}</span>
                          <span>•</span>
                          <span className="text-xs">{place.lat.toFixed(4)}, {place.lng.toFixed(4)}</span>
                        </div>
                        {place.description && (
                          <p className="text-sm text-slate-600 line-clamp-2">{place.description}</p>
                        )}
                        {place.address && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {place.address}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
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
                          {isImporting ? 'Importing...' : isImported ? 'Added' : alreadyExists ? 'Exists' : 'Import'}
                        </button>
                        <a
                          href={`https://www.openstreetmap.org/${place.osmId.replace('osm-', '').replace('-', '/')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 justify-center"
                          aria-label="View on OpenStreetMap"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on OSM
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {osmPlaces.length} places found • {newCount} new
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-slate-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// ======================
// MAIN PAGE
// ======================

const AdminAttractions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showOsmDiscovery, setShowOsmDiscovery] = useState(false);

  // Fetch attractions
  const fetchAttractions = useCallback(async () => {
    try {
      const response = await attractionsApi.getAll();
      if (response.data?.attractions) {
        setAttractions(response.data.attractions);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to load attractions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttractions();
  }, [fetchAttractions]);

  // Filter attractions
  const filteredAttractions = attractions.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers
  const handleCreate = async (data: Partial<Attraction>) => {
    const response = await attractionsApi.create(data);
    if (response.error) throw new Error(response.error);
    await fetchAttractions();
  };

  const handleUpdate = async (data: Partial<Attraction>) => {
    if (!editingAttraction) return;
    const response = await attractionsApi.update(editingAttraction._id, data);
    if (response.error) throw new Error(response.error);
    await fetchAttractions();
    setEditingAttraction(null);
  };

  const handleDelete = async (id: string) => {
    const response = await attractionsApi.delete(id);
    if (response.error) {
      setError(response.error);
      return;
    }
    setAttractions(prev => prev.filter(a => a._id !== id));
    setDeleteConfirm(null);
  };

  const handleToggleActive = async (attraction: Attraction) => {
    setTogglingId(attraction._id);
    setError(null);
    try {
      const response = await attractionsApi.update(attraction._id, { isActive: !attraction.isActive });
      if (response.error) {
        setError(response.error);
      } else {
        setSuccessMessage(`Attraction ${!attraction.isActive ? 'shown' : 'hidden'} successfully`);
        await fetchAttractions();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to update attraction visibility');
    } finally {
      setTogglingId(null);
    }
  };

  // Bulk sync handlers
  const handleBulkSyncOsm = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const response = await attractionsApi.syncOsmCoordinates();
      if (response.error) {
        setError(response.error);
      } else {
        const synced = response.data?.synced ?? 0;
        const failed = response.data?.failed ?? 0;
        const reused = response.data?.reused ?? 0;
        const fetched = response.data?.fetched ?? synced;
        const parts = [`Activated ${synced} attraction${synced === 1 ? '' : 's'}`];
        parts.push(`refetched ${fetched}`);
        if (reused) {
          parts.push(`reused ${reused}`);
        }
        if (failed) {
          parts.push(`${failed} skipped`);
        }
        setSuccessMessage(parts.join(' · '));
        await fetchAttractions();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to sync coordinates');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBulkUseDb = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const response = await attractionsApi.useDbCoordinates();
      if (response.error) {
        setError(response.error);
      } else {
        const updated = response.data?.updated ?? 0;
        setSuccessMessage(`Reverted ${updated} attraction${updated === 1 ? '' : 's'} to manual coordinates`);
        await fetchAttractions();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to update coordinates');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="Manage Attractions" />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header showBack title="Manage Attractions" />

      <div className="p-6 pt-20">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="text-sm">{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage(null)} 
              className="ml-auto"
              aria-label="Dismiss success message"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSuccessMessage(null)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
            <button 
              onClick={() => setError(null)} 
              className="ml-auto"
              aria-label="Dismiss error"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setError(null)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bulk Actions */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Bulk Coordinate Actions
          </h3>
          {(() => {
            // Determine current state - all using OSM, all using DB, or mixed
            const osmCount = attractions.filter(a => a.useOsmCoordinates).length;
            const dbCount = attractions.filter(a => !a.useOsmCoordinates).length;
            const allOsm = osmCount === attractions.length && attractions.length > 0;
            const allDb = dbCount === attractions.length && attractions.length > 0;
            
            return (
              <div className="flex gap-2">
                <button
                  onClick={handleBulkSyncOsm}
                  disabled={isSyncing}
                  className={`flex-1 py-2.5 px-4 font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm ${
                    allOsm
                      ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                  aria-label="Sync all attractions to use OSM coordinates"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && !isSyncing && handleBulkSyncOsm()}
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  Use OSM for All
                  {allOsm && <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleBulkUseDb}
                  disabled={isSyncing}
                  className={`flex-1 py-2.5 px-4 font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm ${
                    allDb
                      ? 'bg-slate-700 text-white ring-2 ring-slate-700 ring-offset-2'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                  aria-label="Set all attractions to use database coordinates"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && !isSyncing && handleBulkUseDb()}
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  Use DB for All
                  {allDb && <Check className="w-4 h-4" />}
                </button>
              </div>
            );
          })()}
        </div>

        {/* Search & Add */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search attractions..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              aria-label="Search attractions"
            />
          </div>
          <button
            onClick={() => setShowOsmDiscovery(true)}
            className="px-4 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-200"
            aria-label="Import from OpenStreetMap"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowOsmDiscovery(true)}
          >
            <Globe className="w-5 h-5" />
            <span className="hidden sm:inline">OSM</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors flex items-center gap-2"
            aria-label="Add new attraction"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowForm(true)}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-slate-500">
          <span>{filteredAttractions.length} attraction{filteredAttractions.length !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{attractions.filter(a => a.isActive).length} active</span>
          <span>•</span>
          <span>{attractions.filter(a => a.isFeatured).length} featured</span>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredAttractions.map(attraction => (
            <div
              key={attraction._id}
              className={`bg-white rounded-xl p-4 shadow-sm border ${attraction.isActive ? 'border-gray-100' : 'border-gray-200 bg-gray-50 opacity-75'}`}
            >
              <div className="flex gap-4">
                {/* Image */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {attraction.coverImage ? (
                    <img
                      src={attraction.coverImage}
                      alt={attraction.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <MapPin className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-slate-900 truncate">{attraction.name}</h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {attraction.useOsmCoordinates ? (
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded" title="Using OSM coordinates">
                          <Globe className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded" title="Using database coordinates">
                          <Database className="w-3 h-3" />
                        </span>
                      )}
                      {attraction.isFeatured && (
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{attraction.category}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{attraction.stats?.reviewCount || 0} reviews</span>
                    <span>•</span>
                    <span>{attraction.stats?.averageRating?.toFixed(1) || '—'} rating</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleToggleActive(attraction)}
                  disabled={togglingId === attraction._id}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 ${
                    attraction.isActive
                      ? 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                  aria-label={attraction.isActive ? 'Hide attraction' : 'Show attraction'}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && !togglingId && handleToggleActive(attraction)}
                >
                  {togglingId === attraction._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : attraction.isActive ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  {attraction.isActive ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => {
                    setEditingAttraction(attraction);
                    setShowForm(true);
                  }}
                  className="flex-1 py-2 text-sm font-medium rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 flex items-center justify-center gap-1"
                  aria-label="Edit attraction"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingAttraction(attraction);
                      setShowForm(true);
                    }
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(attraction._id)}
                  className="py-2 px-3 text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
                  aria-label="Delete attraction"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setDeleteConfirm(attraction._id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredAttractions.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No attractions found</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <AttractionForm
          attraction={editingAttraction}
          onClose={() => {
            setShowForm(false);
            setEditingAttraction(null);
          }}
          onSave={editingAttraction ? handleUpdate : handleCreate}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Attraction?</h3>
            <p className="text-slate-600 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-slate-700 font-medium rounded-xl hover:bg-gray-200"
                aria-label="Cancel delete"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600"
                aria-label="Confirm delete"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleDelete(deleteConfirm)}
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
          onImported={() => {
            fetchAttractions();
            setSuccessMessage('Attraction imported from OpenStreetMap');
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
        />
      )}
    </div>
  );
};

export default AdminAttractions;
