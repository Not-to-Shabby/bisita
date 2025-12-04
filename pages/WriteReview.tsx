import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import ImageUploader from '../components/ImageUploader';
import { Star, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { reviewsApi, attractionsApi, businessesApi, Attraction, Business } from '../services/api';
import { useAuth } from '../context/AuthContext';

type TargetType = 'Attraction' | 'Business' | 'Guide';

interface ReviewTarget {
  id: string;
  name: string;
  type: TargetType;
  coverImage?: string;
  stats?: {
    averageRating: number;
    reviewCount: number;
  };
}

const WriteReview: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
  // URL params
  const targetId = searchParams.get('targetId') || '';
  const targetType = (searchParams.get('type') as TargetType) || 'Attraction';
  
  // Form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [visitDate, setVisitDate] = useState('');
  
  // UI state
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Fetch target details
  useEffect(() => {
    const fetchTarget = async () => {
      if (!targetId) {
        setError('No target specified for review');
        setIsLoading(false);
        return;
      }

      try {
        if (targetType === 'Attraction') {
          const response = await attractionsApi.getById(targetId);
          if (response.data?.attraction) {
            const attraction = response.data.attraction;
            setTarget({
              id: attraction._id,
              name: attraction.name,
              type: 'Attraction',
              coverImage: attraction.coverImage,
              stats: attraction.stats,
            });
          } else {
            setError('Attraction not found');
          }
        } else if (targetType === 'Business') {
          const response = await businessesApi.getById(targetId);
          if (response.data?.business) {
            const business = response.data.business;
            setTarget({
              id: business._id,
              name: business.name,
              type: 'Business',
              coverImage: business.coverImage,
              stats: business.stats,
            });
          } else {
            setError('Business not found');
          }
        }
      } catch (err) {
        setError('Failed to load details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTarget();
  }, [targetId, targetType]);

  const handleSubmit = async () => {
    // Validation
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    if (!title.trim()) {
      setError('Please add a title for your review');
      return;
    }
    if (!content.trim() || content.length < 20) {
      setError('Please write at least 20 characters about your experience');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await reviewsApi.create({
        targetId,
        targetType,
        rating,
        title: title.trim(),
        content: content.trim(),
        photos,
        visitDate: visitDate || undefined,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(true);
      
      // Navigate back after short delay
      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } catch (err) {
      setError('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotosChange = (urls: string[]) => {
    setPhotos(urls);
  };

  const handleUploadError = (errorMsg: string) => {
    setUploadError(errorMsg);
    setTimeout(() => setUploadError(null), 3000);
  };

  const handleRatingKeyDown = (star: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setRating(star);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="Write a Review" />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      </div>
    );
  }

  // Error state (no target)
  if (!target) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="Write a Review" />
        <div className="p-6 pt-24 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Unable to Load</h2>
          <p className="text-slate-500 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-sky-600 text-white rounded-lg font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="Write a Review" />
        <div className="p-6 pt-24 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Review Submitted!</h2>
          <p className="text-slate-500">Thank you for sharing your experience.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header showBack title="Write a Review" />
      <div className="p-6 pt-20">
        {/* Target Info */}
        <div className="flex items-center gap-4 mb-6">
          {target.coverImage && (
            <img
              src={target.coverImage}
              alt={target.name}
              className="w-16 h-16 rounded-xl object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/200/200';
              }}
            />
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {target.name}
            </h2>
            <p className="text-sm text-slate-500 capitalize">{target.type}</p>
          </div>
        </div>

        {/* Current Rating Display */}
        {target.stats && target.stats.reviewCount > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center mb-6">
            <span className="text-4xl font-bold text-slate-900 mb-1">
              {target.stats.averageRating.toFixed(1)}
            </span>
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  className={
                    star <= Math.round(target.stats!.averageRating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-200'
                  }
                />
              ))}
            </div>
            <span className="text-xs text-slate-500">
              Based on {target.stats.reviewCount} review{target.stats.reviewCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Upload Error */}
        {uploadError && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{uploadError}</span>
          </div>
        )}

        {/* Your Rating */}
        <h3 className="font-bold text-slate-900 mb-3">Your Rating *</h3>
        <div className="flex gap-3 justify-center mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onKeyDown={(e) => handleRatingKeyDown(star, e)}
              tabIndex={0}
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
              className="focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 rounded-full p-1 transition-transform hover:scale-110"
            >
              <Star
                size={36}
                className={
                  star <= rating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-200'
                }
              />
            </button>
          ))}
        </div>

        {/* Review Title */}
        <h3 className="font-bold text-slate-900 mb-3">Title *</h3>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience..."
          maxLength={100}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500 mb-6"
        />

        {/* Review Content */}
        <h3 className="font-bold text-slate-900 mb-3">Share your experience *</h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-32 bg-white border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-sky-500 resize-none mb-1"
          placeholder="Tell us more about your visit..."
          maxLength={2000}
        />
        <p className="text-xs text-slate-400 mb-6 text-right">
          {content.length}/2000 characters
        </p>

        {/* Visit Date */}
        <h3 className="font-bold text-slate-900 mb-3">When did you visit?</h3>
        <input
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500 mb-6"
        />

        {/* Photos */}
        <h3 className="font-bold text-slate-900 mb-3">Add Photos</h3>
        <ImageUploader
          folder="reviews"
          maxFiles={5}
          maxSizeMB={10}
          onUploadComplete={handlePhotosChange}
          onError={handleUploadError}
          existingImages={photos}
          className="mb-6"
        />

        <p className="text-xs text-gray-500 mb-6 text-center">
          By submitting, you agree to our review guidelines. Be respectful and constructive.
          Reviews can be edited within 12 hours of posting.
        </p>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0 || !title.trim() || !content.trim()}
          className="w-full bg-sky-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-sky-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Review'
          )}
        </button>
      </div>
    </div>
  );
};

export default WriteReview;