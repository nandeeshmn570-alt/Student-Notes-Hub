require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const { connectDatabase } = require("./config/database");
const { errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/contact");
const fileRoutes = require("./routes/files");
const { UPLOADS_DIR } = require("./middleware/upload");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_DIST = path.join(__dirname, "client", "dist");

// Middleware
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "campus-notes-default-secret",
  resave: false,
  saveUninitialized: true
}));
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(CLIENT_DIST));

// API routes
app.use(authRoutes);
app.use(fileRoutes);
app.use(contactRoutes);

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
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Example app listening at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
