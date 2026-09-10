const multer = require("multer");
const SUBJECT_PATTERN = /^subject[1-7]$/;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function validateSubject(subject) {
  if (!SUBJECT_PATTERN.test(subject)) {
    throw new Error("Invalid subject");
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

module.exports = { upload, validateSubject };
