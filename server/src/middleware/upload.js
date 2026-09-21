const path = require('path');
const multer = require('multer');
const { ApiError } = require('../utils/apiError');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (!ok) return cb(new ApiError(400, 'Only JPEG, PNG, and WebP images are allowed'));
    cb(null, true);
  },
});

const DELIVERABLE_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const uploadDeliverables = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const okType = DELIVERABLE_TYPES.includes(file.mimetype);
    const okExt = ['.pdf', '.zip', '.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    if (!okType && !okExt) {
      return cb(new ApiError(400, 'Only PDF, ZIP, PNG, JPEG, and WebP files are allowed'));
    }
    cb(null, true);
  },
});

module.exports = { upload, uploadDeliverables };
