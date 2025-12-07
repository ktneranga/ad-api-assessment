# Swivel Ads API

A serverless AWS Lambda API for managing advertisements, built with Node.js, TypeScript, and AWS SAM.

## Project Structure

```
ads-api/
├─ src/
│  ├─ handlers/
│  │  └─ createAd.ts          # Lambda handler for POST /ads
│  ├─ services/
│  │  └─ adService.ts         # Business logic: DynamoDB + S3
│  ├─ lib/
│  │  ├─ validation.ts        # Input validation
│  │  ├─ auth.ts              # API key authentication
│  │  ├─ logger.ts            # Request logging with requestId
│  │  └─ awsClients.ts        # DynamoDB + S3 clients
│  └─ types/
│     └─ ad.ts                # TypeScript interfaces
│
├─ tests/
│  └─ createAd.handler.test.ts  # Jest tests
│
├─ template.yaml              # SAM template
├─ package.json
├─ tsconfig.json
├─ jest.config.cjs
└─ README.md
```

## Prerequisites

- Node.js 20.x
- AWS SAM CLI
- AWS CLI configured with credentials
- Docker (for `sam local start-api`)

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Local Development

Start the SAM local API server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### POST /ads

Create a new advertisement.

**Headers:**
- `x-api-key`: Required. Must match the `API_KEY` environment variable.

**Request Body:**
```json
{
  "title": "string (min 3 characters)",
  "price": "number (>= 0)",
  "imageBase64": "string (optional)"
}
```

**Success Response (201):**
```json
{
  "id": "uuid",
  "title": "string",
  "price": number,
  "imageUrl": "string (optional)",
  "createdAt": "ISO 8601 timestamp"
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid API key
- `500 Internal Server Error` - Server error

## Environment Variables

Create a `.env` file in the root directory:

```
API_KEY=your-api-key-here
ADS_TABLE_NAME=AdsTable
ADS_BUCKET_NAME=ads-images-bucket
AWS_REGION=us-east-1
```

## Testing

Run tests:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

## Deployment

Build for deployment:

```bash
npm run sam:build
```

Deploy to AWS:

```bash
npm run sam:deploy
```

Follow the guided prompts to configure your deployment.

## Architecture

- **API Gateway**: REST API endpoint
- **Lambda**: Serverless compute
- **DynamoDB**: Ad storage
- **S3**: Image storage (optional)
- **Secrets Manager**: API key storage (production)

## Security

- API key validation via headers
- IAM roles with least privilege
- Input validation and sanitization
- Request logging with request IDs

## License

MIT
