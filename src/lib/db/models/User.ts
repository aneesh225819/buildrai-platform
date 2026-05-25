import mongoose, { Schema, Model } from 'mongoose';
import { User, UserDocument } from '@/types';

const UserSchema = new Schema<UserDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: false, // Optional - will be populated by Clerk webhook
      unique: true,
      sparse: true, // Allow multiple null values
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    profile: {
      firstName: { type: String, required: false }, // Optional - populated by webhook
      lastName: { type: String, required: false }, // Optional - populated by webhook
      avatar: { type: String },
      bio: { type: String },
      company: { type: String },
      website: { type: String },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'pro', 'business', 'enterprise'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'cancelled', 'past_due'],
        default: 'active',
      },
      currentPeriodStart: { type: Date },
      currentPeriodEnd: { type: Date },
    },
    usage: {
      projectsCreated: { type: Number, default: 0 },
      projectsThisMonth: { type: Number, default: 0 },
      tokensUsed: { type: Number, default: 0 },
      deploymentsUsed: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
UserSchema.index({ 'subscription.plan': 1 });
UserSchema.index({ createdAt: -1 });

// Methods
UserSchema.methods.canCreateProject = function () {
  const limits: Record<string, number> = {
    free: 3,
    pro: 25,
    business: Infinity,
    enterprise: Infinity,
  };

  return this.usage.projectsThisMonth < limits[this.subscription.plan];
};

UserSchema.methods.resetMonthlyUsage = function () {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);

  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.usage.projectsThisMonth = 0;
    this.usage.deploymentsUsed = 0;
    this.usage.lastResetDate = now;
    return this.save();
  }
};

const UserModel: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);

export default UserModel;
