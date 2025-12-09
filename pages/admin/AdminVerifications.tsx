import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { 
  Search, 
  Loader2,
  AlertCircle,
  X,
  Building2,
  CheckCircle,
  XCircle,
  BadgeCheck,
  Phone,
  Globe,
  User,
  Languages,
  Award,
  Banknote
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { businessesApi, guidesApi, Business, Guide } from '../../services/api';

const AdminVerifications: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'businesses' | 'guides'>('businesses');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  // Fetch pending items
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [businessRes, guideRes] = await Promise.all([
        businessesApi.getAll(),
        guidesApi.getAll({ verified: false })
      ]);

      if (businessRes.data?.businesses) {
        // Filter to show unverified businesses
        const pending = businessRes.data.businesses.filter(b => !b.isVerified);
        setBusinesses(pending);
      }
      
      if (guideRes.data?.guides) {
        const pendingGuides = guideRes.data.guides.filter(g => !g.guideProfile.isVerified);
        setGuides(pendingGuides);
      }

      if (businessRes.error || guideRes.error) {
        console.error('Error fetching data:', businessRes.error, guideRes.error);
      }
    } catch (err) {
      setError('Failed to load verification data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user, fetchData]);

  // Filter items
  const filteredBusinesses = businesses.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGuides = guides.filter(g =>
    g.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.guideProfile.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle business verification
  const handleVerifyBusiness = async (businessId: string, isVerified: boolean) => {
    setProcessingId(businessId);
    try {
      const response = await businessesApi.verify(businessId, isVerified);
      if (response.error) {
        setError(response.error);
        return;
      }
      // Remove from list
      setBusinesses(prev => prev.filter(b => b._id !== businessId));
    } catch (err) {
      setError('Failed to update business verification');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle guide verification
  const handleVerifyGuide = async (guideId: string, isVerified: boolean) => {
    setProcessingId(guideId);
    try {
      const response = await guidesApi.verify(guideId, isVerified);
      if (response.error) {
        setError(response.error);
        return;
      }
      // Remove from list
      setGuides(prev => prev.filter(g => g._id !== guideId));
    } catch (err) {
      setError('Failed to update guide verification');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="Pending Verifications" />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header showBack title="Pending Verifications" />

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

        {/* Tabs */}
        <div className="flex p-1 bg-gray-200 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('businesses')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'businesses'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Businesses
            {businesses.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                {businesses.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('guides')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'guides'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            Guides
            {guides.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                {guides.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Stats */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <BadgeCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">
                {activeTab === 'businesses' ? filteredBusinesses.length : filteredGuides.length} Pending
              </h3>
              <p className="text-sm text-amber-700">
                {activeTab === 'businesses' ? 'Businesses' : 'Guides'} awaiting verification
              </p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {activeTab === 'businesses' ? (
            // Business List
            filteredBusinesses.map(business => (
              <div
                key={business._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {business.images && business.images.length > 0 ? (
                        <img
                          src={business.images[0]}
                          alt={business.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Building2 className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate mb-1">{business.name}</h3>
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-slate-600 rounded-full mb-2">
                        {business.type}
                      </span>
                      <p className="text-sm text-slate-500 line-clamp-2">{business.description}</p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>{business.location.address}</span>
                  </div>
                  {business.contact?.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{business.contact.phone}</span>
                    </div>
                  )}
                  {business.contact?.website && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a href={business.contact.website} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline truncate">
                        {business.contact.website}
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex border-t border-gray-100">
                  <button
                    onClick={() => handleVerifyBusiness(business._id, false)}
                    disabled={processingId === business._id}
                    className="flex-1 py-3 text-red-600 font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2 border-r border-gray-100"
                  >
                    {processingId === business._id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        Reject
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleVerifyBusiness(business._id, true)}
                    disabled={processingId === business._id}
                    className="flex-1 py-3 text-green-600 font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {processingId === business._id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Verify
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            // Guide List
            filteredGuides.map(guide => (
              <div
                key={guide._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {guide.avatar ? (
                        <img
                          src={guide.avatar}
                          alt={guide.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate mb-1">{guide.username}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <Banknote className="w-3 h-3 text-slate-400" />
                        <span className="text-xs font-medium text-slate-600">
                          ₱{guide.guideProfile.rate}/day
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{guide.guideProfile.bio}</p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="px-4 pb-4 space-y-2">
                  {guide.guideProfile.languages.length > 0 && (
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <Languages className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {guide.guideProfile.languages.map(lang => (
                          <span key={lang} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {guide.guideProfile.specialties.length > 0 && (
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <Award className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {guide.guideProfile.specialties.map(spec => (
                          <span key={spec} className="bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded text-xs">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {guide.guideProfile.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{guide.guideProfile.phone}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex border-t border-gray-100">
                  <button
                    onClick={() => handleVerifyGuide(guide._id, false)}
                    disabled={processingId === guide._id}
                    className="flex-1 py-3 text-red-600 font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2 border-r border-gray-100"
                  >
                    {processingId === guide._id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        Reject
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleVerifyGuide(guide._id, true)}
                    disabled={processingId === guide._id}
                    className="flex-1 py-3 text-green-600 font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {processingId === guide._id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Verify
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}

          {((activeTab === 'businesses' && filteredBusinesses.length === 0) || 
            (activeTab === 'guides' && filteredGuides.length === 0)) && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">All caught up!</h3>
              <p className="text-slate-500">No pending {activeTab} verifications.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVerifications;
