//higher-order Express middleware. Its job is to take a Multer middleware, run it, and forward any upload error to Express's error-handling middleware


const handleUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

export default handleUpload;
