import { Router } from 'express';
import { bulkDeleteMedia, completeMedia, deleteMedia, listMedia, presignMedia, presignMediaBatch, } from '../controllers/media.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { bulkDeleteMediaSchema, completeMediaSchema, presignMediaBatchSchema, presignMediaSchema, } from '../validators/media.validator.js';
const router = Router();
router.use(requireAuth);
router.post('/presign', validateBody(presignMediaSchema), presignMedia);
router.post('/presign-batch', validateBody(presignMediaBatchSchema), presignMediaBatch);
router.post('/complete', validateBody(completeMediaSchema), completeMedia);
router.post('/bulk-delete', validateBody(bulkDeleteMediaSchema), bulkDeleteMedia);
router.get('/', listMedia);
router.delete('/:id', deleteMedia);
export default router;
//# sourceMappingURL=media.routes.js.map