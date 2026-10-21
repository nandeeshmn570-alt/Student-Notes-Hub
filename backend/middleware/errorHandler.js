import multer from "multer";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { MAX_FILE_SIZE_BYTES } from "./upload.js";

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  };

  let apiError;

  if (error instanceof ApiError) {
    apiError = error;
  } else if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    apiError = new ApiError(400, `Each file must be ${MAX_FILE_SIZE_BYTES} bytes or smaller`);
  } else {
    apiError = new ApiError(500, "Internal server error");
  }

  const response = new ApiResponse(
    apiError.statusCode,
    null,
    apiError.message,
    false
  );

  if (apiError.errors.length > 0) {
    response.errors = apiError.errors;
  }

  res.status(apiError.statusCode).json(response);
}

export { errorHandler };
