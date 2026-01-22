# Time Tracking Backend

Cloud Run serverless backend for the Time Tracking app. Proxies Gemini API calls so the API key stays secure on the server.

## Local Development

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

3. **Run locally:**
   ```bash
   npm run dev
   ```
   Server runs at http://localhost:8080

4. **Test the endpoint:**
   ```bash
   curl http://localhost:8080/health
   
   curl -X POST http://localhost:8080/categorize \
     -H "Content-Type: application/json" \
     -d '{"transcript": "I worked on coding for an hour", "defaultDurationMinutes": 30, "categories": [{"id": "work", "name": "Work"}]}'
   ```

## Deploy to Cloud Run

### Prerequisites
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed
- A Google Cloud project with billing enabled
- Cloud Run API enabled

### One-time setup
```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Deploy
```bash
cd backend

# Deploy (builds and deploys in one command)
gcloud run deploy time-tracking-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=your_actual_api_key"
```

After deployment, you'll get a URL like:
```
https://time-tracking-api-xxxxx-uc.a.run.app
```

### Update the mobile app
Add the Cloud Run URL to your mobile app's `.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://time-tracking-api-xxxxx-uc.a.run.app
```

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{ "status": "healthy" }
```

### `POST /categorize`
Categorize a transcript using Gemini.

**Request:**
```json
{
  "transcript": "I worked on the project for 2 hours",
  "defaultDurationMinutes": 30,
  "categories": [
    { "id": "work", "name": "Work" },
    { "id": "personal", "name": "Personal" }
  ]
}
```

**Response:**
```json
{
  "activities": [
    {
      "summary": "Worked on project",
      "category": "work",
      "tags": ["project", "coding"],
      "duration": 120
    }
  ]
}
```

### `POST /test-connection`
Test if Gemini API is working.

**Response:**
```json
{ "success": true }
```

## Security Notes

- The Gemini API key is stored as an environment variable on Cloud Run
- Consider adding authentication if this is a public service
- Cloud Run automatically handles HTTPS
- CORS is enabled for all origins (restrict in production)
