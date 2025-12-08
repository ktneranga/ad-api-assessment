import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from '../lib/logger';
import { validateApiKey } from '../lib/auth';
import { validateCreateAd } from '../lib/validation';
import { createAd } from '../services/adService';
import { CreateAdRequest } from '../types/ad';
import { HttpError, UnauthorizedError } from '../lib/errors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Get request ID for logging
  const requestId = event.requestContext?.requestId || 'unknown';
  const logger = new Logger(requestId);

  try {
    logger.log('Received POST /ads request');

    // Authentication
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];

    if (!validateApiKey(apiKey)) {
      logger.log('Invalid or missing x-api-key');
      throw new UnauthorizedError('Invalid or missing x-api-key');
    }

    // Parse and validate request body
    let requestBody: CreateAdRequest;
    try {
      requestBody = validateCreateAd(JSON.parse(event.body || '{}'));
    } catch (error: unknown) {
      if (error instanceof SyntaxError) {
        logger.log('Invalid JSON in request body');
        throw new HttpError(400, 'Invalid JSON in request body');
      }
      throw error;
    }

    // Save ad to DynamoDB
    const result = await createAd(requestBody);
    logger.log('Ad created', { id: result.id });

    return {
      statusCode: 201,
      body: JSON.stringify(result),
    };
  } catch (error: unknown) {
    // Handle HttpError
    if (error instanceof HttpError) {
      logger.log(`Error: ${error.message}`);
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({
          message: error.message,
        }),
      };
    }

    // Handle other errors
    logger.error('Unexpected error', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error',
      }),
    };
  }
};
