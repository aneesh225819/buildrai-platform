import { Octokit } from 'octokit';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import {
  GitHubRepository,
  GitHubBranch,
  GitHubCommit,
  SSHKeyPair,
  GitHubPushOptions,
  GitHubImportOptions,
  ProjectFile,
} from '@/types';

/**
 * GitHub Service for repository operations
 * Handles GitHub API interactions, Git operations, SSH keys, and repository sync
 */
export class GitHubService {
  private octokit: Octokit | null = null;
  private git: SimpleGit;

  constructor(accessToken?: string) {
    if (accessToken) {
      this.octokit = new Octokit({ auth: accessToken });
    }
    this.git = simpleGit();
  }

  /**
   * Generate SSH key pair for GitHub authentication
   */
  async generateSSHKey(): Promise<SSHKeyPair> {
    return new Promise((resolve, reject) => {
      // Generate RSA key pair
      crypto.generateKeyPair(
        'rsa',
        {
          modulusLength: 4096,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
          },
        },
        (err, publicKey, privateKey) => {
          if (err) {
            reject(err);
            return;
          }

          // Generate fingerprint
          const hash = crypto.createHash('sha256');
          hash.update(publicKey);
          const fingerprint = hash.digest('hex');

          resolve({
            publicKey,
            privateKey,
            fingerprint,
            createdAt: new Date(),
          });
        }
      );
    });
  }

  /**
   * List user's GitHub repositories
   */
  async listRepositories(page = 1, perPage = 30): Promise<GitHubRepository[]> {
    if (!this.octokit) {
      throw new Error('GitHub token not provided');
    }

    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      page,
      per_page: perPage,
      sort: 'updated',
      direction: 'desc',
    });

    return data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      description: repo.description || '',
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      defaultBranch: repo.default_branch,
      createdAt: new Date(repo.created_at),
      updatedAt: new Date(repo.updated_at),
    }));
  }

  /**
   * Get repository branches
   */
  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    if (!this.octokit) {
      throw new Error('GitHub token not provided');
    }

    const { data } = await this.octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return data.map((branch) => ({
      name: branch.name,
      commit: {
        sha: branch.commit.sha,
        url: branch.commit.url,
      },
      protected: branch.protected,
    }));
  }

  /**
   * Create a new branch
   */
  async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    fromBranch: string = 'main'
  ): Promise<GitHubBranch> {
    if (!this.octokit) {
      throw new Error('GitHub token not provided');
    }

    // Get the SHA of the source branch
    const { data: ref } = await this.octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    // Create new branch
    const { data: newRef } = await this.octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    });

    return {
      name: branchName,
      commit: {
        sha: newRef.object.sha,
        url: newRef.object.url,
      },
      protected: false,
    };
  }

  /**
   * Import repository from GitHub
   */
  async importRepository(
    options: GitHubImportOptions
  ): Promise<{ files: ProjectFile[]; lastCommitSha: string }> {
    const tempDir = path.join(os.tmpdir(), `repo-${Date.now()}`);

    try {
      // Configure Git with authentication
      const git = simpleGit();

      // Clone options based on auth method
      const cloneOptions: string[] = [];
      if (options.authMethod === 'pat' && options.token) {
        // Use PAT token in URL
        const urlWithToken = options.repoUrl.replace(
          'https://',
          `https://${options.token}@`
        );
        await git.clone(urlWithToken, tempDir, [
          '--depth=1',
          ...(options.branch ? [`--branch=${options.branch}`] : []),
        ]);
      } else if (options.authMethod === 'ssh' && options.sshPrivateKey) {
        // Use SSH with private key
        const sshKeyPath = path.join(os.tmpdir(), `ssh-key-${Date.now()}`);
        await fs.writeFile(sshKeyPath, options.sshPrivateKey, { mode: 0o600 });

        await git.clone(options.repoUrl, tempDir, [
          '--depth=1',
          ...(options.branch ? [`--branch=${options.branch}`] : []),
          `--config=core.sshCommand=ssh -i ${sshKeyPath} -o StrictHostKeyChecking=no`,
        ]);

        // Clean up SSH key
        await fs.unlink(sshKeyPath);
      } else {
        throw new Error('Invalid auth method or missing credentials');
      }

      // Get last commit SHA
      const gitRepo = simpleGit(tempDir);
      const log = await gitRepo.log(['-1']);
      const lastCommitSha = log.latest?.hash || '';

      // Read all files from repository
      const files = await this.readDirectoryRecursive(tempDir);

      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      return { files, lastCommitSha };
    } catch (error: any) {
      // Clean up on error
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
      throw new Error(`Failed to import repository: ${error.message}`);
    }
  }

  /**
   * Push code to GitHub repository
   */
  async pushToRepository(
    files: ProjectFile[],
    options: GitHubPushOptions
  ): Promise<GitHubCommit> {
    const tempDir = path.join(os.tmpdir(), `push-${Date.now()}`);

    try {
      const git = simpleGit();

      // Clone or init repository
      if (options.authMethod === 'pat' && options.token) {
        const urlWithToken = options.repoUrl.replace(
          'https://',
          `https://${options.token}@`
        );
        await git.clone(urlWithToken, tempDir, ['--depth=1']);
      } else if (options.authMethod === 'ssh' && options.sshPrivateKey) {
        const sshKeyPath = path.join(os.tmpdir(), `ssh-key-${Date.now()}`);
        await fs.writeFile(sshKeyPath, options.sshPrivateKey, { mode: 0o600 });

        await git.clone(options.repoUrl, tempDir, [
          '--depth=1',
          `--config=core.sshCommand=ssh -i ${sshKeyPath} -o StrictHostKeyChecking=no`,
        ]);

        await fs.unlink(sshKeyPath);
      } else {
        throw new Error('Invalid auth method or missing credentials');
      }

      const gitRepo = simpleGit(tempDir);

      // Checkout branch
      const branches = await gitRepo.branchLocal();
      if (branches.all.includes(options.branch)) {
        await gitRepo.checkout(options.branch);
      } else {
        await gitRepo.checkoutLocalBranch(options.branch);
      }

      // Write files to repository
      for (const file of files) {
        const filePath = path.join(tempDir, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }

      // Configure git user
      if (options.author) {
        await gitRepo.addConfig('user.name', options.author.name);
        await gitRepo.addConfig('user.email', options.author.email);
      }

      // Stage, commit, and push
      await gitRepo.add('.');
      const commit = await gitRepo.commit(options.commitMessage);
      await gitRepo.push('origin', options.branch);

      // Clean up
      await fs.rm(tempDir, { recursive: true, force: true });

      return {
        sha: commit.commit,
        message: options.commitMessage,
        author: {
          name: options.author?.name || 'BuildrAI',
          email: options.author?.email || 'noreply@buildrai.com',
          date: new Date(),
        },
        url: `${options.repoUrl}/commit/${commit.commit}`,
      };
    } catch (error: any) {
      // Clean up on error
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
      throw new Error(`Failed to push to repository: ${error.message}`);
    }
  }

  /**
   * Create a new repository on GitHub
   */
  async createRepository(
    name: string,
    description: string,
    isPrivate: boolean = true
  ): Promise<GitHubRepository> {
    if (!this.octokit) {
      throw new Error('GitHub token not provided');
    }

    const { data } = await this.octokit.rest.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    });

    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      owner: data.owner.login,
      private: data.private,
      description: data.description || '',
      url: data.html_url,
      cloneUrl: data.clone_url,
      sshUrl: data.ssh_url,
      defaultBranch: data.default_branch,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Get authenticated user info
   */
  async getAuthenticatedUser() {
    if (!this.octokit) {
      throw new Error('GitHub token not provided');
    }

    const { data } = await this.octokit.rest.users.getAuthenticated();
    return {
      login: data.login,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      url: data.html_url,
    };
  }

  /**
   * Verify GitHub token
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      const testOctokit = new Octokit({ auth: token });
      await testOctokit.rest.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read directory recursively and convert to ProjectFile[]
   */
  private async readDirectoryRecursive(
    dir: string,
    baseDir: string = dir
  ): Promise<ProjectFile[]> {
    const files: ProjectFile[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      // Skip .git directory and other hidden files
      if (entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively read subdirectory
        const subFiles = await this.readDirectoryRecursive(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // Read file content
        const content = await fs.readFile(fullPath, 'utf-8');
        const stats = await fs.stat(fullPath);
        const hash = crypto.createHash('sha256').update(content).digest('hex');

        files.push({
          path: relativePath,
          content,
          language: this.detectLanguage(relativePath),
          size: stats.size,
          createdBy: 'user',
          version: 1,
          hash,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
        });
      }
    }

    return files;
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.java': 'java',
      '.rb': 'ruby',
      '.php': 'php',
      '.rs': 'rust',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.sh': 'bash',
      '.sql': 'sql',
      '.graphql': 'graphql',
      '.gql': 'graphql',
    };

    return languageMap[ext] || 'plaintext';
  }
}
