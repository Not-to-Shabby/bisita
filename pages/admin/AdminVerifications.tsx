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
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { businessesApi, Business } from '../../services/api';

const AdminVerifications: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [businesses, setBusinesses] = useState<Business[]>([]);
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

  // Fetch pending businesses
  const fetchBusinesses = useCallback(async () => {
    try {
      const response = await businessesApi.getAll();
      if (response.data?.businesses) {
        // Filter to show unverified businesses
        const pending = response.data.businesses.filter(b => !b.isVerified);
        setBusinesses(pending);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to load businesses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchBusinesses();
    }
  }, [user, fetchBusinesses]);

  // Filter businesses
  const filteredBusinesses = businesses.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle verification
  const handleVerify = async (businessId: string, isVerified: boolean) => {
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
      setError('Failed to update verification');
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

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search businesses..."
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
              <h3 className="font-bold text-amber-900">{filteredBusinesses.length} Pending</h3>
              <p className="text-sm text-amber-700">Businesses awaiting verification</p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {filteredBusinesses.map(business => (
            <div
              key={business._id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4">
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {business.coverImage ? (
                      <img
                        src={business.coverImage}
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
                      {business.category}
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
                  onClick={() => handleVerify(business._id, false)}
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
                  onClick={() => handleVerify(business._id, true)}
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
          ))}

          {filteredBusinesses.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">All caught up!</h3>
              <p className="text-slate-500">No pending verifications at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVerifications;
