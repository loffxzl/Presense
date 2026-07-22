export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // If it's an API request return JSON
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(statusCode).json({ success: false, message });
  }

  // If admin route
  if (req.path.startsWith('/admin')) {
    return res.status(statusCode).render('admin/error', {
      title: 'Error',
      message,
      statusCode,
      adminName: req.session?.admin?.name || 'Admin'
    });
  }

  // User facing error
  res.status(statusCode).render('user/error', {
    title: 'Error',
    message,
    statusCode
  });
};

export const notFound = (req, res, next) => {
  const err = new Error(`Page not found: ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};