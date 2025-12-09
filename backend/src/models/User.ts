import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'tourist' | 'business_owner' | 'guide' | 'admin' | 'manager';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash?: string;
  username: string;
  avatar?: string;
  role: UserRole;
  managedEntityId?: string;
  isEmailVerified: boolean;
  
  // OAuth IDs
  googleId?: string;
  facebookId?: string;
  
  // Email verification
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  
  // Password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  
  // Guide-specific fields
  guideProfile?: {
    bio?: string;
    languages?: string[];
    specialties?: string[];
    rate?: number;
    status: 'available' | 'on_tour' | 'unavailable';
    isVerified: boolean;
    verificationSubmittedAt?: Date;
    phone?: string;
    messenger?: string;
  };
  
  // Stats
  stats: {
    reviewCount: number;
    contributionCount: number;
  };
  
  // Legacy support
  legacyId?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false, // Don't include in queries by default
    },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ['tourist', 'business_owner', 'guide', 'admin', 'manager'],
      default: 'tourist',
      index: true,
    },
    managedEntityId: {
      type: String,
      sparse: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    
    // OAuth
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    facebookId: {
      type: String,
      sparse: true,
      index: true,
    },
    
    // Tokens
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Guide profile
    guideProfile: {
      bio: String,
      languages: [String],
      specialties: [String],
      rate: Number,
      status: {
        type: String,
        enum: ['available', 'on_tour', 'unavailable'],
        default: 'available',
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      verificationSubmittedAt: Date,
      phone: String,
      messenger: String,
    },
    
    // Stats
    stats: {
      reviewCount: { type: Number, default: 0 },
      contributionCount: { type: Number, default: 0 },
    },
    
    // Legacy
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

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Ensure virtual id is included
userSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.passwordHash;
    delete ret.emailVerificationToken;
    delete ret.passwordResetToken;
    return ret;
  },
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
