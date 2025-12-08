import { CreateAdRequest } from '../types/ad';
import { ValidationError } from './errors';

export function validateCreateAd(body: any): CreateAdRequest {
  // Validate title
  if (!body.title || typeof body.title !== 'string') {
    throw new ValidationError('Title is required and must be a string');
  }
  if (body.title.length < 3) {
    throw new ValidationError('Title must be at least 3 characters long');
  }

  // Validate price
  if (body.price === undefined || body.price === null) {
    throw new ValidationError('Price is required');
  }
  if (typeof body.price !== 'number') {
    throw new ValidationError('Price must be a number');
  }
  if (!(body.price >= 0)) {
    throw new ValidationError('Price must be a non-negative number');
  }

  // Validate optional imageBase64
  if (body.imageBase64 !== undefined && body.imageBase64 !== null) {
    if (typeof body.imageBase64 !== 'string' || body.imageBase64.trim() === '') {
      throw new ValidationError('imageBase64 must be a non-empty base64 string when provided');
    }
  }

  return {
    title: body.title,
    price: body.price,
    imageBase64: body.imageBase64,
  };
}