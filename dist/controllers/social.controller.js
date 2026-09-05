import { connectManualSocialAccount, deleteSocialAccount, listSocialAccounts, testPublishInstagramReel, } from '../services/social-account.service.js';
import { buildInstagramConnectUrl, handleInstagramOAuthCallback, listInstagramAccounts, } from '../services/instagram-oauth.service.js';
import { buildFacebookConnectUrl, handleFacebookOAuthCallback, listFacebookAccounts, } from '../services/facebook-oauth.service.js';
import { AppError } from '../middlewares/error-handler.js';
import { SocialAccount } from '../models/social-account.model.js';
import { Types } from 'mongoose';
export async function listAccounts(req, res, next) {
    try {
        const accounts = await listSocialAccounts(req.user.id);
        res.status(200).json({ success: true, data: { accounts } });
    }
    catch (error) {
        next(error);
    }
}
export async function listInstagramAccountsHandler(req, res, next) {
    try {
        const accounts = await listInstagramAccounts(req.user.id);
        res.status(200).json({ success: true, data: { accounts } });
    }
    catch (error) {
        next(error);
    }
}
export async function connectManualAccount(req, res, next) {
    try {
        const account = await connectManualSocialAccount(req.user.id, req.body);
        res.status(201).json({ success: true, data: { account } });
    }
    catch (error) {
        next(error);
    }
}
export async function removeAccount(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await deleteSocialAccount(req.user.id, id);
        res.status(200).json({ success: true, data: { deleted: true } });
    }
    catch (error) {
        next(error);
    }
}
export async function testPublishInstagram(req, res, next) {
    try {
        const result = await testPublishInstagramReel(req.user.id, req.body);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
export async function instagramConnect(req, res, next) {
    try {
        const result = await buildInstagramConnectUrl(req.user.id);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
export async function instagramCallback(req, res, _next) {
    try {
        const code = typeof req.query.code === 'string' ? req.query.code : undefined;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const error = typeof req.query.error === 'string' ? req.query.error : undefined;
        const errorReason = typeof req.query.error_reason === 'string' ? req.query.error_reason : undefined;
        const errorDescription = typeof req.query.error_description === 'string' ? req.query.error_description : undefined;
        const { redirectUrl } = await handleInstagramOAuthCallback({
            code,
            state,
            error,
            errorReason,
            errorDescription,
        });
        res.redirect(302, redirectUrl);
    }
    catch (error) {
        const frontend = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
        const message = error instanceof Error ? error.message : 'Instagram OAuth callback failed';
        res.redirect(302, `${frontend}/accounts?error=${encodeURIComponent(message)}`);
    }
}
export async function instagramExchange(req, res, next) {
    try {
        const code = typeof req.body?.code === 'string' ? req.body.code : undefined;
        const state = typeof req.body?.state === 'string' ? req.body.state : undefined;
        const { redirectUrl } = await handleInstagramOAuthCallback({ code, state });
        res.status(200).json({ success: true, data: { redirectUrl } });
    }
    catch (error) {
        next(error);
    }
}
export async function facebookConnect(req, res, next) {
    try {
        const result = await buildFacebookConnectUrl(req.user.id);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
export async function facebookCallback(req, res, _next) {
    try {
        const code = typeof req.query.code === 'string' ? req.query.code : undefined;
        const state = typeof req.query.state === 'string' ? req.query.state : undefined;
        const error = typeof req.query.error === 'string' ? req.query.error : undefined;
        const errorReason = typeof req.query.error_reason === 'string' ? req.query.error_reason : undefined;
        const errorDescription = typeof req.query.error_description === 'string' ? req.query.error_description : undefined;
        const { redirectUrl } = await handleFacebookOAuthCallback({
            code,
            state,
            error,
            errorReason,
            errorDescription,
        });
        res.redirect(302, redirectUrl);
    }
    catch (error) {
        const frontend = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
        const message = error instanceof Error ? error.message : 'Facebook OAuth callback failed';
        res.redirect(302, `${frontend}/accounts?error=${encodeURIComponent(message)}`);
    }
}
export async function listFacebookAccountsHandler(req, res, next) {
    try {
        const accounts = await listFacebookAccounts(req.user.id);
        res.status(200).json({ success: true, data: { accounts } });
    }
    catch (error) {
        next(error);
    }
}
export async function reconnectAccount(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid social account id', 400, 'INVALID_SOCIAL_ACCOUNT_ID');
        }
        const account = await SocialAccount.findOne({ _id: id, userId: req.user.id });
        if (!account) {
            throw new AppError('Social account not found', 404, 'SOCIAL_ACCOUNT_NOT_FOUND');
        }
        if (account.platform !== 'instagram') {
            throw new AppError('Reconnect via OAuth is only implemented for Instagram in Phase 6', 501, 'RECONNECT_NOT_IMPLEMENTED');
        }
        const result = await buildInstagramConnectUrl(req.user.id, account.id);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=social.controller.js.map