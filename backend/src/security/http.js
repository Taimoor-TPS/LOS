const CODES = {
  400: 'VALIDATION',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  423: 'LOCKED',
  429: 'RATE_LIMITED',
};

export function httpError(status, message, extras = {}) {
  const err = new Error(message);
  err.status = status;
  err.code = extras.code || CODES[status] || 'ERROR';
  if (extras.details !== undefined) err.details = extras.details;
  return err;
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
