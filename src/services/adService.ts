import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../lib/awsClients';
import { CreateAdRequest, AdItem, AdResponse } from '../types/ad';
import { randomUUID } from 'crypto';

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

  const params = {
    TableName: process.env.ADS_TABLE_NAME || 'AdsTable',
    Item: item,
  };

  await docClient.send(new PutCommand(params));

  return {
    id: item.id,
    title: item.title,
    price: item.price,
    createdAt: item.createdAt,
  };
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
