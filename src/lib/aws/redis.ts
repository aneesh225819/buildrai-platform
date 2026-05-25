import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_TLS = process.env.REDIS_TLS === 'true';

if (!process.env.REDIS_HOST) {
  console.warn('⚠️  REDIS_HOST is not set in environment variables - using localhost');
}

// Create Redis client for AWS ElastiCache with lazy connection
const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  tls: REDIS_TLS ? {} : undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true, // Changed to true to prevent immediate connection attempt
  enableOfflineQueue: true, // Queue commands when disconnected
});

// Event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  console.log('⚠️  Redis connection closed');
});

/**
 * Cache utilities
 */

// Get cached value
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
}

// Set cached value with TTL (in seconds)
export async function setCache(
  key: string,
  value: any,
  ttl: number = 300
): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
}

// Delete cached value
export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Error deleting cache:', error);
  }
}

// Check if key exists
export async function hasCache(key: string): Promise<boolean> {
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('Error checking cache:', error);
    return false;
  }
}

/**
 * Session management
 */

// Store session
export async function setSession(
  sessionId: string,
  data: any,
  ttl: number = 86400 // 24 hours
): Promise<void> {
  await setCache(`session:${sessionId}`, data, ttl);
}

// Get session
export async function getSession<T>(sessionId: string): Promise<T | null> {
  return getCache<T>(`session:${sessionId}`);
}

// Delete session
export async function deleteSession(sessionId: string): Promise<void> {
  await deleteCache(`session:${sessionId}`);
}

/**
 * Rate limiting
 */

// Check rate limit
export async function checkRateLimit(
  key: string,
  limit: number,
  window: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, window);
    }

    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);

    return { allowed, remaining };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true, remaining: limit };
  }
}

// Reset rate limit
export async function resetRateLimit(key: string): Promise<void> {
  await deleteCache(key);
}

/**
 * Job status tracking
 */

// Set job status
export async function setJobStatus(
  jobId: string,
  status: any,
  ttl: number = 3600
): Promise<void> {
  await setCache(`job:${jobId}`, status, ttl);
}

// Get job status
export async function getJobStatus(jobId: string): Promise<any> {
  return getCache(`job:${jobId}`);
}

// Update job progress
export async function updateJobProgress(
  jobId: string,
  progress: number
): Promise<void> {
  const status = await getJobStatus(jobId);
  if (status) {
    status.progress = progress;
    await setJobStatus(jobId, status);
  }
}

/**
 * Pub/Sub for real-time updates
 */

// Publish message
export async function publish(channel: string, message: any): Promise<void> {
  try {
    await redis.publish(channel, JSON.stringify(message));
  } catch (error) {
    console.error('Error publishing message:', error);
  }
}

// Subscribe to channel
export function subscribe(
  channel: string,
  callback: (message: any) => void
): Redis {
  const subscriber = redis.duplicate();

  subscriber.subscribe(channel, (err) => {
    if (err) {
      console.error('Error subscribing to channel:', err);
    }
  });

  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        callback(JSON.parse(message));
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  });

  return subscriber;
}

export default redis;
