import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream } from 'node:fs';

export interface StorageDestinationConfig {
  protocol: string;
  bucketName: string;
  endpoint?: string | null;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function buildDestinationStorageClient(config: StorageDestinationConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint || undefined,
    region: config.region || 'auto',
    forcePathStyle: config.protocol === 's3' ? false : true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function formatDestinationStorageUri(protocol: string, bucketName: string, key: string): string {
  const normalizedProtocol = protocol.toLowerCase() === 'r2' ? 'r2' : 's3';
  return `${normalizedProtocol}://${bucketName}/${key.replace(/^\/+/, '')}`;
}

export async function uploadToStorageDestination(
  destination: StorageDestinationConfig,
  key: string,
  localPath: string,
  client?: S3Client
): Promise<string> {
  const s3 = client || buildDestinationStorageClient(destination);
  const command = new PutObjectCommand({
    Bucket: destination.bucketName,
    Key: key,
    Body: createReadStream(localPath),
  });

  await s3.send(command);
  return formatDestinationStorageUri(destination.protocol, destination.bucketName, key);
}
