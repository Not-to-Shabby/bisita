import mongoose, { Document, Schema } from 'mongoose';

export interface IAttraction extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  
  // Location
  location: {
    address: string;
    barangay?: string;
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
      fetchedAt?: Date;
      sourceId?: string;
    };
  };
  
  // Categorization
  category: 'waterfall' | 'spring' | 'heritage' | 'park' | 'viewpoint' | 'museum' | 'religious' | 'nature' | 'other';
  tags?: string[];
  
  // Images
  images: Array<{
    url: string;
    caption?: string;
    isPrimary?: boolean;
  }>;
  
  // Visitor information
  visitorInfo: {
    entranceFee?: string;
    shuttleFee?: string;
    operatingHours?: string;
    tips?: string;
    amenities?: string[];
  };
  
  // Transport guide
  transport?: {
    vehicle: string;
    route: string;
    note: string;
    duration?: string;
    fares: {
      regular?: string;
      discounted?: string;
      habal?: string;
    };
    segments?: ('Jeepney' | 'Tricycle' | 'Habal-habal' | 'Walk' | 'Bus')[];
  };
  
  // Stats (denormalized for performance)
  stats: {
    rating: number;
    reviewCount: number;
    viewCount: number;
  };
  
  // Status
  status: 'active' | 'pending' | 'archived';
  isFeatured: boolean;
  
  // Coordinate source preference
  useOsmCoordinates: boolean;
  
  // Legacy support
  legacyId?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const attractionSchema = new Schema<IAttraction>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: 'text',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    
    location: {
      address: { type: String, required: true },
      barangay: String,
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      manualCoordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
      osmCoordinates: {
        lat: Number,
        lng: Number,
        fetchedAt: Date,
        sourceId: String,
      },
    },
    
    category: {
      type: String,
      enum: ['waterfall', 'spring', 'heritage', 'park', 'viewpoint', 'museum', 'religious', 'nature', 'other'],
      required: true,
      index: true,
    },
    tags: [String],
    
    images: [
      {
        url: { type: String, required: true },
        caption: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    
    visitorInfo: {
      entranceFee: String,
      shuttleFee: String,
      operatingHours: String,
      tips: String,
      amenities: [String],
    },
    
    transport: {
      vehicle: String,
      route: String,
      note: String,
      duration: String,
      fares: {
        regular: String,
        discounted: String,
        habal: String,
      },
      segments: [{
        type: String,
        enum: ['Jeepney', 'Tricycle', 'Habal-habal', 'Walk', 'Bus'],
      }],
    },
    
    stats: {
      rating: { type: Number, default: 0, min: 0, max: 5 },
      reviewCount: { type: Number, default: 0 },
      viewCount: { type: Number, default: 0 },
    },
    
    status: {
      type: String,
      enum: ['active', 'pending', 'archived'],
      default: 'active',
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    useOsmCoordinates: {
      type: Boolean,
      default: false,
    },
    
    legacyId: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for geo queries
attractionSchema.index({ 'location.coordinates.lat': 1, 'location.coordinates.lng': 1 });

// Text search index
attractionSchema.index({ name: 'text', description: 'text', 'location.address': 'text' });

const Attraction = mongoose.model<IAttraction>('Attraction', attractionSchema);

export default Attraction;
