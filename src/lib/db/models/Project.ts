import mongoose, { Schema, Model } from 'mongoose';
import { Project, ProjectDocument, ProjectFile } from '@/types';

const ProjectFileSchema = new Schema<ProjectFile>({
  path: { type: String, required: true },
  content: { type: String, required: true },
  language: { type: String, required: true },
  size: { type: Number, required: true },
  createdBy: {
    type: String,
    enum: ['ai', 'user'],
    required: true,
  },
  version: { type: Number, default: 1 },
  hash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ProjectSchema = new Schema<ProjectDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    settings: {
      template: { type: String, required: true },
      language: {
        type: String,
        enum: ['typescript', 'javascript', 'python'],
        default: 'typescript',
      },
      framework: { type: String, required: true },
      packageManager: {
        type: String,
        enum: ['npm', 'yarn', 'pnpm'],
        default: 'npm',
      },
      styling: { type: String, default: 'tailwind' },
    },
    requirements: {
      raw: { type: String },
      structured: {
        features: [{ type: String }],
        techStack: [{ type: String }],
        constraints: [{ type: String }],
      },
      summary: { type: String },
    },
    files: [ProjectFileSchema],
    status: {
      type: String,
      enum: ['draft', 'active', 'archived', 'deleted'],
      default: 'draft',
    },
    stats: {
      totalFiles: { type: Number, default: 0 },
      totalLines: { type: Number, default: 0 },
      totalSize: { type: Number, default: 0 },
    },
    github: {
      connected: { type: Boolean, default: false },
      repoUrl: { type: String },
      repoName: { type: String },
      repoOwner: { type: String },
      branch: { type: String, default: 'main' },
      authMethod: {
        type: String,
        enum: ['ssh', 'pat', 'none'],
        default: 'none',
      },
      accessToken: { type: String }, // Encrypted PAT token
      sshPublicKey: { type: String },
      sshPrivateKey: { type: String }, // Encrypted private key
      lastSyncedAt: { type: Date },
      syncStatus: {
        type: String,
        enum: ['synced', 'pending', 'error', 'never'],
        default: 'never',
      },
      lastCommitSha: { type: String },
      autoSync: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ slug: 1, userId: 1 }, { unique: true });
ProjectSchema.index({ status: 1 });

// Methods
ProjectSchema.methods.updateStats = function () {
  this.stats.totalFiles = this.files.length;
  this.stats.totalLines = this.files.reduce((acc: number, file: any) => {
    return acc + (file.content.split('\n').length || 0);
  }, 0);
  this.stats.totalSize = this.files.reduce((acc: number, file: any) => {
    return acc + file.size;
  }, 0);
};

// Pre-save middleware
ProjectSchema.pre('save', function () {
  if (this.isModified('files')) {
    this.updateStats();
  }
});

const ProjectModel: Model<ProjectDocument> =
  mongoose.models.Project || mongoose.model<ProjectDocument>('Project', ProjectSchema);

export default ProjectModel;
