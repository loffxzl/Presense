import CloudinaryStorage from 'multer-storage-cloudinary';
import multer from 'multer';
import multerS3 from 'multer-s3';
import cloudinary from './cloudinary.js';
import s3 from './s3.js';

// Cloudinary storage — for user avatars
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'presense/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }]
  }
});

// S3 storage — for product and category images
const s3Storage = multerS3({
  s3,
  bucket: process.env.AWS_BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  //acl: 'public-read',
  key: (req, file, cb) => {
    const folder = req.s3Folder || 'products';
    const filename = `presense/${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG and WebP images are allowed'));
  }
};

export const uploadAvatar = multer({
  storage: cloudinaryStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter
});

// for category
export const uploadSingle = multer({
  storage: s3Storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

// for products
export const uploadMultiple = multer({
  storage: s3Storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});