import { cancelPost, createPost, getPostById, listPosts, retryPost, } from '../services/post.service.js';
import { getPostMetrics, syncPostMetrics } from '../services/metrics.service.js';
export async function createPostHandler(req, res, next) {
    try {
        const result = await createPost(req.user.id, req.body);
        res.status(202).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
export async function listPostsHandler(req, res, next) {
    try {
        const query = req.query;
        const result = await listPosts(req.user.id, {
            limit: query.limit,
            offset: query.offset,
            from: query.from,
            to: query.to,
            status: query.status,
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
export async function getPostHandler(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await getPostById(req.user.id, id);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
export async function cancelPostHandler(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await cancelPost(req.user.id, id);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
export async function getPostMetricsHandler(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const metrics = await getPostMetrics(req.user.id, id);
        res.status(200).json({ success: true, data: { metrics } });
    }
    catch (error) {
        next(error);
    }
}
export async function refreshPostMetricsHandler(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        // Trigger a live sync then return fresh metrics
        await syncPostMetrics(id, req.user.id);
        const metrics = await getPostMetrics(req.user.id, id);
        res.status(200).json({ success: true, data: { metrics } });
    }
    catch (error) {
        next(error);
    }
}
export async function retryPostHandler(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const body = (req.body ?? {});
        const result = await retryPost(req.user.id, id, body.destinationIds);
        res.status(202).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=post.controller.js.map