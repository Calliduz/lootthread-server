import { Request, Response } from 'express';
import Artist from '../models/Artist';

// ---------------------------------------------------------------------------
// @desc    Get all active artists
// @route   GET /api/artists
// @access  Public
// ---------------------------------------------------------------------------
export const getArtists = async (_req: Request, res: Response) => {
  try {
    const artists = await Artist.find({ isActive: true }).sort({ name: 1 });
    res.json(artists);
  } catch {
    res.status(500).json({ message: 'Server error fetching artists' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get ALL artists (including inactive)
// @route   GET /api/artists/admin/all
// @access  Admin
// ---------------------------------------------------------------------------
export const getArtistsAdmin = async (_req: Request, res: Response) => {
  try {
    const artists = await Artist.find({}).sort({ name: 1 });
    res.json(artists);
  } catch {
    res.status(500).json({ message: 'Server error fetching artists (admin)' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get single artist by ID
// @route   GET /api/artists/:id
// @access  Public
// ---------------------------------------------------------------------------
export const getArtistById = async (req: Request, res: Response) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.status(404).json({ message: 'Artist not found' });
    res.json(artist);
  } catch {
    res.status(500).json({ message: 'Server error fetching artist' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Create a new artist profile
// @route   POST /api/artists
// @access  Admin
// ---------------------------------------------------------------------------
export const createArtist = async (req: Request, res: Response) => {
  const { name, bio, imageUrl, avatar, salesCount, rating, totalRevenue, activeSkinsCount, isActive } = req.body;

  if (!name) return res.status(400).json({ message: 'name is required' });

  try {
    const artist = await Artist.create({
      name, bio, imageUrl, avatar,
      salesCount, rating, totalRevenue, activeSkinsCount,
      isActive: isActive ?? true,
    });
    res.status(201).json(artist);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An artist with that name already exists' });
    }
    res.status(400).json({ message: 'Invalid artist data' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Update an artist profile
// @route   PUT /api/artists/:id
// @access  Admin
// ---------------------------------------------------------------------------
export const updateArtist = async (req: Request, res: Response) => {
  try {
    const artist = await Artist.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!artist) return res.status(404).json({ message: 'Artist not found' });
    res.json(artist);
  } catch {
    res.status(400).json({ message: 'Invalid update data' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Soft-delete an artist (sets isActive: false)
// @route   DELETE /api/artists/:id
// @access  Admin
// ---------------------------------------------------------------------------
export const deleteArtist = async (req: Request, res: Response) => {
  try {
    const artist = await Artist.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!artist) return res.status(404).json({ message: 'Artist not found' });
    res.json({ message: 'Artist deactivated', id: req.params.id });
  } catch {
    res.status(500).json({ message: 'Server error deleting artist' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get artist stats (kept for dashboard compatibility)
// @route   GET /api/artists/:id/stats
// @access  Admin
// ---------------------------------------------------------------------------
export const getArtistStats = async (req: Request, res: Response) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.status(404).json({ message: 'Artist not found' });

    res.json({
      totalRevenue:   artist.totalRevenue ?? 0,
      activeSkins:    artist.activeSkinsCount ?? 0,
      totalSales:     typeof artist.salesCount === 'number' ? artist.salesCount : 0,
      revenueTrend:   '+12.5%',
      skinsTrend:     '+2',
      salesTrend:     '+8.4%',
    });
  } catch {
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get artist analytics
// @route   GET /api/artists/:id/analytics
// @access  Admin
// ---------------------------------------------------------------------------
export const getArtistAnalytics = async (_req: Request, res: Response) => {
  // Placeholder until a real analytics aggregation is wired
  res.json({
    salesTrend: [
      { name: 'Mon', sales: 40, revenue: 2400 },
      { name: 'Tue', sales: 30, revenue: 1398 },
      { name: 'Wed', sales: 20, revenue: 9800 },
      { name: 'Thu', sales: 27, revenue: 3908 },
      { name: 'Fri', sales: 18, revenue: 4800 },
      { name: 'Sat', sales: 23, revenue: 3800 },
      { name: 'Sun', sales: 34, revenue: 4300 },
    ],
    categoryBreakdown: [
      { name: 'Skins',       value: 400, color: '#00F0FF' },
      { name: 'Attachments', value: 300, color: '#7000FF' },
      { name: 'Apparel',     value: 150, color: '#FF00C8' },
    ],
    topItems: [
      { name: 'Viper Genesis',  sales: 124 },
      { name: 'Cooling Grip',   sales: 89  },
      { name: 'Tactical Sleeve', sales: 67 },
    ],
  });
};

// ---------------------------------------------------------------------------
// @desc    Artist login — permanently redirected to /api/auth/login
// @route   POST /api/artists/login  [DEPRECATED — 410 Gone]
// ---------------------------------------------------------------------------
export const loginArtist = async (_req: Request, res: Response) => {
  res.status(410).json({
    message: 'Artist login has moved. Use POST /api/auth/login.',
  });
};
