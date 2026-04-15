import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

/** Upload a Buffer to S3 and return the object key. */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType = 'application/pdf',
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Auto-delete after 24 hours via S3 lifecycle rule (configure in AWS Console)
      // The lifecycle rule must be set up separately — see README.
    }),
  );
  return key;
}

/** Download an S3 object as a Buffer. */
export async function downloadFromS3(key: string): Promise<Buffer> {
  const response = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Delete an object from S3 (called after export, belt-and-suspenders). */
export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Generate a short-lived pre-signed GET URL (for debugging / admin only). */
export async function presignedGetUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}
