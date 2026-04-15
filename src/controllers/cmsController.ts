import { Request, Response } from 'express';
import CMSContent from '../models/CMSContent';

// ---------------------------------------------------------------------------
// @desc    Get a single CMS block by key  (e.g. 'marquee_banner')
// @route   GET /api/cms/:key
// @access  Public
// ---------------------------------------------------------------------------
export const getCMSByKey = async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key).toLowerCase();
    const content = await CMSContent.findOne({ key, isActive: true });
    if (!content) return res.status(404).json({ message: `CMS key '${key}' not found` });
    res.json(content);
  } catch {
    res.status(500).json({ message: 'Server error fetching CMS content' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get all CMS content blocks
// @route   GET /api/cms
// @access  Admin
// ---------------------------------------------------------------------------
export const getAllCMS = async (_req: Request, res: Response) => {
  try {
    const content = await CMSContent.find({}).sort({ key: 1 });
    res.json(content);
  } catch {
    res.status(500).json({ message: 'Server error fetching CMS content' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Create a CMS content block
// @route   POST /api/cms
// @access  Admin
// ---------------------------------------------------------------------------
export const createCMS = async (req: Request, res: Response) => {
  const { key, type, value, isActive } = req.body;

  if (!key || !type) {
    return res.status(400).json({ message: 'key and type are required' });
  }

  try {
    const content = await CMSContent.create({
      key: key.toLowerCase(),
      type,
      value,
      isActive: isActive ?? true,
    });
    res.status(201).json(content);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: `CMS key '${key}' already exists` });
    }
    res.status(400).json({ message: 'Invalid CMS data' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Update a CMS content block
// @route   PUT /api/cms/:id
// @access  Admin
// ---------------------------------------------------------------------------
export const updateCMS = async (req: Request, res: Response) => {
  try {
    // Normalise key if the caller is updating it
    if (req.body.key) req.body.key = req.body.key.toLowerCase();

    const content = await CMSContent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!content) return res.status(404).json({ message: 'CMS content not found' });
    res.json(content);
  } catch {
    res.status(400).json({ message: 'Invalid update data' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Delete a CMS content block (hard delete — CMS entries are admin-managed)
// @route   DELETE /api/cms/:id
// @access  Admin
// ---------------------------------------------------------------------------
export const deleteCMS = async (req: Request, res: Response) => {
  try {
    const content = await CMSContent.findByIdAndDelete(req.params.id);
    if (!content) return res.status(404).json({ message: 'CMS content not found' });
    res.json({ message: 'CMS content deleted', id: req.params.id });
  } catch {
    res.status(500).json({ message: 'Server error deleting CMS content' });
  }
};
