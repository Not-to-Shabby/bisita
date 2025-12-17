// ======================
// CONFIG
// ======================

const getApiUrl = () => {
  // Prefer explicit env override if provided
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;

  // In development fall back to proxy path
  if (import.meta.env.DEV) {
    return '/api';
  }

  // If we are in production but not on Vercel (e.g. local preview), try to use relative path if on same domain
  if (window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.')) {
    return '/api';
  }

  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

const getAuthToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

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
  coverImage?: string;
  gallery?: string[];
  images?: Array<{ url: string; caption?: string; isPrimary?: boolean }>;
  location: {
    address: string;
    barangay: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    manualCoordinates?: {
      lat: number;
      lng: number;
    };
    osmCoordinates?: {
      lat: number;
      lng: number;
      fetchedAt?: string;
      sourceId?: string;
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
  transport?: {
    vehicle?: string;
    route?: string;
    duration?: string;
    fares?: {
      regular?: string;
      discounted?: string;
      habal?: string;
    };
    segments?: ('Jeepney' | 'Tricycle' | 'Habal-habal' | 'Walk' | 'Bus')[];
    note?: string;
  };
  useOsmCoordinates?: boolean;
  stats: {
    rating: number;
    reviewCount: number;
    viewCount: number;
    // Back-compat with older frontend code / seeds
    averageRating?: number;
    visitCount?: number;
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
  useOsmCoordinates?: boolean;
  coordinateSource?: 'manual' | 'osm' | 'fallback';
  manualCoordinates?: { lat: number; lng: number } | null;
  osmCoordinates?: { lat: number; lng: number; fetchedAt?: string; sourceId?: string } | null;
  stats?: {
    rating?: number;
    reviewCount?: number;
  };
  transport: {
    mode: string;
    description: string;
    fare?: string;
    terminal?: string;
    travelTime?: string;
    tips?: string;
    segments?: ('Jeepney' | 'Tricycle' | 'Habal-habal' | 'Walk' | 'Bus')[];
  }[];
}

// Business map location type
export interface BusinessMapLocation {
  id: string;
  name: string;
  type: string;
  tagline?: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  image?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  transport?: {
    vehicle?: string;
    route?: string;
    duration?: string;
    fares?: {
      regular?: string;
      discounted?: string;
      habal?: string;
    };
    segments?: ('Jeepney' | 'Tricycle' | 'Habal-habal' | 'Walk' | 'Bus')[];
    note?: string;
  };
}

// Business types
export interface Business {
  _id: string;
  legacyId?: string;
  ownerId: string;
  name: string;
  slug?: string;
  type: 'accommodation' | 'restaurant' | 'activity' | 'guide_service' | 'shop' | 'transport';
  tagline?: string;
  description: string;
  images: string[];
  coverImage?: string;
  gallery?: string[];
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    facebook?: string;
    messenger?: string;
  };
  transport?: {
    vehicle?: string;
    route?: string;
    duration?: string;
    fares?: {
      regular?: string;
      discounted?: string;
      habal?: string;
    };
    segments?: ('Jeepney' | 'Tricycle' | 'Habal-habal' | 'Walk' | 'Bus')[];
    note?: string;
  };
  location: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  nearAttractionIds: string[];
  stats: {
    rating: number;
    reviewCount: number;
  };
  isVerified: boolean;
  isFeatured: boolean;
  isActive: boolean;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  updatedAt?: string;
}

// Review types
export type ReviewTargetType = 'attraction' | 'business' | 'guide';

export interface Review {
  _id: string;
  userId:
    | {
        _id: string;
        username: string;
        avatar?: string;
      }
    | string;
  targetId: string;
  targetType: ReviewTargetType;
  rating: number;
  title?: string;
  text: string;
  images: string[];
  isEdited?: boolean;
  editableUntil?: string;
  status?: 'published' | 'flagged' | 'removed';
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

// Event types
export interface Event {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  style?: 'soft' | 'bold' | 'image';
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  badgeText?: string;
  badgeEmoji?: string;
  ctaLabel?: string;
  overlayOpacity?: number;
  textTheme?: 'light' | 'dark';
  coordinates?: {
    lat: number;
    lng: number;
  };
  image?: string;
  link?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ======================
// QUESTS API
// ======================

export interface QuestTask {
  _id?: string;
  title: string;
  description: string;
  locationId?: string;
  qrCodeData?: string;
}

export interface Quest {
  _id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  badgeImage: string;
  totalExp: number;
  reward: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  tasks: QuestTask[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserQuest {
  _id: string;
  userId: string;
  questId: string | Quest;
  status: 'active' | 'completed' | 'dropped';
  completedTaskIds: string[];
  startedAt: string;
  completedAt?: string;
}

export interface GameSettings {
  confettiEnabled: boolean;
  xpPerScan: number;
  cooldownSeconds: number;
  defaultNextRoute?: string;
  navigationRules: Array<{
    pattern: string;
    targetRoute: string;
    rewardXp?: number;
    confetti?: boolean;
    note?: string;
    enabled?: boolean;
  }>;
}

export interface CreateQuestData {
  title: string;
  slug?: string;
  description: string;
  image: string;
  badgeImage: string;
  reward: string;
  totalExp?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  tasks: Omit<QuestTask, '_id'>[];
}

export interface UpdateQuestData extends Partial<CreateQuestData> {}

export const questsApi = {
  getAll: () => {
    return apiClient<{ quests: Quest[] }>('/quests');
  },

  getAllAdmin: () => {
    return apiClient<{ quests: Quest[] }>('/quests/admin/all');
  },

  getMyProgress: () => {
    return apiClient<{ userQuests: UserQuest[] }>('/quests/my-progress');
  },

  getById: (id: string) => {
    return apiClient<{ quest: Quest; userQuest: UserQuest | null }>(`/quests/${id}`);
  },

  create: (data: CreateQuestData) => {
    return apiClient<{ quest: Quest; slug: string }>('/quests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: UpdateQuestData) => {
    return apiClient<{ quest: Quest }>(`/quests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return apiClient<{ message: string }>(`/quests/${id}`, {
      method: 'DELETE',
    });
  },

  start: (id: string) => {
    return apiClient<{ userQuest: UserQuest }>(`/quests/${id}/start`, {
      method: 'POST',
    });
  },

  scan: (qrData: string, location?: { lat: number; lng: number }) => {
    return apiClient<{
      message: string;
      isQuestComplete: boolean;
      quest: Quest;
      task: any;
      progress: UserQuest;
      reward?: string;
      xpAwarded?: number;
      nextRoute?: string | null;
      confetti?: boolean;
    }>('/quests/scan', {
      method: 'POST',
      body: JSON.stringify({ qrData, location }),
    });
  },
};

// ======================
// GAMIFICATION API
// ======================

export const gamificationApi = {
  getSettings: () => apiClient<{ settings: GameSettings }>('/gamification/settings'),
  updateSettings: (settings: Partial<GameSettings>) => apiClient<{ settings: GameSettings }>(
    '/gamification/settings',
    {
      method: 'PUT',
      body: JSON.stringify(settings),
    }
  ),
};

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
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return apiClient<{ message: string }>(`/attractions/${id}`, {
      method: 'DELETE',
    });
  },

  // Bulk sync all attractions to use OSM coordinates
  syncOsmCoordinates: () => {
    return apiClient<{ message: string; synced: number; failed: number; fetched: number; reused: number }>(
      '/attractions/sync-osm-coordinates',
      {
        method: 'POST',
      }
    );
  },

  // Sync a single attraction via OSM
  syncOsmById: (id: string, activate = false) => {
    return apiClient<{ attraction: Attraction }>(`/attractions/${id}/sync-osm`, {
      method: 'POST',
      body: JSON.stringify({ activate }),
    });
  },

  // Bulk set all attractions to use database coordinates
  useDbCoordinates: () => {
    return apiClient<{ message: string; updated: number }>(
      '/attractions/use-db-coordinates',
      {
        method: 'POST',
      }
    );
  },

  // Discover places from OpenStreetMap
  discoverOsmPlaces: () => {
    return apiClient<{
      places: OsmPlace[];
      total: number;
      newPlaces: number;
    }>('/attractions/osm/discover');
  },

  // Import a single place from OSM
  importOsmPlace: (place: {
    osmId: string;
    name: string;
    category: string;
    lat: number;
    lng: number;
    description?: string;
    address?: string;
  }) => {
    return apiClient<{ attraction: Attraction }>('/attractions/osm/import', {
      method: 'POST',
      body: JSON.stringify(place),
    });
  },
};

// OSM Place type for discovery
export interface OsmPlace {
  osmId: string;
  name: string;
  category: string;
  displayCategory?: string;
  lat: number;
  lng: number;
  description?: string;
  address?: string;
  tags?: Record<string, string>;
  alreadyExists: boolean;
}

// ======================
// BUSINESSES API
// ======================

export const businessesApi = {
  getAll: (params?: { type?: string; verified?: boolean; featured?: boolean; nearAttraction?: string; status?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.verified) searchParams.set('verified', 'true');
    if (params?.featured) searchParams.set('featured', 'true');
    if (params?.nearAttraction) searchParams.set('nearAttraction', params.nearAttraction);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return apiClient<{ businesses: Business[] }>(`/businesses${query ? `?${query}` : ''}`);
  },

  // Admin: get all businesses including pending/suspended
  getAllAdmin: () => {
    return apiClient<{ businesses: Business[] }>('/businesses/admin/all');
  },

  getById: (id: string) => {
    return apiClient<{ business: Business }>(`/businesses/${id}`);
  },

  getMine: () => {
    return apiClient<{ businesses: Business[] }>('/businesses/me/list');
  },

  create: (data: Partial<Business>) => {
    return apiClient<{ business: Business }>('/businesses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: Partial<Business>) => {
    return apiClient<{ business: Business }>(`/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return apiClient<{ message: string }>(`/businesses/${id}`, {
      method: 'DELETE',
    });
  },

  verify: (id: string, verified: boolean) => {
    return apiClient<{ business: Business }>(`/businesses/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ verified }),
    });
  },

  // Admin: update status
  updateStatus: (id: string, status: 'active' | 'pending' | 'suspended') => {
    return apiClient<{ business: Business }>(`/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Get businesses for map display
  getMapLocations: () => {
    return apiClient<{ locations: BusinessMapLocation[] }>('/businesses/map/locations');
  },

  // Discover businesses from OpenStreetMap
  discoverOsmPlaces: () => {
    return apiClient<{
      places: OsmBusinessPlace[];
      total: number;
      newPlaces: number;
    }>('/businesses/osm/discover');
  },

  // Import a single business from OSM
  importOsmPlace: (place: {
    osmId: string;
    name: string;
    type: string;
    lat: number;
    lng: number;
    description?: string;
    address?: string;
    phone?: string;
    website?: string;
  }) => {
    return apiClient<{ business: Business }>('/businesses/osm/import', {
      method: 'POST',
      body: JSON.stringify(place),
    });
  },
};

// OSM Business Place type for discovery
export interface OsmBusinessPlace {
  osmId: string;
  name: string;
  type: string;
  displayType?: string;
  lat: number;
  lng: number;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  alreadyExists: boolean;
}

// ======================
// REVIEWS API
// ======================

export const reviewsApi = {
  getByTarget: (targetType: ReviewTargetType, targetId: string, params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('targetType', targetType);
    searchParams.set('targetId', targetId);
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

    return apiClient<{
      reviews: Review[];
      stats: { averageRating: number; reviewCount: number };
      pagination: { total: number; limit: number; offset: number; hasMore: boolean };
    }>(`/reviews?${searchParams.toString()}`);
  },

  getMine: () => {
    return apiClient<{ reviews: Review[] }>('/reviews/me');
  },

  create: (data: {
    targetId: string;
    targetType: ReviewTargetType;
    rating: number;
    text: string;
    title?: string;
    images?: string[];
  }) => {
    return apiClient<{ review: Review }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: { rating?: number; title?: string; text?: string }) => {
    return apiClient<{ review: Review }>(`/reviews/${id}`, {
      method: 'PATCH',
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
// EVENTS API
// ======================

export const eventsApi = {
  getAll: (active?: boolean) => {
    const query = active ? '?active=true' : '';
    return apiClient<{ events: Event[] }>(`/events${query}`);
  },

  getById: (id: string) => {
    return apiClient<{ event: Event }>(`/events/${id}`);
  },

  create: (data: Partial<Event>) => {
    return apiClient<{ event: Event }>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: Partial<Event>) => {
    return apiClient<{ event: Event }>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return apiClient<{ message: string }>(`/events/${id}`, {
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
      body: JSON.stringify({ approved: isVerified }),
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
    }>('/media/sign', {
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
    formData.append('upload_preset', 'bisita_uploads');

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
            return;
          }

          try {
            const errorBody = JSON.parse(xhr.responseText);
            reject(new Error(errorBody?.error?.message || 'Upload failed'));
          } catch {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
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
    const encodedId = encodeURIComponent(publicId);
    return apiClient<{ message: string }>(`/media/${encodedId}`, {
      method: 'DELETE',
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

// ======================
// USERS API
// ======================

export const usersApi = {
  getAll: () => {
    return apiClient<{ users: any[] }>('/users');
  },

  setEmailVerified: (id: string, isEmailVerified: boolean) => {
    return apiClient<{ user: any }>(`/users/${id}/email-verified`, {
      method: 'PATCH',
      body: JSON.stringify({ isEmailVerified }),
    });
  },

  updateRole: (id: string, data: { role: string; managedEntityId?: string }) => {
    return apiClient<{ user: any }>(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  resetPassword: (id: string, password: string) => {
    return apiClient<{ message: string }>(`/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    });
  },
};
