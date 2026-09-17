/**
 * Central error-handling middleware for Express.
 * Catches any error forwarded via next(err) and returns a JSON response.
 */
module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[ERROR]', err.message, err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
};
