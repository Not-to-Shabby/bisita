import mongoose, { Document, Schema } from 'mongoose';

export interface IMedia extends Document {
  _id: mongoose.Types.ObjectId;
  uploaderId: mongoose.Types.ObjectId;
  
  // Cloudinary data
  url: string;
  thumbnailUrl?: string;
  publicId: string; // Cloudinary public_id for deletion
  
  // Metadata
  type: 'image' | 'video';
  width?: number;
  height?: number;
  size: number; // bytes
  format: string;
  
  // Association
  associatedWith?: {
    type: 'attraction' | 'business' | 'review' | 'user';
    id: mongoose.Types.ObjectId;
  };
  
  // Timestamps
  createdAt: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: String,
    publicId: {
      type: String,
      required: true,
      unique: true,
    },
    
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    width: Number,
    height: Number,
    size: {
      type: Number,
      required: true,
    },
    format: {
      type: String,
      required: true,
    },
    
    associatedWith: {
      type: {
        type: String,
        enum: ['attraction', 'business', 'review', 'user'],
      },
      id: Schema.Types.ObjectId,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index for finding media by association
mediaSchema.index({ 'associatedWith.type': 1, 'associatedWith.id': 1 });

const Media = mongoose.model<IMedia>('Media', mediaSchema);

export default Media;
