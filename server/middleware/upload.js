const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// /tmp is the only writable directory on serverless platforms (Vercel, AWS Lambda, etc.)
const TEMP_DIR = process.env.UPLOAD_TEMP_DIR || '/tmp/uploads_temp';

// Ensure temp dir exists (/tmp is writable on all platforms including Vercel)
const fs = require('fs');
fs.mkdirSync(TEMP_DIR, { recursive: true });

// All uploads land in temp dir — the queue worker moves + compresses them
const storage = multer.diskStorage({
  destination: TEMP_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
];

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`File type '${file.mimetype}' is not allowed.`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200 MB absolute ceiling (images validated further in processor)
  },
});

module.exports = upload;
