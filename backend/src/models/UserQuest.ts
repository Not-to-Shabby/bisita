import mongoose, { Document, Schema } from 'mongoose';

export interface IUserQuest extends Document {
  userId: mongoose.Types.ObjectId;
  questId: mongoose.Types.ObjectId;
  completedTaskIds: string[]; // IDs of tasks within the quest that are done
  status: 'active' | 'completed' | 'dropped';
  startedAt: Date;
  completedAt?: Date;
}

const userQuestSchema = new Schema<IUserQuest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questId: { type: Schema.Types.ObjectId, ref: 'Quest', required: true },
    completedTaskIds: [{ type: String }], // Assuming tasks might have sub-IDs or we use index
    status: { 
      type: String, 
      enum: ['active', 'completed', 'dropped'], 
      default: 'active' 
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date
  },
  { timestamps: true }
);

// Ensure a user can only have one active instance of a specific quest? 
// Or maybe just one record per quest per user.
userQuestSchema.index({ userId: 1, questId: 1 }, { unique: true });

const UserQuest = mongoose.model<IUserQuest>('UserQuest', userQuestSchema);
export default UserQuest;
