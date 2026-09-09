const { AppError } = require("../errors");

function createErrorHandler(logger) {
  return (error, _request, response, _next) => {
    const statusCode = error instanceof AppError ? error.statusCode : 500;

    if (statusCode >= 500) {
      logger.error({ err: error }, "Unhandled request error");
    }

    response.status(statusCode).json({
      error: error.message || "An unexpected error occurred.",
      ...(error instanceof AppError && error.details ? { details: error.details } : {}),
    });
  };
}

module.exports = { createErrorHandler };

