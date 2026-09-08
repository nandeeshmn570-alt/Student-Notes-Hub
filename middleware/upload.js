const fs = require("fs");
const multer = require("multer");
const path = require("path");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const SUBJECT_PATTERN = /^subject[1-7]$/;

function getSubjectDirectory(subject) {
  if (!SUBJECT_PATTERN.test(subject)) {
    throw new Error("Invalid subject");
  }

  return path.join(UPLOADS_DIR, subject);
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const { subject } = req.query;

    if (!subject) {
      return callback(new Error("subject not provided"), null);
    }

    let subjectDirectory;

    try {
      subjectDirectory = getSubjectDirectory(subject);
    } catch (error) {
      return callback(error, null);
    }

    fs.mkdirSync(subjectDirectory, { recursive: true });
    callback(null, subjectDirectory);
  },
  filename: (req, file, callback) => {
    callback(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

module.exports = { UPLOADS_DIR, getSubjectDirectory, upload };
