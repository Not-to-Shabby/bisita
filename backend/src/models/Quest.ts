import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestTask {
  title: string;
  description: string;
  locationId?: mongoose.Types.ObjectId; // Link to an attraction
  qrCodeData?: string; // Data expected when scanning QR
}

export interface IQuest extends Document {
  title: string;
  slug: string;
  description: string;
  image: string;
  badgeImage: string;
  tasks: IQuestTask[];
  reward: string;
  totalExp: number;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const questSchema = new Schema<IQuest>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    badgeImage: { type: String, required: true },
    tasks: [{
      title: { type: String, required: true },
      description: { type: String, required: true },
      locationId: { type: Schema.Types.ObjectId, ref: 'Attraction' },
      qrCodeData: { type: String }
    }],
    reward: { type: String, required: true },
    totalExp: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
    startDate: Date,
    endDate: Date
  },
  { timestamps: true }
);

const Quest = mongoose.model<IQuest>('Quest', questSchema);
export default Quest;
