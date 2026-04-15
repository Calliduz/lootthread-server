import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product';
import { ProductType } from '../models/Product';

// ---------------------------------------------------------------------------
// @desc    Get all products — supports filtering by type, collectionId, artistId
// @route   GET /api/products?type=skin&collectionId=xxx&artistId=yyy
// @access  Public
// ---------------------------------------------------------------------------
export const getProducts = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, any> = {};

    if (req.query.type) {
      filter.type = req.query.type as ProductType;
    }
    if (req.query.collectionId) {
      filter.collectionId = new mongoose.Types.ObjectId(req.query.collectionId as string);
    }
    if (req.query.artistId) {
      filter.artistId = new mongoose.Types.ObjectId(req.query.artistId as string);
    }

    const products = await Product.find(filter)
      .populate('artistId',     'name imageUrl avatar')
      .populate('collectionId', 'name releaseDate')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch {
    res.status(500).json({ message: 'Server error fetching products' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
// ---------------------------------------------------------------------------
export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('artistId',     'name imageUrl avatar')
      .populate('collectionId', 'name releaseDate');

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch {
    res.status(500).json({ message: 'Server error fetching product' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Create a product
// @route   POST /api/products
// @access  Admin
// ---------------------------------------------------------------------------
export const createProduct = async (req: Request, res: Response) => {
  const {
    name, title, description,
    price, stockQuantity, inventory,
    type, subCategory, tags,
    imageUrl, images,
    artistId, collectionId,
  } = req.body;

  if (!name || !description || !price || !type) {
    return res.status(400).json({ message: 'name, description, price and type are required' });
  }

  try {
    const product = await Product.create({
      name, title, description,
      price,
      stockQuantity: stockQuantity ?? inventory ?? 0,
      inventory:     inventory ?? stockQuantity ?? 0,
      type,
      subCategory, tags,
      imageUrl, images,
      artistId:     artistId     ? new mongoose.Types.ObjectId(artistId)     : undefined,
      collectionId: collectionId ? new mongoose.Types.ObjectId(collectionId) : undefined,
    });
    res.status(201).json(product);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Invalid product data' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Admin
// ---------------------------------------------------------------------------
export const updateProduct = async (req: Request, res: Response) => {
  try {
    // Coerce ObjectId strings if provided
    if (req.body.artistId) {
      req.body.artistId = new mongoose.Types.ObjectId(req.body.artistId);
    }
    if (req.body.collectionId) {
      req.body.collectionId = new mongoose.Types.ObjectId(req.body.collectionId);
    }
    // Keep both stock fields in sync if caller only sends one
    if (req.body.stockQuantity !== undefined && req.body.inventory === undefined) {
      req.body.inventory = req.body.stockQuantity;
    }
    if (req.body.inventory !== undefined && req.body.stockQuantity === undefined) {
      req.body.stockQuantity = req.body.inventory;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('artistId',     'name imageUrl avatar')
      .populate('collectionId', 'name releaseDate');

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Invalid update data' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Delete a product (hard delete)
// @route   DELETE /api/products/:id
// @access  Admin
// ---------------------------------------------------------------------------
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted', id: req.params.id });
  } catch {
    res.status(500).json({ message: 'Server error deleting product' });
  }
};
