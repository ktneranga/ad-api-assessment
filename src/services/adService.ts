import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, s3Client } from '../lib/awsClients';
import { CreateAdRequest, AdItem, AdResponse } from '../types/ad';
import { randomUUID } from 'crypto';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function createAd(request: CreateAdRequest): Promise<AdResponse> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const item: AdItem = {
    id,
    title: request.title,
    price: request.price,
    createdAt: now,
    updatedAt: now,
  };

  // If an image is provided (base64), upload to S3 and attach URL
  if (request.imageBase64) {
    try {
      let base64Data = request.imageBase64;
      let contentType = 'image/jpeg';

      // Support data URI: data:<mime>;base64,<data>
      const dataUriMatch = /^data:(.+);base64,(.*)$/.exec(base64Data);
      if (dataUriMatch) {
        contentType = dataUriMatch[1];
        base64Data = dataUriMatch[2];
      }

      const buffer = Buffer.from(base64Data, 'base64');

      const bucket = process.env.ADS_BUCKET_NAME || 'ads-images';
      const key = `${id}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      // Generate a presigned GET URL so clients can download the image
      const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      const presignedUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 60 * 60 }); // 1 hour
      item.imageUrl = presignedUrl;
    } catch (err) {
      // If S3 upload fails, propagate error to caller to be handled by handler
      throw err;
    }
  }

  const params = {
    TableName: process.env.ADS_TABLE_NAME || 'AdsTable',
    Item: item,
  };

  await docClient.send(new PutCommand(params));

  const response: AdResponse = {
    id: item.id,
    title: item.title,
    price: item.price,
    createdAt: item.createdAt,
  };

  if (item.imageUrl) {
    response.imageUrl = item.imageUrl;
  }

  return response;
}

export async function getAd(id: string): Promise<AdItem | null> {
  const { GetCommand } = await import('@aws-sdk/lib-dynamodb');

  const params = {
    TableName: process.env.ADS_TABLE_NAME || 'AdsTable',
    Key: { id },
  };

  const result = await docClient.send(new GetCommand(params));
  return (result.Item as AdItem) || null;
}
