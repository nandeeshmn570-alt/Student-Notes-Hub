const mongoose = require("mongoose");

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

module.exports = { Contact, Note };
