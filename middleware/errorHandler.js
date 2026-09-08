const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const apiError = error instanceof ApiError
    ? error
    : new ApiError(500, "Internal server error");

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
