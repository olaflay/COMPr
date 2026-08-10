import { Queue } from 'bullmq';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

declare global {
  var redisConnection: Redis | undefined;
  var mediaAnalysisQueue: Queue | undefined;
  var mediaEncodeQueue: Queue | undefined;
}

// Setup Redis connection options
export const redisConnection =
  global.redisConnection ||
  new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableOfflineQueue: false,
  });
redisConnection.on('error', () => {});

if (process.env.NODE_ENV !== 'production') {
  global.redisConnection = redisConnection;
}

// Define two separate queues per PRD §19
export const mediaAnalysisQueue =
  global.mediaAnalysisQueue ||
  new Queue('media-analysis', {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3, // transient error retry
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  global.mediaAnalysisQueue = mediaAnalysisQueue;
}

export const mediaEncodeQueue =
  global.mediaEncodeQueue ||
  new Queue('media-encode', {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  global.mediaEncodeQueue = mediaEncodeQueue;
}
