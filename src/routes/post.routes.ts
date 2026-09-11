import { Router } from 'express';
import {
  cancelPostHandler,
  createPostHandler,
  createPostsBatchHandler,
  getPostHandler,
  getPostMetricsHandler,
  listPostsHandler,
  refreshPostMetricsHandler,
  retryPostHandler,
} from '../controllers/post.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import {
  createPostSchema,
  createPostsBatchSchema,
  listPostsQuerySchema,
  retryPostSchema,
} from '../validators/post.validator.js';

const router = Router();

router.use(requireAuth);

router.post('/', validateBody(createPostSchema), createPostHandler);
router.post('/batch', validateBody(createPostsBatchSchema), createPostsBatchHandler);
router.get('/', validateQuery(listPostsQuerySchema), listPostsHandler);
router.get('/:id', getPostHandler);
router.post('/:id/cancel', cancelPostHandler);
router.post('/:id/retry', validateBody(retryPostSchema), retryPostHandler);
router.get('/:id/metrics', getPostMetricsHandler);
router.post('/:id/metrics/refresh', refreshPostMetricsHandler);

export default router;
