const multer = require("multer");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let apiError;

  if (error instanceof ApiError) {
    apiError = error;
  } else if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    apiError = new ApiError(400, "Each file must be 10 MB or smaller");
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

module.exports = { errorHandler };
