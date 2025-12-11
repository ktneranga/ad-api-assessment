import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../src/handlers/createAd';

// Mock AWS SDK clients
jest.mock('../src/lib/awsClients', () => ({
  docClient: {
    send: jest.fn(),
  },
  s3Client: {
    send: jest.fn(),
  },
}));

// Mock the presigned URL function
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
}));

import { docClient, s3Client } from '../src/lib/awsClients';

describe('CreateAd Handler', () => {
  // Setup: Run before each test
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Set environment variables
    process.env.API_KEY = 'test-api-key-123';
    process.env.ADS_TABLE_NAME = 'AdsTable-test';
    process.env.ADS_BUCKET_NAME = 'ads-images-test';
    process.env.AWS_REGION = 'us-east-1';
    
    // Mock successful DynamoDB response
    (docClient.send as jest.Mock).mockResolvedValue({});
    
    // Mock successful S3 response
    (s3Client.send as jest.Mock).mockResolvedValue({});
  });

  // Helper function to create a mock API Gateway event
  const createMockEvent = (body: any, headers: Record<string, string> = {}): APIGatewayProxyEvent => {
    return {
      body: JSON.stringify(body),
      headers: {
        'x-api-key': 'test-api-key-123',
        ...headers,
      },
      multiValueHeaders: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/ads',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: 'test-account',
        apiId: 'test-api',
        protocol: 'HTTP/1.1',
        httpMethod: 'POST',
        path: '/ads',
        stage: 'dev',
        requestId: 'test-request-id-123',
        requestTime: '01/Jan/2025:00:00:00 +0000',
        requestTimeEpoch: 1609459200000,
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
        } as any,
        authorizer: null,
        domainName: 'test.execute-api.us-east-1.amazonaws.com',
        domainPrefix: 'test',
      } as any,
      resource: '/ads',
    } as APIGatewayProxyEvent;
  };

  describe('Successful Ad Creation', () => {
    it('should create an ad successfully without image', async () => {
      // Arrange: Prepare test data
      const requestBody = {
        title: 'Test Ad',
        price: 100,
      };
      const event = createMockEvent(requestBody);

      // Act: Call the handler
      const result = await handler(event);

      // Assert: Check the response
      expect(result.statusCode).toBe(201);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toHaveProperty('id');
      expect(responseBody.title).toBe('Test Ad');
      expect(responseBody.price).toBe(100);
      expect(responseBody).toHaveProperty('createdAt');
      expect(responseBody.imageUrl).toBeUndefined();

      // Verify DynamoDB was called
      expect(docClient.send).toHaveBeenCalledTimes(1);
      
      // Verify S3 was NOT called (no image provided)
      expect(s3Client.send).not.toHaveBeenCalled();
    });

    it('should create an ad successfully with base64 image', async () => {
      // Arrange: Prepare test data with image
      const requestBody = {
        title: 'Ad with Image',
        price: 250.50,
        imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      };
      const event = createMockEvent(requestBody);

      // Act: Call the handler
      const result = await handler(event);

      // Assert: Check the response
      expect(result.statusCode).toBe(201);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toHaveProperty('id');
      expect(responseBody.title).toBe('Ad with Image');
      expect(responseBody.price).toBe(250.50);
      expect(responseBody).toHaveProperty('imageUrl');
      expect(responseBody.imageUrl).toBe('https://s3.example.com/presigned-url');

      // Verify both S3 and DynamoDB were called
      expect(s3Client.send).toHaveBeenCalledTimes(1); // PutObject for image upload
      expect(docClient.send).toHaveBeenCalledTimes(1);
    });

    it('should handle price of 0', async () => {
      // Arrange: Test edge case - free ad
      const requestBody = {
        title: 'Free Item',
        price: 0,
      };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(201);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.price).toBe(0);
    });
  });

  describe('Authentication', () => {
    it('should return 401 when API key is missing', async () => {
      // Arrange: Event without API key
      const requestBody = { title: 'Test Ad', price: 100 };
      const event = createMockEvent(requestBody, { 'x-api-key': '' });
      delete event.headers['x-api-key'];

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(401);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('Invalid or missing x-api-key');

      // Verify no AWS services were called
      expect(docClient.send).not.toHaveBeenCalled();
      expect(s3Client.send).not.toHaveBeenCalled();
    });

    it('should return 401 when API key is invalid', async () => {
      // Arrange: Event with wrong API key
      const requestBody = { title: 'Test Ad', price: 100 };
      const event = createMockEvent(requestBody, { 'x-api-key': 'wrong-key' });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(401);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('Invalid or missing x-api-key');

      // Verify no AWS services were called
      expect(docClient.send).not.toHaveBeenCalled();
    });

    it('should accept API key in X-Api-Key header (case variation)', async () => {
      // Arrange: Test case-insensitive header
      const requestBody = { title: 'Test Ad', price: 100 };
      const event = createMockEvent(requestBody);
      event.headers['X-Api-Key'] = 'test-api-key-123';
      delete event.headers['x-api-key'];

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(201);
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 when title is missing', async () => {
      // Arrange
      const requestBody = { price: 100 };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('Title is required and must be a string');
    });

    it('should return 400 when title is too short', async () => {
      // Arrange: Title less than 3 characters
      const requestBody = { title: 'AB', price: 100 };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('Title must be at least 3 characters long');
    });

    it('should return 400 when price is missing', async () => {
      // Arrange
      const requestBody = { title: 'Test Ad' };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('Price is required');
    });

    it('should return 400 when price is negative', async () => {
      // Arrange
      const requestBody = { title: 'Test Ad', price: -10 };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('Price must be a non-negative number');
    });

    it('should return 400 when price is not a number', async () => {
      // Arrange
      const requestBody = { title: 'Test Ad', price: 'not-a-number' };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('Price must be a number');
    });

    it('should return 400 when imageBase64 is empty string', async () => {
      // Arrange
      const requestBody = { title: 'Test Ad', price: 100, imageBase64: '   ' };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('imageBase64 must be a non-empty base64 string when provided');
    });

    it('should return 400 when imageBase64 is not a string', async () => {
      // Arrange: Test invalid data type for imageBase64
      const requestBody = { title: 'Test Ad', price: 100, imageBase64: 12345 };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('imageBase64 must be a non-empty base64 string when provided');
    });

    it('should return 400 when body is invalid JSON', async () => {
      // Arrange: Invalid JSON string
      const event = createMockEvent({});
      event.body = 'invalid-json{';

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('Invalid JSON in request body');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', async () => {
      // Arrange
      const longTitle = 'A'.repeat(500);
      const requestBody = { title: longTitle, price: 100 };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(201);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.title).toBe(longTitle);
    });

    it('should handle decimal prices', async () => {
      // Arrange
      const requestBody = { title: 'Test Ad', price: 99.99 };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(201);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.price).toBe(99.99);
    });

    it('should handle base64 without data URI prefix', async () => {
      // Arrange: Plain base64 without 'data:image/jpeg;base64,' prefix
      const requestBody = {
        title: 'Test Ad',
        price: 100,
        imageBase64: '/9j/4AAQSkZJRg==',
      };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(201);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toHaveProperty('imageUrl');
    });

    it('should handle very large prices', async () => {
      // Arrange: Test with large price value (e.g., luxury item)
      const requestBody = {
        title: 'Luxury Yacht',
        price: 999999999.99,
      };
      const event = createMockEvent(requestBody);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(201);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.price).toBe(999999999.99);
      expect(responseBody.title).toBe('Luxury Yacht');
    });

    it('should generate unique IDs for multiple ads', async () => {
      // Arrange: Create two ads with same data
      const requestBody = {
        title: 'Duplicate Test',
        price: 50,
      };
      const event1 = createMockEvent(requestBody);
      const event2 = createMockEvent(requestBody);

      // Act: Create two ads
      const result1 = await handler(event1);
      const result2 = await handler(event2);

      // Assert: Both should succeed with different IDs
      expect(result1.statusCode).toBe(201);
      expect(result2.statusCode).toBe(201);
      
      const ad1 = JSON.parse(result1.body);
      const ad2 = JSON.parse(result2.body);
      
      expect(ad1.id).toBeDefined();
      expect(ad2.id).toBeDefined();
      expect(ad1.id).not.toBe(ad2.id); // IDs should be unique
    });
  });
});
