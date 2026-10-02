require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { connectDatabase } = require("./config/database");
const { validateAuthenticationConfig } = require("./config/authentication");
const { errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/contact");
const fileRoutes = require("./routes/files");
const chatRoutes = require("./routes/chat");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_DIST = path.join(__dirname, "client", "dist");

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(CLIENT_DIST));

// API routes
app.use(authRoutes);
app.use(fileRoutes);
app.use(contactRoutes);
app.use(chatRoutes);

// React client-side routes
app.use((req, res, next) => {
  if (req.method === "GET" && req.accepts("html")) {
    return res.sendFile(path.join(CLIENT_DIST, "index.html"));
  }

  next();
});

app.use(errorHandler);

// Application startup
async function startServer() {
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
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
