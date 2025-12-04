import { getAuthToken } from '../context/AuthContext';

// ======================
// CONFIG
// ======================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ======================
// TYPES
// ======================

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Attraction types
export interface Attraction {
  _id: string;
  legacyId?: string;
  name: string;
  category: string;
  description: string;
  coverImage: string;
  gallery: string[];
  location: {
    address: string;
    barangay: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    distanceFromCity?: string;
  };
  visitorInfo: {
    hours?: string;
    fee?: string;
    tips?: string[];
    bestTimeToVisit?: string;
    difficulty?: string;
    duration?: string;
  };
  transport: {
    mode: string;
    description: string;
    fare?: string;
    terminal?: string;
    travelTime?: string;
    tips?: string;
  }[];
  stats: {
    averageRating: number;
    reviewCount: number;
    visitCount: number;
  };
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MapLocation {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  description: string;
  address: string;
  distanceFromCity?: string;
  transport: Attraction['transport'];
}

// Business types
export interface Business {
  _id: string;
  legacyId?: string;
  name: string;
  category: string;
  description: string;
  coverImage: string;
  gallery: string[];
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    facebook?: string;
  };
  location: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  nearAttractionIds: string[];
  hours?: string;
  priceRange?: string;
  stats: {
    averageRating: number;
    reviewCount: number;
  };
  isVerified: boolean;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
}

