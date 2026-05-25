/**
 * Token Encryption Utilities
 *
 * Provides secure encryption/decryption for OAuth tokens stored in the database.
 * Uses AES-256-GCM for authenticated encryption.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 * In production, this should be a strong random key stored securely
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }

  // Derive a 256-bit key from the environment variable
  return crypto.pbkdf2Sync(key, 'buildrai-salt', 100000, 32, 'sha256');
}

/**
 * Encrypt a token using AES-256-GCM
 *
 * @param token - The plain text token to encrypt
 * @returns Encrypted token in format: iv:authTag:encryptedData (all base64 encoded)
 */
export function encryptToken(token: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting token:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt a token encrypted with encryptToken
 *
 * @param encryptedToken - The encrypted token string
 * @returns Decrypted plain text token
 */
export function decryptToken(encryptedToken: string): string {
  try {
    const key = getEncryptionKey();

    // Split the encrypted token into its components
    const parts = encryptedToken.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivBase64, authTagBase64, encryptedData] = parts;

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error decrypting token:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Validate that a token encryption key is set and valid
 */
export function validateEncryptionKey(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
