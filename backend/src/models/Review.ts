import mongoose, { Document, Schema } from 'mongoose';

export type ReviewTargetType = 'attraction' | 'business' | 'guide';

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Polymorphic reference
  targetType: ReviewTargetType;
  targetId: mongoose.Types.ObjectId;
  
  // Content
  rating: number;
  title?: string;
  text: string;
  images: string[];
  
  // Edit tracking
  isEdited: boolean;
  editableUntil: Date; // 12 hours from creation
  
  // Status
  status: 'published' | 'flagged' | 'removed';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    targetType: {
      type: String,
      enum: ['attraction', 'business', 'guide'],
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    images: [String],
    
    isEdited: {
      type: Boolean,
      default: false,
    },
    editableUntil: {
      type: Date,
      required: true,
    },
    
    status: {
      type: String,
      enum: ['published', 'flagged', 'removed'],
      default: 'published',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for one review per user per target
reviewSchema.index(
  { userId: 1, targetType: 1, targetId: 1 },
  { unique: true }
);

// Index for listing reviews by target
reviewSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

// Pre-save hook to set editableUntil
reviewSchema.pre('save', function (next) {
  if (this.isNew) {
    // 12 hours from now
    this.editableUntil = new Date(Date.now() + 12 * 60 * 60 * 1000);
  }
  next();
});

const Review = mongoose.model<IReview>('Review', reviewSchema);

export default Review;
