import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import PromoCode from '../models/PromoCode';
import User from '../models/User';

// ---------------------------------------------------------------------------
// Shared helper: Check if a promo code is currently valid
// ---------------------------------------------------------------------------
const isCodeValid = (code: any, userLevel: number) => {
  if (!code.isActive) return { valid: false, reason: 'This promo code is inactive.' };
  if (code.expiryDate && new Date(code.expiryDate) < new Date()) return { valid: false, reason: 'This promo code has expired.' };
  if (code.usageLimit !== null && code.usedCount >= code.usageLimit) return { valid: false, reason: 'This promo code has reached its usage limit.' };
  if (userLevel < code.minLevel) return { valid: false, reason: `This code requires Loyalty Rank ${code.minLevel} or higher.` };
  return { valid: true, reason: '' };
};

// ---------------------------------------------------------------------------
// @desc    Validate a promo code (customer-facing — returns discount info)
// @route   POST /api/promo/validate
// @access  Private
// ---------------------------------------------------------------------------
export const validatePromoCode = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Code is required.' });

    const promo = await PromoCode.findOne({ code: (code as string).toUpperCase().trim() });
    if (!promo) return res.status(404).json({ message: 'Invalid promo code.' });

    const user = await User.findById(req.user?.id);
    const userLevel = user?.level ?? 1;

    const { valid, reason } = isCodeValid(promo, userLevel);
    if (!valid) return res.status(400).json({ message: reason });

    return res.json({
      code: promo.code,
      discountPercent: promo.discountPercent,
      description: promo.description,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error validating code.' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get all eligible promo codes for the current user (Customer)
// @route   GET /api/promo/eligible
// @access  Private
// ---------------------------------------------------------------------------
export const getEligiblePromoCodes = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = await User.findById(req.user?.id);
    const userLevel = user?.level ?? 1;

    // Fetch all active promos
    const allPromos = await PromoCode.find({ isActive: true });

    // Filter by validity (usage, expiry, minLevel)
    const eligiblePromos = allPromos
      .filter(promo => isCodeValid(promo, userLevel).valid)
      .sort((a, b) => b.discountPercent - a.discountPercent);

    return res.json(
      eligiblePromos.map(p => ({
        code: p.code,
        discountPercent: p.discountPercent,
        description: p.description,
      }))
    );
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching eligible promo codes.' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get all promo codes (Admin)
// @route   GET /api/promo
// @access  Admin
// ---------------------------------------------------------------------------
export const getAllPromoCodes = async (_req: AuthRequest, res: Response): Promise<any> => {
  try {
    const codes = await PromoCode.find({}).sort({ createdAt: -1 });
    return res.json(codes);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error fetching promo codes.' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Create a promo code (Admin)
// @route   POST /api/promo
// @access  Admin
// ---------------------------------------------------------------------------
export const createPromoCode = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { code, description, discountPercent, minLevel, expiryDate, usageLimit, isActive } = req.body;

    if (!code || !discountPercent) {
      return res.status(400).json({ message: 'Code and discountPercent are required.' });
    }

    const existing = await PromoCode.findOne({ code: code.toUpperCase().trim() });
    if (existing) return res.status(409).json({ message: 'A promo code with that name already exists.' });

    const promo = await PromoCode.create({
      code: code.toUpperCase().trim(),
      description,
      discountPercent: Number(discountPercent),
      minLevel: minLevel ? Number(minLevel) : 0,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json(promo);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Invalid promo code data.' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Update a promo code (Admin)
// @route   PUT /api/promo/:id
// @access  Admin
// ---------------------------------------------------------------------------
export const updatePromoCode = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const promo = await PromoCode.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!promo) return res.status(404).json({ message: 'Promo code not found.' });
    return res.json(promo);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error updating promo code.' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Delete a promo code (Admin)
// @route   DELETE /api/promo/:id
// @access  Admin
// ---------------------------------------------------------------------------
export const deletePromoCode = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promo code not found.' });
    return res.json({ message: 'Promo code deleted.', id: req.params.id });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting promo code.' });
  }
};

// Export isCodeValid for use in orderController
export { isCodeValid };