// Review types
export interface Review {
  _id: string;
  authorId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  targetId: string;
  targetType: 'Attraction' | 'Business' | 'Guide';
  rating: number;
  title: string;
  content: string;
  photos: string[];
  visitDate?: string;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

// Guide types
export interface Guide {
  _id: string;
  username: string;
  avatar?: string;
  guideProfile: {
    bio: string;
    languages: string[];
    specialties: string[];
    rate: number;
    status: 'available' | 'on_tour' | 'unavailable';
    isVerified: boolean;
    phone?: string;
    messenger?: string;
  };
  stats: {
    reviewCount: number;
  };
}

export interface GuideBooking {
  _id: string;
  guideId: string | Guide;
  touristId: string;
  attractionIds: string[];
  date: string;
  startTime: string;
  duration: number;
  groupSize: number;
  totalPrice: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

// ======================
// API CLIENT
// ======================

const apiClient = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAuthToken();

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include',
    });

    // Handle token expiry
    if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.code === 'TOKEN_EXPIRED') {
        // Try refresh
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem('accessToken', refreshData.accessToken);

          // Retry request
          const retryResponse = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${refreshData.accessToken}`,
              ...options.headers,
            },
            credentials: 'include',
          });

          const retryData = await retryResponse.json();
          return {
            data: retryResponse.ok ? retryData : null,
            error: retryResponse.ok ? null : retryData.error,
            status: retryResponse.status,
          };
        }
      }

      return { data: null, error: errorData.error || 'Unauthorized', status: 401 };
    }

    const data = await response.json();
    return {
      data: response.ok ? data : null,
      error: response.ok ? null : data.error,
      status: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
};

// ======================
// ATTRACTIONS API
// ======================

export const attractionsApi = {
  getAll: (params?: { category?: string; featured?: boolean; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.featured) searchParams.set('featured', 'true');
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return apiClient<{ attractions: Attraction[] }>(`/attractions${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => {
    return apiClient<{ attraction: Attraction }>(`/attractions/${id}`);
  },

  getMapLocations: () => {
    return apiClient<{ locations: MapLocation[] }>('/attractions/map/locations');
  },

  create: (data: Partial<Attraction>) => {
    return apiClient<{ attraction: Attraction }>('/attractions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: Partial<Attraction>) => {
    return apiClient<{ attraction: Attraction }>(`/attractions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return apiClient<{ message: string }>(`/attractions/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// BUSINESSES API
// ======================

export const businessesApi = {
  getAll: (params?: { category?: string; verified?: boolean; nearAttraction?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.verified) searchParams.set('verified', 'true');
    if (params?.nearAttraction) searchParams.set('nearAttraction', params.nearAttraction);
    
    const query = searchParams.toString();
    return apiClient<{ businesses: Business[] }>(`/businesses${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => {
    return apiClient<{ business: Business }>(`/businesses/${id}`);
  },

  getMine: () => {
    return apiClient<{ businesses: Business[] }>('/businesses/mine');
  },

  create: (data: Partial<Business>) => {
    return apiClient<{ business: Business }>('/businesses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: Partial<Business>) => {
    return apiClient<{ business: Business }>(`/businesses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return apiClient<{ message: string }>(`/businesses/${id}`, {
      method: 'DELETE',
    });
  },

  verify: (id: string, isVerified: boolean) => {
    return apiClient<{ business: Business }>(`/businesses/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ isVerified }),
    });
  },
};

// ======================
// REVIEWS API
// ======================

export const reviewsApi = {
  getByTarget: (targetType: 'Attraction' | 'Business' | 'Guide', targetId: string) => {
    return apiClient<{ reviews: Review[]; stats: { averageRating: number; reviewCount: number } }>(
      `/reviews/${targetType.toLowerCase()}/${targetId}`
    );
  },

  getMine: () => {
    return apiClient<{ reviews: Review[] }>('/reviews/mine');
  },

  create: (data: {
    targetId: string;
    targetType: 'Attraction' | 'Business' | 'Guide';
    rating: number;
    title: string;
    content: string;
    photos?: string[];
    visitDate?: string;
  }) => {
    return apiClient<{ review: Review }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: { rating?: number; title?: string; content?: string; photos?: string[] }) => {
    return apiClient<{ review: Review }>(`/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return apiClient<{ message: string }>(`/reviews/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// GUIDES API
// ======================

export const guidesApi = {
  getAll: (params?: { status?: string; verified?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.verified !== undefined) searchParams.set('verified', params.verified.toString());
    
    const query = searchParams.toString();
    return apiClient<{ guides: Guide[] }>(`/guides${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => {
    return apiClient<{ guide: Guide }>(`/guides/${id}`);
  },

  apply: (data: {
    bio: string;
    languages: string[];
    specialties: string[];
    rate: number;
    phone?: string;
    messenger?: string;
  }) => {
    return apiClient<{ message: string }>('/guides/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProfile: (data: Partial<Guide['guideProfile']>) => {
    return apiClient<{ guide: Guide }>('/guides/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  verify: (guideId: string, isVerified: boolean) => {
    return apiClient<{ guide: Guide }>(`/guides/${guideId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ isVerified }),
    });
  },
};

// ======================
// GUIDE BOOKINGS API
// ======================

export const bookingsApi = {
  getMine: () => {
    return apiClient<{ bookings: GuideBooking[] }>('/guides/bookings/mine');
  },

  getAsGuide: () => {
    return apiClient<{ bookings: GuideBooking[] }>('/guides/bookings/requests');
  },

  create: (data: {
    guideId: string;
    attractionIds: string[];
    date: string;
    startTime: string;
    duration: number;
    groupSize: number;
    notes?: string;
  }) => {
    return apiClient<{ booking: GuideBooking }>('/guides/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateStatus: (bookingId: string, status: GuideBooking['status']) => {
    return apiClient<{ booking: GuideBooking }>(`/guides/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  cancel: (bookingId: string) => {
    return apiClient<{ booking: GuideBooking }>(`/guides/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
    });
  },
};

// ======================
// MEDIA API
// ======================

export const mediaApi = {
  getSignature: (folder: string) => {
    return apiClient<{
      signature: string;
      timestamp: number;
      cloudName: string;
      apiKey: string;
      folder: string;
    }>('/media/signature', {
      method: 'POST',
      body: JSON.stringify({ folder }),
    });
  },

  uploadToCloudinary: async (
    file: File,
    folder: string,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ url: string; publicId: string }>> => {
    // Get signature from backend
    const sigResponse = await mediaApi.getSignature(folder);
    if (sigResponse.error || !sigResponse.data) {
      return { data: null, error: sigResponse.error || 'Failed to get upload signature', status: sigResponse.status };
    }

    const { signature, timestamp, cloudName, apiKey, folder: uploadFolder } = sigResponse.data;

    // Upload to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signature', signature);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('folder', uploadFolder);

    try {
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<{ url: string; publicId: string }>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.secure_url,
              publicId: response.public_id,
            });
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
        xhr.send(formData);
      });

      const result = await uploadPromise;
      return { data: result, error: null, status: 200 };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Upload failed',
        status: 0,
      };
    }
  },

  delete: (publicId: string) => {
    return apiClient<{ message: string }>('/media', {
      method: 'DELETE',
      body: JSON.stringify({ publicId }),
    });
  },
};

// ======================
// AUTH API (for non-context use)
// ======================

export const authApi = {
  forgotPassword: (email: string) => {
    return apiClient<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: (token: string, password: string) => {
    return apiClient<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  resendVerification: () => {
    return apiClient<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
    });
  },

  updateProfile: (data: { username?: string; avatar?: string }) => {
    return apiClient<{
      message: string;
      user: {
        id: string;
        email: string;
        username: string;
        role: string;
        avatar?: string;
        isEmailVerified: boolean;
        guideProfile?: {
          bio: string;
          languages: string[];
          specialties: string[];
          rate: number;
          status: string;
          isVerified: boolean;
        };
        stats?: {
          reviewCount: number;
          contributionCount: number;
        };
        createdAt: string;
      };
    }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
