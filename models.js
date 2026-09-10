const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  message: String
});

const notesSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  resourceType: { type: String, required: true },
  subject: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["student"], default: "student" },
  createdAt: { type: Date, default: Date.now }
});

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  role: { type: String, enum: ["student", "admin"], required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null }
});

const Contact = mongoose.model("Contact", contactSchema);
const Note = mongoose.model("Note", notesSchema);
const User = mongoose.model("User", userSchema);
const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = { Contact, Note, RefreshToken, User };
