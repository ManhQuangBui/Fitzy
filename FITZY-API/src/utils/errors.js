class AppError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function pageResult(query, total, page, limit) {
  return { items: query, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

module.exports = { AppError, asyncHandler, pageResult };
