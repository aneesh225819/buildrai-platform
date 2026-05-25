// Core application types

export interface User {
  id: string;
  email: string;
  username: string;
  profile: {
    firstName: string;
    lastName: string;
    avatar?: string;
    bio?: string;
    company?: string;
    website?: string;
  };
  subscription: {
    plan: 'free' | 'pro' | 'business' | 'enterprise';
    status: 'active' | 'cancelled' | 'past_due';
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  };
  usage: {
    projectsCreated: number;
    projectsThisMonth: number;
    tokensUsed: number;
    deploymentsUsed: number;
    lastResetDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// User document with methods
export interface UserDocument extends User {
  canCreateProject(): boolean;
  resetMonthlyUsage(): Promise<UserDocument> | undefined;
  save(): Promise<UserDocument>;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  slug: string;
  settings: {
    template: string;
    language: 'typescript' | 'javascript' | 'python';
    framework: string;
    packageManager: 'npm' | 'yarn' | 'pnpm';
    styling: string;
  };
  requirements?: {
    raw: string;
    structured: {
      features: string[];
      techStack: string[];
      constraints: string[];
    };
    summary: string;
  };
  files: ProjectFile[];
  status: 'draft' | 'active' | 'archived' | 'deleted';
  stats: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
  };
  github?: {
    connected: boolean;
    repoUrl?: string;
    repoName?: string;
    repoOwner?: string;
    branch?: string;
    authMethod?: 'ssh' | 'pat' | 'none';
    accessToken?: string;
    sshPublicKey?: string;
    sshPrivateKey?: string;
    lastSyncedAt?: Date;
    syncStatus?: 'synced' | 'pending' | 'error' | 'never';
    lastCommitSha?: string;
    autoSync?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Project document with methods
export interface ProjectDocument extends Project {
  updateStats(): void;
  save(): Promise<ProjectDocument>;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  size: number;
  createdBy: 'ai' | 'user';
  version: number;
  hash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  type: 'requirements' | 'code_generation' | 'debugging' | 'general';
  messages: ChatMessage[];
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    tokenCount?: number;
    model?: string;
    responseTime?: number;
    cost?: number;
  };
  createdAt: Date;
}

export interface Job {
  id: string;
  userId: string;
  projectId?: string;
  type: 'code_generation' | 'quality_check' | 'security_scan' | 'deployment';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  data: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Agent types
export interface AgentState {
  userMessage: string;
  conversationHistory: ChatMessage[];
  requirements?: any;
  plan?: any;
  architecture?: any;
  generatedFiles?: ProjectFile[];
  reviewResults?: any[];
  currentStep: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// GitHub Integration types
export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  description: string;
  url: string;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: Date;
  };
  url: string;
}

export interface SSHKeyPair {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
  createdAt: Date;
}

export interface GitHubPushOptions {
  repoUrl: string;
  branch: string;
  commitMessage: string;
  author?: {
    name: string;
    email: string;
  };
  authMethod: 'ssh' | 'pat';
  token?: string;
  sshPrivateKey?: string;
}

export interface GitHubImportOptions {
  repoUrl: string;
  branch?: string;
  authMethod: 'ssh' | 'pat';
  token?: string;
  sshPrivateKey?: string;
}
