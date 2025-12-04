import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { attractionsApi, Attraction } from '../../services/api';

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
    category: attraction?.category || 'Waterfalls',
    description: attraction?.description || '',
    coverImage: attraction?.coverImage || '',
    gallery: attraction?.gallery || [],
    address: attraction?.location?.address || '',
    barangay: attraction?.location?.barangay || '',
    lat: attraction?.location?.coordinates?.lat?.toString() || '',
    lng: attraction?.location?.coordinates?.lng?.toString() || '',
    distanceFromCity: attraction?.location?.distanceFromCity || '',
    hours: attraction?.visitorInfo?.hours || '',
    fee: attraction?.visitorInfo?.fee || '',
    bestTimeToVisit: attraction?.visitorInfo?.bestTimeToVisit || '',
    difficulty: attraction?.visitorInfo?.difficulty || '',
    duration: attraction?.visitorInfo?.duration || '',
    isFeatured: attraction?.isFeatured || false,
    isActive: attraction?.isActive !== false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = ['Waterfalls', 'Attractions', 'Heritage', 'Cold Springs', 'Nature', 'Adventure'];

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
            lat: parseFloat(formData.lat) || 0,
            lng: parseFloat(formData.lng) || 0,
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {attraction ? 'Edit Attraction' : 'Add Attraction'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
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

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Barangay</label>
              <input
                type="text"
                value={formData.barangay}
                onChange={(e) => setFormData(prev => ({ ...prev, barangay: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => setFormData(prev => ({ ...prev, lat: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => setFormData(prev => ({ ...prev, lng: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
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
            {attraction ? 'Update' : 'Create'}
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
  const { user, isAuthenticated } = useAuth();
  
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (user?.role !== 'admin') {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

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
    if (user?.role === 'admin') {
      fetchAttractions();
    }
  }, [user, fetchAttractions]);

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
    await attractionsApi.update(attraction._id, { isActive: !attraction.isActive });
    await fetchAttractions();
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
            />
          </div>
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
                    {attraction.isFeatured && (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                    )}
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
                  className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-1 ${
                    attraction.isActive
                      ? 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {attraction.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {attraction.isActive ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => {
                    setEditingAttraction(attraction);
                    setShowForm(true);
                  }}
                  className="flex-1 py-2 text-sm font-medium rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(attraction._id)}
                  className="py-2 px-3 text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
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
    </div>
  );
};

export default AdminAttractions;
