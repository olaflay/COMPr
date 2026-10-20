import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDestinationStorageUri,
  buildDestinationStorageClient,
  uploadToStorageDestination,
  type StorageDestinationConfig,
} from '../lib/destination-storage.ts';

describe('Vecteus Destination Storage Dispatch', () => {
  it('formats S3 and R2 destination URIs correctly', () => {
    assert.equal(
      formatDestinationStorageUri('s3', 'tenant-prod-bucket', 'videos/output.mp4'),
      's3://tenant-prod-bucket/videos/output.mp4'
    );

    assert.equal(
      formatDestinationStorageUri('r2', 'tenant-edge-bucket', '/encoded/clip.mp4'),
      'r2://tenant-edge-bucket/encoded/clip.mp4'
    );
  });

  it('builds an S3Client instance from destination config', () => {
    const config: StorageDestinationConfig = {
      protocol: 's3',
      bucketName: 'customer-bucket',
      region: 'us-east-1',
      accessKeyId: 'AKIA_DEMO_KEY',
      secretAccessKey: 'SECRET_DEMO_KEY',
    };

    const client = buildDestinationStorageClient(config);
    assert.ok(client);
  });

  it('dispatches file upload using provided S3 client', async () => {
    const config: StorageDestinationConfig = {
      protocol: 's3',
      bucketName: 'customer-bucket',
      region: 'us-east-1',
      accessKeyId: 'AKIA_DEMO_KEY',
      secretAccessKey: 'SECRET_DEMO_KEY',
    };

    let sentCommand: any = null;
    const fakeClient = {
      send: async (cmd: any) => {
        sentCommand = cmd;
        return { ETag: '"demo_etag"' };
      },
    } as any;

    const uri = await uploadToStorageDestination(
      config,
      'videos/job123/final.mp4',
      'package.json',
      fakeClient
    );

    assert.equal(uri, 's3://customer-bucket/videos/job123/final.mp4');
    assert.equal(sentCommand?.input?.Bucket, 'customer-bucket');
    assert.equal(sentCommand?.input?.Key, 'videos/job123/final.mp4');
  });
});
