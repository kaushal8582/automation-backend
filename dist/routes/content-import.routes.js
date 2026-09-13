import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getAccountMedia, getImportJobById, getImportJobsBatch, getImportSources, importAccountMedia, importInstagramPublic, importUrl, previewInstagramPublic, previewUrl, retryFailedImport, } from '../controllers/content-import.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { importAccountMediaSchema, importUrlSchema, instagramPublicImportSchema, instagramPublicPreviewSchema, listAccountMediaQuerySchema, } from '../validators/content-import.validator.js';
const router = Router();
router.use(requireAuth);
/** Prevent spam against the third-party Instagram parser. */
const instagramPublicLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many Instagram import requests. Try again shortly.',
        code: 'IMPORT_RATE_LIMITED',
        details: {},
    },
});
router.get('/sources', getImportSources);
router.get('/jobs', getImportJobsBatch);
router.get('/jobs/:id', getImportJobById);
router.post('/jobs/:id/retry', retryFailedImport);
router.get('/accounts/:socialAccountId/media', validateQuery(listAccountMediaQuerySchema), getAccountMedia);
router.post('/accounts/:socialAccountId/import', validateBody(importAccountMediaSchema), importAccountMedia);
router.post('/url/preview', validateBody(importUrlSchema), previewUrl);
router.post('/url/import', validateBody(importUrlSchema), importUrl);
router.post('/instagram/preview', instagramPublicLimiter, validateBody(instagramPublicPreviewSchema), previewInstagramPublic);
router.post('/instagram/import', instagramPublicLimiter, validateBody(instagramPublicImportSchema), importInstagramPublic);
export default router;
//# sourceMappingURL=content-import.routes.js.map