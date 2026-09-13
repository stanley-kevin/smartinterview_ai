/**
 * Catches requests to routes that don't exist.
 */
const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
};

/**
 * Central error handler. Express recognizes this by its 4-argument
 * signature and routes every thrown/next(err) call here.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || "Internal server error";

  // Mongoose bad ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Mongoose duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || { field: "value" })[0];
    message = `An account with that ${field} already exists`;
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(". ");
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
