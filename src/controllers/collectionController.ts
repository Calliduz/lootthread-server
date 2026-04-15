import { Request, Response } from 'express';
import Collection from '../models/Collection';

// ---------------------------------------------------------------------------
// @desc    Get all active collections
// @route   GET /api/collections
// @access  Public
// ---------------------------------------------------------------------------
export const getCollections = async (_req: Request, res: Response) => {
  try {
    const collections = await Collection.find({ isActive: true }).sort({ releaseDate: -1 });
    res.json(collections);
  } catch {
    res.status(500).json({ message: 'Server error fetching collections' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get single collection by ID
// @route   GET /api/collections/:id
// @access  Public
// ---------------------------------------------------------------------------
export const getCollectionById = async (req: Request, res: Response) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    res.json(collection);
  } catch {
    res.status(500).json({ message: 'Server error fetching collection' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Create a collection
// @route   POST /api/collections
// @access  Admin
// ---------------------------------------------------------------------------
export const createCollection = async (req: Request, res: Response) => {
  const { name, description, releaseDate, isActive } = req.body;

  if (!name) return res.status(400).json({ message: 'name is required' });

  try {
    const collection = await Collection.create({
      name,
      description,
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
      isActive: isActive ?? true,
    });
    res.status(201).json(collection);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A collection with that name already exists' });
    }
    res.status(400).json({ message: 'Invalid collection data' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Update a collection
// @route   PUT /api/collections/:id
// @access  Admin
// ---------------------------------------------------------------------------
export const updateCollection = async (req: Request, res: Response) => {
  try {
    const collection = await Collection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    res.json(collection);
  } catch {
    res.status(400).json({ message: 'Invalid update data' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Soft-delete a collection (sets isActive: false)
// @route   DELETE /api/collections/:id
// @access  Admin
// ---------------------------------------------------------------------------
export const deleteCollection = async (req: Request, res: Response) => {
  try {
    const collection = await Collection.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    res.json({ message: 'Collection deactivated', id: req.params.id });
  } catch {
    res.status(500).json({ message: 'Server error deleting collection' });
  }
};
