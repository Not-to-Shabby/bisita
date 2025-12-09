import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String, required: true },
  style: { type: String, enum: ['soft', 'bold', 'image'], default: 'soft' },
  accentColor: { type: String, default: '#f97316' },
  textColor: { type: String, default: '#0f172a' },
  backgroundColor: { type: String, default: '#fff7ed' },
  gradientFrom: { type: String },
  gradientTo: { type: String },
  badgeText: { type: String, default: 'Upcoming' },
  badgeEmoji: { type: String, default: '🎉' },
  ctaLabel: { type: String, default: 'View' },
  overlayOpacity: { type: Number, min: 0, max: 90, default: 10 },
  textTheme: { type: String, enum: ['light', 'dark'], default: 'light' },
  coordinates: {
    lat: Number,
    lng: Number
  },
  image: { type: String },
  link: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IEvent>('Event', EventSchema);
