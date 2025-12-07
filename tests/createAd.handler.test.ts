import { handler } from '../src/handlers/createAd';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Mock AWS SDK
jest.mock('../src/lib/awsClients', () => ({
  docClient: {
    send: jest.fn().mockResolvedValue({}),
  },
}));

const mockEvent = (overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => ({
  httpMethod: 'POST',
  path: '/ads',
  headers: {
    'x-api-key': 'test-api-key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Test Ad',
    price: 99.99,
  }),
  requestContext: {
    requestId: 'test-123',
    accountId: '123456789',
    apiId: 'api-123',
    httpMethod: 'POST',
    identity: {
      sourceIp: '127.0.0.1',
    },
    path: '/ads',
    protocol: 'HTTP/1.1',
    requestTime: '2024-01-01T00:00:00Z',
    requestTimeEpoch: 1234567890,
    resourceId: 'resource-123',
    resourcePath: '/ads',
    stage: 'prod',
  },
  ...overrides,
} as APIGatewayProxyEvent);

describe('createAd Handler', () => {
  beforeEach(() => {
    process.env.API_KEY = 'test-api-key';
    process.env.ADS_TABLE_NAME = 'AdsTable';
    jest.clearAllMocks();
  });

  it('should return 401 for missing API key', async () => {
    const event = mockEvent({
      headers: { 'Content-Type': 'application/json' },
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 401 for invalid API key', async () => {
    const event = mockEvent({
      headers: { 'x-api-key': 'wrong-key' },
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 400 for missing title', async () => {
    const event = mockEvent({
      body: JSON.stringify({ price: 99.99 }),
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Validation Error');
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'title' }),
      ])
    );
  });

  it('should return 400 for title too short', async () => {
    const event = mockEvent({
      body: JSON.stringify({ title: 'ab', price: 99.99 }),
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'title',
          message: expect.stringContaining('at least 3'),
        }),
      ])
    );
  });

  it('should return 400 for missing price', async () => {
    const event = mockEvent({
      body: JSON.stringify({ title: 'Test Ad' }),
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'price' }),
      ])
    );
  });

  it('should return 400 for negative price', async () => {
    const event = mockEvent({
      body: JSON.stringify({ title: 'Test Ad', price: -10 }),
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'price',
          message: expect.stringContaining('non-negative'),
        }),
      ])
    );
  });

  it('should return 400 for invalid JSON body', async () => {
    const event = mockEvent({
      body: 'invalid json',
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Bad Request');
  });

  it('should return 201 for valid request', async () => {
    const event = mockEvent({
      body: JSON.stringify({
        title: 'Test Ad',
        price: 99.99,
      }),
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('title', 'Test Ad');
    expect(body).toHaveProperty('price', 99.99);
    expect(body).toHaveProperty('createdAt');
  });

  it('should accept price as 0', async () => {
    const event = mockEvent({
      body: JSON.stringify({
        title: 'Free Item',
        price: 0,
      }),
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.price).toBe(0);
  });

  it('should accept imageBase64 if provided', async () => {
    const event = mockEvent({
      body: JSON.stringify({
        title: 'Ad with Image',
        price: 50,
        imageBase64: 'base64stringhere',
      }),
    });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(201);
  });
});
