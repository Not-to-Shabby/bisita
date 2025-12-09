import mongoose, { Schema, Document } from 'mongoose';

export interface INavigationRule {
  pattern: string; // simple substring match for qrData
  targetRoute: string; // e.g., /attraction/:id
  rewardXp?: number;
  confetti?: boolean;
  note?: string;
  enabled?: boolean;
}

export interface IGameSettings extends Document {
  confettiEnabled: boolean;
  xpPerScan: number;
  cooldownSeconds: number;
  defaultNextRoute?: string;
  navigationRules: INavigationRule[];
  updatedAt: Date;
  createdAt: Date;
}

const navigationRuleSchema = new Schema<INavigationRule>({
  pattern: { type: String, required: true },
  targetRoute: { type: String, required: true },
  rewardXp: { type: Number, default: 0 },
  confetti: { type: Boolean, default: undefined },
  note: { type: String },
  enabled: { type: Boolean, default: true },
});

const gameSettingsSchema = new Schema<IGameSettings>(
  {
    confettiEnabled: { type: Boolean, default: true },
    xpPerScan: { type: Number, default: 25 },
    cooldownSeconds: { type: Number, default: 0 },
    defaultNextRoute: { type: String },
    navigationRules: { type: [navigationRuleSchema], default: [] },
  },
  { timestamps: true }
);

const GameSettings = mongoose.model<IGameSettings>('GameSettings', gameSettingsSchema);
export default GameSettings;
