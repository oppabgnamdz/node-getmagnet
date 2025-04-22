import express from 'express';
import generalRoutes from './general';
import missavRoutes from './missav';
import torrentRoutes from './torrent';
import javRoutes from './jav';
import specialRoutes from './special';
import otherRoutes from './other';

const router = express.Router();

// MissAV routes
router.use('/missav', missavRoutes);

// Torrent routes - contains torrent and ppv
router.use('/', torrentRoutes);

// JAV routes
router.use('/', javRoutes);

// Special routes
router.use('/', specialRoutes);

// Other specialized routes (24av, get-all, get-western, sukebei, onejav)
router.use('/', otherRoutes);

// General routes - keep this last because it has the catch-all route
router.use('/', generalRoutes);

export default router;
