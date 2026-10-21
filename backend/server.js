import "./config/loadEnvironment.js";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";

import { connectDatabase } from "./config/database.js";
import { validateAuthenticationConfig } from "./config/authentication.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import contactRoutes from "./routes/contact.js";
import fileRoutes from "./routes/files.js";
import chatRoutes from "./routes/chat.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const BACKEND_FOLDER = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.join(BACKEND_FOLDER, "..", "frontend", "dist");

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(FRONTEND_DIST));

// API routes
app.use(authRoutes);
app.use(fileRoutes);
app.use(contactRoutes);
app.use(chatRoutes);

// React client-side routes
app.use((req, res, next) => {
  if (req.method === "GET" && req.accepts("html")) {
    return res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  }

  next();
});

app.use(errorHandler);

// Application startup
const startServer = async () => {
  try {
    validateAuthenticationConfig();
    try {
      await connectDatabase();
    } catch (error) {
      console.warn(`Database unavailable. Notes and authentication features may be limited: ${error.message}`);
    }
    app.listen(PORT, () => {
      console.log(`Example app listening at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
  }
};

const currentFilePath = fileURLToPath(import.meta.url);
const startedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (startedFilePath === currentFilePath) {
  startServer();
}

export { app, startServer };
