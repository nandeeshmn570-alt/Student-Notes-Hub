# Student Notes Hub

A subject-wise notes portal built with Node.js, Express, MongoDB, and static HTML/CSS/JavaScript pages.

## Requirements

- Node.js
- MongoDB running locally, or a MongoDB connection string

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and set the admin credentials, JWT secrets, MongoDB URI, and Cloudinary credentials:

   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
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
