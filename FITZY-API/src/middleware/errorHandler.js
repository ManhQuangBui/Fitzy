function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status || (error.name === 'ValidationError' || error.name === 'CastError' || error.name === 'MulterError' ? 400 : error.code === 11000 ? 409 : 500);
  const message = status === 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;
  res.status(status).json({ success: false, error: { code: error.code || 'REQUEST_FAILED', message, details: error.errors ? Array.isArray(error.errors) ? error.errors : Object.values(error.errors).map(item => item.message) : undefined } });
}

module.exports = { notFound, errorHandler };
