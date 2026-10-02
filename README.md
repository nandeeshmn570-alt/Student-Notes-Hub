# Student Notes Hub

A subject-wise notes portal built with Node.js, Express, MongoDB, and static HTML/CSS/JavaScript pages.

## Requirements

- Node.js
- Python 3.10+
- MongoDB running locally, or a MongoDB connection string

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

   Install the Python chatbot dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Create `.env` from `.env.example` and set the admin credentials, JWT secrets, MongoDB URI, and Cloudinary credentials:

   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your-google-ai-studio-key
   GEMINI_MODEL=gemini-2.0-flash
   AI_SERVICE_URL=http://127.0.0.1:5001/chat
   AI_SERVICE_PORT=5001
   ACCESS_TOKEN_SECRET=use-a-long-random-secret
   REFRESH_TOKEN_SECRET=use-another-long-random-secret
   ```

   Use different long random values for both JWT secrets. Student accounts are created from the Student login page. Access tokens expire after 15 minutes by default; the HTTP-only refresh cookie keeps the session active for 7 days and is rotated after every refresh.

3. Start the server:

   ```bash
   npm start
   ```

4. Build the React frontend before starting production mode:

   ```bash
   npm run build
   npm start
   ```

5. Open `http://localhost:3000`.

For frontend development with Vite and the Express API:

```bash
npm run dev
```

`npm run dev` starts the Node server, Vite client, and Python AI service together. To run them separately, use `npm start`, `npm run client:dev`, and `python ai_service.py`.

The React frontend is in `client/`. It provides route-based Home, About, Notes, Contact, Admin, and Subject views with shared theme, navigation, loading, error, upload, and delete state.

## Features

- Browse notes by subject
- Admin-only note uploads and deletion
- MongoDB note metadata storage with Cloudinary file storage
- Uploads are limited to 10 MB per file
- Student registration and login with hashed passwords
- Short-lived access tokens and rotating refresh tokens
- Admin role protection for uploads and deletion
- Contact form storage
- Python-powered subject-aware AI study assistant on every subject notes page. Gemini can be used with a Google AI Studio API key and `AI_PROVIDER=gemini`; free-tier limits depend on the Google account and region.
