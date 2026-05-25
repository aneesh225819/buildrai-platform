import mongoose, { Schema, Model } from 'mongoose';
import { ChatSession, ChatMessage } from '@/types';

const ChatMessageSchema = new Schema<ChatMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  metadata: {
    tokenCount: { type: Number },
    model: { type: String },
    responseTime: { type: Number },
    cost: { type: Number },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ChatSessionSchema = new Schema<ChatSession>(
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
    projectId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['requirements', 'code_generation', 'debugging', 'general'],
      default: 'general',
    },
    messages: [ChatMessageSchema],
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });
ChatSessionSchema.index({ projectId: 1 });
ChatSessionSchema.index({ status: 1 });

// Virtual for message count
ChatSessionSchema.virtual('messageCount').get(function () {
  return this.messages.length;
});

// Virtual for total tokens
ChatSessionSchema.virtual('totalTokens').get(function () {
  return this.messages.reduce((acc, msg) => {
    return acc + (msg.metadata?.tokenCount || 0);
  }, 0);
});

// Virtual for total cost
ChatSessionSchema.virtual('totalCost').get(function () {
  return this.messages.reduce((acc, msg) => {
    return acc + (msg.metadata?.cost || 0);
  }, 0);
});

// Methods
ChatSessionSchema.methods.addMessage = function (
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: ChatMessage['metadata']
) {
  this.messages.push({
    role,
    content,
    metadata,
    createdAt: new Date(),
  });

  // Auto-generate title from first user message
  if (this.messages.length === 1 && role === 'user') {
    this.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
  }

  return this.save();
};

const ChatSessionModel: Model<ChatSession> =
  mongoose.models.ChatSession ||
  mongoose.model<ChatSession>('ChatSession', ChatSessionSchema);

export default ChatSessionModel;
