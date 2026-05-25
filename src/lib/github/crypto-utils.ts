import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment variable
 * SECURITY: ENCRYPTION_KEY is REQUIRED in production
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  // In production, ENCRYPTION_KEY MUST be set
  if (process.env.NODE_ENV === 'production' && !key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required in production. ' +
      'Generate a strong key: openssl rand -hex 32'
    );
  }

  // In development, warn if using default key
  if (!key) {
    console.warn(
      '⚠️ WARNING: Using default encryption key. Set ENCRYPTION_KEY in .env.local for security.'
    );
    const defaultKey = 'dev-only-encryption-key-not-for-production-use';
    return crypto.createHash('sha256').update(defaultKey).digest();
  }

  // Validate key strength (minimum 32 characters)
  if (key.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY must be at least 32 characters long. ' +
      'Generate a strong key: openssl rand -hex 32'
    );
  }

  // Derive a proper 256-bit key using SHA-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt sensitive data (SSH keys, tokens, etc.)
 * Returns: hex-encoded string with IV + AuthTag + Encrypted data
 */
export function encrypt(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Cannot encrypt: input must be a non-empty string');
  }

  // Additional validation for extremely long inputs (potential DoS)
  if (text.length > 100000) {
    throw new Error('Cannot encrypt: input exceeds maximum size (100KB)');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + AuthTag + Encrypted data
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypt sensitive data
 * SECURITY: Throws generic error to prevent information leakage
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData || typeof encryptedData !== 'string') {
    // Generic error - don't reveal what went wrong
    throw new Error('Decryption failed: Invalid input');
  }

  // Validate minimum length (IV + AuthTag must be present)
  const minLength = (IV_LENGTH + AUTH_TAG_LENGTH) * 2; // *2 for hex encoding
  if (encryptedData.length < minLength) {
    throw new Error('Decryption failed: Invalid input');
  }

  // Prevent extremely large inputs (potential DoS)
  if (encryptedData.length > 200000) {
    throw new Error('Decryption failed: Input too large');
  }

  try {
    const key = getEncryptionKey();

    // Extract IV, AuthTag, and encrypted data
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(
      encryptedData.slice(IV_LENGTH * 2, IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2),
      'hex'
    );
    const encrypted = encryptedData.slice(IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Generic error message - don't leak details about what went wrong
    // This prevents timing attacks and information leakage
    throw new Error('Decryption failed: Invalid input');
  }
}

/**
 * Hash sensitive data for comparison (one-way)
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Verify if plain text matches hashed value
 */
export function verifyHash(plainText: string, hashedText: string): boolean {
  return hash(plainText) === hashedText;
}
