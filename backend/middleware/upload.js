import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_BYTES);

const validateSubject = (subject) => {
  const isValidSubject = /^subject[1-7]$/.test(subject);
  if (!isValidSubject) {
    throw new ApiError(400, "Invalid subject");
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES }
});

export { MAX_FILE_SIZE_BYTES, upload, validateSubject };
