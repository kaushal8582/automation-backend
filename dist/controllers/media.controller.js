import { bulkDeleteMediaForUser, completeMediaUpload, createPresignedUpload, createPresignedUploadBatch, deleteMediaForUser, getMediaUploadLimits, listMediaForUser, } from '../services/media.service.js';
export async function presignMedia(req, res, next) {
    try {
        const data = await createPresignedUpload(req.user.id, req.body);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
export async function presignMediaBatch(req, res, next) {
    try {
        const data = await createPresignedUploadBatch(req.user.id, req.body);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
export async function completeMedia(req, res, next) {
    try {
        const media = await completeMediaUpload(req.user.id, req.body);
        res.status(201).json({ success: true, data: { media } });
    }
    catch (error) {
        next(error);
    }
}
export async function listMedia(req, res, next) {
    try {
        const media = await listMediaForUser(req.user.id);
        res.status(200).json({
            success: true,
            data: {
                media,
                limits: getMediaUploadLimits(),
            },
        });
    }
    catch (error) {
        next(error);
    }
}
export async function deleteMedia(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await deleteMediaForUser(req.user.id, id);
        res.status(200).json({ success: true, data: { deleted: true } });
    }
    catch (error) {
        next(error);
    }
}
export async function bulkDeleteMedia(req, res, next) {
    try {
        const body = req.body;
        const result = await bulkDeleteMediaForUser(req.user.id, body.ids);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=media.controller.js.map