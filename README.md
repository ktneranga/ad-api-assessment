# Ads API - Serverless Advertisement Management System

A serverless REST API for creating and managing advertisements with optional image uploads. Built with modern cloud-native technologies and automated CI/CD pipelines.

## Description

This project implements a simple **Ads API** that allows users to create advertisement records. Each ad includes a title, price, and optionally a base64-encoded image. When an ad is created:
- Ad data is stored in **AWS DynamoDB**
- Images (if provided) are uploaded to **AWS S3** with presigned URLs for secure access
- All requests are authenticated via API key headers
- Full request logging with unique request IDs for traceability

## Technologies Used

### Backend & Runtime
- **Node.js 20.x** - JavaScript runtime
- **TypeScript 5.3** - Type-safe development
- **AWS Lambda** - Serverless compute
- **AWS API Gateway** - REST API endpoint

### AWS Services
- **AWS DynamoDB** - NoSQL database for ad storage
- **AWS S3** - Object storage for images
- **AWS CloudFormation** - Infrastructure as Code
- **AWS SAM (Serverless Application Model)** - Framework for serverless apps

### Development & Testing
- **Jest** - Unit testing framework (18 tests, 90% coverage)
- **ts-jest** - TypeScript support for Jest
- **esbuild** - Fast TypeScript bundler

### AWS SDK v3
- `@aws-sdk/client-dynamodb` - DynamoDB operations
- `@aws-sdk/lib-dynamodb` - DynamoDB Document Client
- `@aws-sdk/client-s3` - S3 operations
- `@aws-sdk/s3-request-presigner` - Presigned URL generation

### CI/CD
- **GitHub Actions** - Automated testing and deployment
- Continuous testing on pull requests
- Automated AWS deployment on main branch

---

## Project Structure

```
ads-api/
├── src/
│   ├── handlers/
│   │   └── createAd.ts          # Lambda handler for POST /ads
│   ├── services/
│   │   └── adService.ts         # Business logic: DynamoDB + S3
│   ├── lib/
│   │   ├── validation.ts        # Input validation
│   │   ├── auth.ts              # API key authentication
│   │   ├── logger.ts            # Request logging with requestId
│   │   ├── errors.ts            # Custom error classes
│   │   └── awsClients.ts        # AWS SDK clients
│   └── types/
│       └── ad.ts                # TypeScript interfaces
├── tests/
│   └── createAd.handler.test.ts # Jest unit tests (18 tests)
├── .github/
│   └── workflows/
│       ├── test.yml             # Test workflow
│       └── deploy.yml           # Deploy workflow
├── template.yaml                # AWS SAM template
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
└── jest.config.cjs              # Jest config
```

---

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/ktneranga/ad-api-assessment.git
cd ad-api-assessment
```

### Install Dependencies

```bash
npm ci
```



### Configure Environment Variables

Create a `.env` file in the project root (for local development only):

```bash
API_KEY=dev-api-key-123
ADS_TABLE_NAME=AdsTable-dev
ADS_BUCKET_NAME=ads-images-dev
AWS_REGION=us-east-1
```

> **Important:** The `.env` file is for local development only. For production, these values are configured in AWS SAM template parameters and AWS Secrets Manager.

### Configure AWS Credentials

```bash
# Configure AWS CLI with your credentials
aws configure

# You'll be prompted for:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., ap-south-1)
# - Default output format (json)
```

Verify configuration:

```bash
aws sts get-caller-identity
```


### Build the Project

Compile TypeScript to JavaScript:

```bash
npm run build
```

This creates the `dist/` directory with compiled JavaScript files.

---

## Running Unit Tests

Execute the full test suite with Jest:

```bash
npm test
```

### Test Coverage

Run tests with coverage report:

```bash
npm test -- --coverage
```

**Current Coverage:** 90.65% (18 tests passing)

### Watch Mode

Run tests in watch mode for development:

```bash
npm run test:watch
```

### What's Tested

- Successful ad creation (with/without images)
- API key authentication (valid/invalid/missing)
- Input validation (title, price, imageBase64)
- Error handling (DynamoDB failures, S3 failures)
- Edge cases (long titles, decimal prices, various formats)



---

## Running Locally

### Option 1: Run Tests Only (No AWS Required)

```bash
npm test
```

### Option 2: Local API with SAM (Requires Docker)

Build and start the local API server:

```bash
# Build the SAM application
sam build

# Start local API Gateway
sam local start-api
```

The API will be available at `http://localhost:3000`

**Test the endpoint:**

```bash
curl -X POST http://localhost:3000/ads \
  -H "x-api-key: dev-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Advertisement",
    "price": 99.99,
    "imageBase64": "optional-base64-string"
  }'
```

---

## API Endpoint

### POST /ads

Create a new advertisement.

**Headers:**
```
x-api-key: <your-api-key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "string (minimum 3 characters)",
  "price": number (>= 0),
  "imageBase64": "string (optional, base64-encoded image)"
}
```

**Success Response (201 Created):**
```json
{
  "id": "uuid",
  "title": "string",
  "price": number,
  "imageUrl": "string (optional presigned S3 URL)",
  "createdAt": "ISO 8601 timestamp"
}
```

**Error Responses:**
- `400 Bad Request` - Validation error (invalid title, price, etc.)
- `401 Unauthorized` - Missing or invalid API key
- `500 Internal Server Error` - Server error

**Example Request:**
```bash
curl -X POST https://your-api-endpoint.com/prod/ads \
  -H "x-api-key: your-production-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "MacBook Pro 2023",
    "price": 2499.99
  }'
```

---

## Deployment

### Automated Deployment (GitHub Actions)

This project includes CI/CD pipelines that automatically:
1. Run tests on every pull request
2. Deploy to AWS when code is pushed to `main` branch

**Setup Required:**
Add these secrets to your GitHub repository (`Settings → Secrets → Actions`):
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
- `AWS_REGION` - AWS region (e.g., `us-east-1`)
- `API_KEY` - Production API key

### Manual Deployment

Deploy to AWS using SAM CLI:

```bash
# Build the application
sam build

# Deploy with guided prompts
sam deploy --guided
```

Follow the prompts to configure:
- Stack name (e.g., `ads-api-prod`)
- AWS region
- Environment (dev/staging/prod)
- API key parameter

---

## Known Issues & Limitations

### Current Limitations

1. **Single Endpoint Only**
   - Currently only supports `POST /ads` (create ad)
   - No endpoints for retrieving, updating, or deleting ads
   - Future enhancement: Add GET, PUT, DELETE operations

2. **Image Size Restrictions**
   - Base64 encoding increases payload size by ~33%
   - API Gateway has a 10MB payload limit
   - Recommended: Images should be < 5MB before encoding
   - Alternative: Use presigned S3 URLs for direct uploads

4. **Basic Authentication**
   - Uses simple API key authentication
   - Production consideration: Consider AWS Cognito or OAuth 2.0

6. **S3 Presigned URLs Expire**
   - Generated presigned URLs expire after 1 hour
   - Clients need to handle expired URLs gracefully

---

## 📝 Development Scripts

| Command | Description |
|---------|-------------|
| `npm ci` | Clean install of dependencies |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm test` | Run Jest unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run dev` | Start SAM local API (requires Docker) |
| `npm run sam:build` | Build SAM application |
| `npm run sam:deploy` | Deploy with guided prompts |

---
