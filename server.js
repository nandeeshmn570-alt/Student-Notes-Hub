require("dotenv").config();
const express = require('express')
const session = require("express-session");
const app = express()
const multer = require("multer")
const mongoose = require("mongoose");


mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campusNotes")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  message: String
});

const Contact = mongoose.model("Contact", contactSchema);
const notesSchema = new mongoose.Schema({

  fileName: String,

  subject: String,

  uploadedBy: String,

  uploadDate: {
    type: Date,
    default: Date.now
  }

});
const Note = mongoose.model("Note", notesSchema);
const port = 3000
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.static("."));

app.use(session({
  secret: process.env.SESSION_SECRET || "campus-notes-default-secret",
  resave: false,
  saveUninitialized: true
}));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const subject = req.query.subject

    if (!subject) {
      return cb(new Error("subject not provided"), null)
    }
    const dir = "uploads/" + subject;
    const fs = require("fs")
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

app.get('/', (req, res) => {
  res.send('Hello World! with Nandeesh M N')
})

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }

  return res.json({ success: false });
});

app.get("/check-admin", (req, res) => {
  res.json({ isAdmin: req.session.isAdmin === true });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Logout failed" });
    }

    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

app.post("/upload",
  (req, res, next) => {
    if (!req.session.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    next();
  },
  upload.array("file"),
  async (req, res) => {
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

      res.json({
        message: "File uploaded successfully"
      });
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message: err.message
      });
    }
  }
);

app.get("/files", (req, res) => {
  const subject = req.query.subject;

  if (!subject) return res.json([]);

  const fs = require("fs");
  const dir = "uploads/" + subject;

  if (!fs.existsSync(dir)) return res.json([]);

  fs.readdir(dir, (err, files) => {
    if (err) return res.json([]);
    res.json(files);
  });
});

const fs = require("fs");

app.delete("/delete", async (req, res) => {
  const { filename, subject } = req.query;

  if (!req.session.isAdmin) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  if (!filename || !subject) {
    return res.status(400).json({ message: "Missing data" });
  }

  const filePath = `uploads/${subject}/${filename}`;

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
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "File not found or error" });
  }
});

app.listen(port, () => {
  console.log("Example app listening at http://localhost:3000")
})

app.post("/contact", async (req, res) => {
   console.log("Contact API called");

  try {

    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are mandatory."
      });
    }
    await Contact.create({
      name,
      email,
      subject,
      message
    });

    res.json({
      success: true,
      message: "Message saved successfully"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});
