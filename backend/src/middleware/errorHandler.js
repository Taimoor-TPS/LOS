export function notFound(req, res) {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Not found' });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const body = {
    code: err.code || (status >= 500 ? 'ERROR' : 'ERROR'),
    message: status >= 500 ? 'Something went wrong' : err.message,
  };
  if (err.details !== undefined) body.details = err.details;
  res.status(status).json(body);
}
