import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import mediaRoutes from './media.routes.js';
import socialRoutes from './social.routes.js';
import postRoutes from './post.routes.js';
import contentImportRoutes from './content-import.routes.js';

const router = Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/social', socialRoutes);
router.use('/posts', postRoutes);
router.use('/import', contentImportRoutes);

export default router;
