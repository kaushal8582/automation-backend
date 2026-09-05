import { Router } from 'express';
import { connectManualAccount, facebookCallback, facebookConnect, instagramCallback, instagramConnect, instagramExchange, listAccounts, listFacebookAccountsHandler, listInstagramAccountsHandler, reconnectAccount, removeAccount, testPublishInstagram, } from '../controllers/social.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { instagramOAuthExchangeSchema, instagramTestPublishSchema, manualSocialAccountSchema, } from '../validators/social.validator.js';
const router = Router();
// Public OAuth callbacks (no session required — CSRF protected by OAuth state)
router.get('/instagram/callback', instagramCallback);
router.post('/instagram/exchange', validateBody(instagramOAuthExchangeSchema), instagramExchange);
router.get('/facebook/callback', facebookCallback);
// Meta App Dashboard stubs (Business login settings requires these URLs)
router.get('/instagram/deauthorize', (_req, res) => {
    res.status(200).json({ success: true });
});
router.post('/instagram/deauthorize', (_req, res) => {
    res.status(200).json({ success: true });
});
router.get('/instagram/data-deletion', (_req, res) => {
    res.status(200).json({
        success: true,
        url: 'https://localhost:5001/api/social/instagram/data-deletion',
        confirmation_code: 'mastplayer-local',
    });
});
router.post('/instagram/data-deletion', (_req, res) => {
    res.status(200).json({
        success: true,
        url: 'https://localhost:5001/api/social/instagram/data-deletion',
        confirmation_code: 'mastplayer-local',
    });
});
router.use(requireAuth);
router.get('/accounts', listAccounts);
router.get('/instagram/accounts', listInstagramAccountsHandler);
router.get('/instagram/connect', instagramConnect);
router.get('/facebook/accounts', listFacebookAccountsHandler);
router.get('/facebook/connect', facebookConnect);
router.post('/accounts/manual', validateBody(manualSocialAccountSchema), connectManualAccount);
router.post('/accounts/:id/reconnect', reconnectAccount);
router.delete('/accounts/:id', removeAccount);
router.post('/instagram/test-publish', validateBody(instagramTestPublishSchema), testPublishInstagram);
export default router;
//# sourceMappingURL=social.routes.js.map