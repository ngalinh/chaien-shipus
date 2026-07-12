'use strict';

const path = require('path');

// Only allow real raster image extensions — never trust the client MIME alone
// (it is spoofable, and a .svg/.html served back could enable stored XSS).
const ALLOWED_IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function imageFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (/^image\//.test(file.mimetype) && ALLOWED_IMAGE_EXT.has(ext)) return cb(null, true);
  cb(new Error('Only JPG, PNG or WEBP images are allowed'));
}

module.exports = { imageFileFilter };
