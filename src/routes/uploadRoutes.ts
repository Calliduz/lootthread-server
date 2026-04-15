import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// ---------------------------------------------------------------------------
// CONFIGURE MULTER STORAGE
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads';
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Sanitize filename: remove spaces and add timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpeg, jpg, png, webp, gif) are allowed!'));
  }
});

// ---------------------------------------------------------------------------
// @desc    Upload an image
// @route   POST /api/upload
// @access  Admin only (for now, as it's used in Admin CMS/Products)
// ---------------------------------------------------------------------------
router.post('/', protect, authorize('admin'), upload.single('image'), (req: any, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  // Return the public URL path
  // Note: Serving handled in index.ts via express.static
  res.status(200).json({
    message: 'File uploaded successfully.',
    url: `/uploads/${req.file.filename}`
  });
});

export default router;
