/**
 * Secure logging utility that strips sensitive data
 * Prevents accidental logging of tokens, keys, passwords, etc.
 */

const SENSITIVE_KEYS = [
  'token',
  'accessToken',
  'password',
  'secret',
  'privateKey',
  'sshPrivateKey',
  'apiKey',
  'authorization',
  'cookie',
  'session',
  'credentials',
];

const SENSITIVE_PATTERNS = [
  /ghp_[a-zA-Z0-9]{36}/, // GitHub PAT tokens
  /gho_[a-zA-Z0-9]{36}/, // GitHub OAuth tokens
  /ghs_[a-zA-Z0-9]{36}/, // GitHub Server tokens
  /github_pat_[a-zA-Z0-9_]{82}/, // GitHub fine-grained PAT
  /-----BEGIN .* PRIVATE KEY-----/, // Private keys
  /sk-[a-zA-Z0-9]{48}/, // API keys (common pattern)
];

/**
 * Recursively sanitize an object by removing or masking sensitive data
 */
function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 10) return '[Max Depth Reached]'; // Prevent infinite recursion

  if (obj === null || obj === undefined) return obj;

  // Handle primitives
  if (typeof obj !== 'object') {
    return sanitizeString(String(obj));
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  // Handle objects
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if key is sensitive
    const isSensitiveKey = SENSITIVE_KEYS.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey.toLowerCase())
    );

    if (isSensitiveKey) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize a string by masking sensitive patterns
 */
function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') return str;

  let sanitized = str;

  // Check against all sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
  }

  return sanitized;
}

/**
 * Safe console.error that strips sensitive data
 */
export function secureError(message: string, error?: any) {
  if (error) {
    const sanitizedError = sanitizeObject(error);
    console.error(`[SECURE] ${message}`, {
      message: error.message,
      name: error.name,
      code: error.code,
      // Only log sanitized version of error
      ...(process.env.NODE_ENV === 'development' && { details: sanitizedError }),
    });
  } else {
    console.error(`[SECURE] ${message}`);
  }
}

/**
 * Safe console.log that strips sensitive data
 */
export function secureLog(message: string, data?: any) {
  if (data) {
    const sanitized = sanitizeObject(data);
    console.log(`[SECURE] ${message}`, sanitized);
  } else {
    console.log(`[SECURE] ${message}`);
  }
}

/**
 * Safe console.warn that strips sensitive data
 */
export function secureWarn(message: string, data?: any) {
  if (data) {
    const sanitized = sanitizeObject(data);
    console.warn(`[SECURE] ${message}`, sanitized);
  } else {
    console.warn(`[SECURE] ${message}`);
  }
}

/**
 * Audit log for sensitive operations
 * In production, this should go to a secure audit logging service
 */
export function auditLog(
  userId: string,
  action: string,
  resource: string,
  details?: any
) {
  const sanitized = details ? sanitizeObject(details) : {};

  const auditEntry = {
    timestamp: new Date().toISOString(),
    userId,
    action,
    resource,
    details: sanitized,
    ip: '[IP would be logged here]',
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', auditEntry);
  }

  // In production, send to audit logging service (e.g., AWS CloudWatch, Datadog, etc.)
  // TODO: Implement production audit logging
}
