import mongoose, { Document, Schema } from 'mongoose';

export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface IGuideBooking extends Document {
  _id: mongoose.Types.ObjectId;
  
  // Parties
  touristId: mongoose.Types.ObjectId;
  guideId: mongoose.Types.ObjectId;
  
  // Booking details
  attractionIds: mongoose.Types.ObjectId[];
  date: Date;
  duration: string; // e.g., "Half day", "Full day"
  groupSize: number;
  notes?: string;
  
  // Status
  status: BookingStatus;
  
  // Communication
  guideResponse?: string;
  respondedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const guideBookingSchema = new Schema<IGuideBooking>(
  {
    touristId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    guideId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    attractionIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Attraction',
    }],
    date: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: String,
      required: true,
    },
    groupSize: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    notes: String,
    
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    
    guideResponse: String,
    respondedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for queries
guideBookingSchema.index({ guideId: 1, status: 1, date: -1 });
guideBookingSchema.index({ touristId: 1, status: 1, date: -1 });

const GuideBooking = mongoose.model<IGuideBooking>('GuideBooking', guideBookingSchema);

export default GuideBooking;
