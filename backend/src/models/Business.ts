import mongoose, { Document, Schema } from 'mongoose';

export type BusinessType = 'accommodation' | 'restaurant' | 'activity' | 'guide_service' | 'shop' | 'transport';

export interface IBusiness extends Document {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  
  name: string;
  slug: string;
  type: BusinessType;
  tagline?: string;
  description: string;
  
  // Location
  location: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Contact
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    facebook?: string;
    messenger?: string;
  };
  
  // Transport (how to get there)
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
  
  // Images
  images: string[];
  
  // Proximity ads - which attractions this business appears near
  nearAttractionIds: mongoose.Types.ObjectId[];
  
  // Stats
  stats: {
    rating: number;
    reviewCount: number;
  };
  
  // Status
  isVerified: boolean;
  isFeatured: boolean;
  isActive: boolean;
  status: 'active' | 'pending' | 'suspended';
  
  // Legacy
  legacyId?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<IBusiness>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
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
    type: {
      type: String,
      enum: ['accommodation', 'restaurant', 'activity', 'guide_service', 'shop', 'transport'],
      required: true,
      index: true,
    },
    tagline: String,
    description: {
      type: String,
      required: true,
    },
    
    location: {
      address: { type: String, required: true },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    
    contact: {
      phone: String,
      email: String,
      website: String,
      facebook: String,
      messenger: String,
    },
    
    transport: {
      vehicle: String,
      route: String,
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
      note: String,
    },
    
    images: [String],
    
    nearAttractionIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Attraction',
    }],
    
    stats: {
      rating: { type: Number, default: 0, min: 0, max: 5 },
      reviewCount: { type: Number, default: 0 },
    },
    
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'pending',
      index: true,
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

// Text search
businessSchema.index({ name: 'text', description: 'text', tagline: 'text' });

const Business = mongoose.model<IBusiness>('Business', businessSchema);

export default Business;
