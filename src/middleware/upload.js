import multer from 'multer';
import { httpError } from '../utils/httpError.js';

/**
 * Largest upload accepted. Kept under Vercel's 4.5 MB request-body cap; the portal checks
 * the same limit before sending. Sample price files are ~15 KB.
 */
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

const upload = multer({
  // Files are parsed straight from memory and never written to disk
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES, files: 1, fields: 5 },
  // Browsers send the filename as UTF-8; multer's default (latin1) would garble non-ASCII names
  defParamCharset: 'utf8',
});

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `The file is too large. The limit is ${UPLOAD_MAX_BYTES / 1024 / 1024} MB.`,
  LIMIT_FILE_COUNT: 'Upload one file at a time.',
  LIMIT_UNEXPECTED_FILE: 'Send the file in a form field named "file".',
};

/** Accepts one file in the multipart field `file`; turns multer errors into clear 4xx responses */
export function singleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return next(httpError(status, MULTER_MESSAGES[err.code] ?? err.message));
    }
    next(err);
  });
}
