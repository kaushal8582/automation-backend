import { enqueueAccountImport, enqueueInstagramPublicImport, enqueueUrlImport, getImportJob, getImportJobs, listAccountMedia, listImportSources, previewInstagramPublicLink, previewUrlImport, retryImportJob, } from '../services/content-import.service.js';
export async function getImportSources(req, res, next) {
    try {
        const data = await listImportSources(req.user.id);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
export async function getAccountMedia(req, res, next) {
    try {
        const socialAccountId = Array.isArray(req.params.socialAccountId)
            ? req.params.socialAccountId[0]
            : req.params.socialAccountId;
        const query = req.query;
        const data = await listAccountMedia(req.user.id, socialAccountId, {
            limit: query.limit,
            cursor: query.cursor,
        });
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
export async function importAccountMedia(req, res, next) {
    try {
        const socialAccountId = Array.isArray(req.params.socialAccountId)
            ? req.params.socialAccountId[0]
            : req.params.socialAccountId;
        const body = req.body;
        const data = await enqueueAccountImport(req.user.id, socialAccountId, body.externalIds);
        res.status(202).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
export async function previewUrl(req, res, next) {
    try {
        const body = req.body;
        const data = await previewUrlImport(req.user.id, body.url, {
            socialAccountId: body.socialAccountId,
        });
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
export async function importUrl(req, res, next) {
    try {
        const body = req.body;
        const data = await enqueueUrlImport(req.user.id, body.url, {
            socialAccountId: body.socialAccountId,
        });
        res.status(202).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
export async function previewInstagramPublic(req, res, next) {
    try {
        const body = req.body;
        const data = await previewInstagramPublicLink(req.user.id, body.url);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
export async function importInstagramPublic(req, res, next) {
    try {
        const body = req.body;
        const data = await enqueueInstagramPublicImport(req.user.id, {
            sourceUrl: body.sourceUrl,
            resourceIds: body.resourceIds,
            rightsConfirmed: body.rightsConfirmed,
            forceDuplicate: body.forceDuplicate,
        });
        res.status(202).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
export async function getImportJobById(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const job = await getImportJob(req.user.id, id);
        res.status(200).json({ success: true, data: { job } });
    }
    catch (error) {
        next(error);
    }
}
export async function getImportJobsBatch(req, res, next) {
    try {
        const idsParam = typeof req.query.ids === 'string' ? req.query.ids : '';
        const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
        const jobs = await getImportJobs(req.user.id, ids);
        res.status(200).json({ success: true, data: { jobs } });
    }
    catch (error) {
        next(error);
    }
}
export async function retryFailedImport(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const job = await retryImportJob(req.user.id, id);
        res.status(202).json({ success: true, data: { job } });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=content-import.controller.js.map