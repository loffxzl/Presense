
// const handleUpload = (multerMiddleware) => (req, res, next) => {
//   multerMiddleware(req, res, (err) => {
//     if (err) return next(err);
//     next();
//   });
// };

// export default handleUpload;




import multer from 'multer';
import AppError from '../utils/AppError.js';

const handleUpload = (multerMiddleware, { maxSizeMb = 5 } = {}) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(`Image is too large. Maximum size is ${maxSizeMb} MB.`, 413));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Unexpected file field in the upload.', 400));
      }
      return next(new AppError(err.message, 400));
    }

    next(err);
  });
};

export default handleUpload;