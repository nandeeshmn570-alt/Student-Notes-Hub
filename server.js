require("dotenv").config();

const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const session = require("express-session");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campusNotes";

// Database models
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  message: String
});

const notesSchema = new mongoose.Schema({
  fileName: String,
  subject: String,
  uploadedBy: String,
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

const Contact = mongoose.model("Contact", contactSchema);
const Note = mongoose.model("Note", notesSchema);

// Middleware
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "campus-notes-default-secret",
  resave: false,
  saveUninitialized: true
}));
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));

function requireAdmin(req, res, next) {
  if (req.session.isAdmin !== true) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  next();
}

function getSubjectDirectory(subject) {
  return path.join(UPLOADS_DIR, subject);
}

// Upload configuration
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const { subject } = req.query;

    if (!subject) {
      return callback(new Error("subject not provided"), null);
    }

    const subjectDirectory = getSubjectDirectory(subject);
    fs.mkdirSync(subjectDirectory, { recursive: true });
    callback(null, subjectDirectory);
  },
  filename: (req, file, callback) => {
    callback(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Page routes
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "home.html"));
});

// Authentication routes
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const validCredentials = username === process.env.ADMIN_USERNAME
    && password === process.env.ADMIN_PASSWORD;

  if (!validCredentials) {
    return res.json({ success: false });
  }

  req.session.isAdmin = true;
  res.json({ success: true });
});

app.get("/check-admin", (req, res) => {
  res.json({ isAdmin: req.session.isAdmin === true });
});

app.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ success: false, message: "Logout failed" });
    }

    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// Note routes
app.post("/upload", requireAdmin, upload.array("file"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No file selected" });
    }

    for (const file of req.files) {
      await Note.create({
        fileName: file.filename,
        subject: req.query.subject,
        uploadedBy: "admin"
      });
    }

    res.json({ message: "File uploaded successfully" });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/files", (req, res) => {
  const { subject } = req.query;

  if (!subject) {
    return res.json([]);
  }

  const subjectDirectory = getSubjectDirectory(subject);
  if (!fs.existsSync(subjectDirectory)) {
    return res.json([]);
  }

  fs.readdir(subjectDirectory, (error, files) => {
    if (error) {
      return res.json([]);
    }

    res.json(files);
  });
});

app.delete("/delete", requireAdmin, async (req, res) => {
  const { filename, subject } = req.query;

  if (!filename || !subject) {
    return res.status(400).json({ message: "Missing data" });
  }

  const filePath = path.join(getSubjectDirectory(subject), filename);

  try {
    const deleteResult = await Note.deleteMany({ fileName: filename, subject });

    try {
      await fs.promises.unlink(filePath);
    } catch (fileError) {
      if (fileError.code !== "ENOENT") {
        throw fileError;
      }
    }

    res.json({
      message: "File and note record deleted successfully",
      deletedRecords: deleteResult.deletedCount
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "File not found or error" });
  }
});

// Contact route
app.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "All fields are mandatory."
    });
  }

  try {
    await Contact.create({ name, email, subject, message });
    res.json({ success: true, message: "Message saved successfully" });
  } catch (error) {
    console.error("Contact error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Application startup
mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(error => console.error("MongoDB connection error:", error));

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
