export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  const statusCode = err.statusCode || 500;

  const message = err.isOperational
    ? err.message
    : 'Something went wrong. Please try again.';

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(statusCode).json({ success: false, message });
  }

  if (req.path.startsWith('/admin')) {
    return res.status(statusCode).render('admin/error', {
      title: 'Error',
      message,
      statusCode,
      adminName: req.session?.admin?.name || 'Admin'
    });
  }

  res.status(statusCode).render('user/error', {
    title: 'Error',
    message,
    statusCode
  });
};

export const notFound = (req, res, next) => {

  const err = new Error('The page or resource you requested was not found.');
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
};