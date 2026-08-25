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

4. Open `http://localhost:3000/home.html`.

## Features

- Browse notes by subject
- Admin-only note uploads and deletion
- MongoDB note metadata storage
- Admin logout and session protection
- Contact form storage
