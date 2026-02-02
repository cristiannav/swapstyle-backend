import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { BadRequestError } from '../utils/errors.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.upload.path);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new BadRequestError('Invalid file type. Allowed: JPEG, PNG, WebP, HEIC'));
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new BadRequestError('Invalid file extension'));
  }

  cb(null, true);
};

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
}).single('image');

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10,
  },
}).array('images', 10);

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for avatars
  },
}).single('avatar');
