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

2. Create `.env` from `.env.example` and set the admin credentials, session secret, and MongoDB URI.

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
- MongoDB note metadata storage
- Admin logout and session protection
- Contact form storage
