import express from 'express';
import { 
  getArtists, 
  loginArtist, 
  getArtistStats, 
  getArtistAnalytics 
} from '../controllers/artistController';

const router = express.Router();

router.get('/', getArtists);
router.post('/login', loginArtist);
router.get('/:id/stats', getArtistStats);
router.get('/:id/analytics', getArtistAnalytics);

export default router;
