import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Artist from '../models/Artist';

// Generate JWT
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// @desc    Get all artists
// @route   GET /api/artists
// @access  Public
export const getArtists = async (req: Request, res: Response) => {
  try {
    const artists = await Artist.find({});
    res.json(artists);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching artists' });
  }
};

// @desc    Auth artist & get token
// @route   POST /api/artists/login
// @access  Public
export const loginArtist = async (req: Request, res: Response) => {
  const { name, password } = req.body;

  try {
    const artist = await Artist.findOne({ name }).select('+password');

    if (artist && (await artist.comparePassword(password))) {
      res.json({
        artist: {
          id: artist._id,
          name: artist.name,
          bio: artist.bio,
          avatar: artist.avatar,
          salesCount: artist.salesCount,
          rating: artist.rating,
          totalRevenue: artist.totalRevenue,
          activeSkinsCount: artist.activeSkinsCount
        },
        token: generateToken((artist._id as any).toString()),
      });
    } else {
      res.status(401).json({ message: 'Invalid name or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get artist stats
// @route   GET /api/artists/:id/stats
// @access  Private
export const getArtistStats = async (req: Request, res: Response) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (artist) {
      res.json({
        totalRevenue: artist.totalRevenue || 0,
        activeSkins: artist.activeSkinsCount || 0,
        totalSales: typeof artist.salesCount === 'number' ? artist.salesCount : 1240,
        revenueTrend: '+12.5%',
        skinsTrend: '+2',
        salesTrend: '+8.4%'
      });
    } else {
      res.status(404).json({ message: 'Artist not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

// @desc    Get artist analytics
// @route   GET /api/artists/:id/analytics
// @access  Private
export const getArtistAnalytics = async (req: Request, res: Response) => {
  try {
    // Mock analytics for the dashboard
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
        { name: 'Skins', value: 400, color: '#00F0FF' },
        { name: 'Attachments', value: 300, color: '#7000FF' },
      ],
      topItems: [
        { name: 'Viper Genesis', sales: 124 },
        { name: 'Cooling Grip', sales: 89 },
        { name: 'Tactical Sleeve', sales: 67 }
      ]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
};
