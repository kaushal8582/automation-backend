import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Types } from 'mongoose';
import { buildPublicUrl, getR2Bucket, getR2Client, isR2ConfiguredForRealUploads, resolveAccessibleMediaUrl, } from '../config/r2.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.js';
import { MediaAsset } from '../models/media-asset.model.js';
import { assertAllowedMimeType, assertUploadSize, buildObjectKey, resolveMediaType, validateMediaMetadata, } from './media-validation.service.js';
const PRESIGN_EXPIRES_SECONDS = 60 * 15;
async function toPublic(media) {
    return {
        id: media._id.toString(),
        type: media.type,
        originalFilename: media.originalFilename,
        r2Key: media.r2Key,
        publicUrl: await resolveAccessibleMediaUrl(media.r2Key, media.publicUrl),
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        duration: media.duration,
        width: media.width,
        height: media.height,
        status: media.status,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt,
    };
}
function assertR2Ready() {
    if (!isR2ConfiguredForRealUploads()) {
        throw new AppError('Cloudflare R2 is not configured. Set R2_* environment variables.', 503, 'R2_NOT_CONFIGURED');
    }
}
function assertOwnedKey(userId, r2Key) {
    const expectedPrefix = `users/${userId}/`;
    if (!r2Key.startsWith(expectedPrefix)) {
        throw new AppError('Invalid media key for this user', 403, 'MEDIA_KEY_FORBIDDEN');
    }
}
export async function createPresignedUpload(userId, input) {
    assertR2Ready();
    assertAllowedMimeType(input.mimeType);
    assertUploadSize(input.fileSize);
    const mediaType = resolveMediaType(input.mimeType, input.type);
    const r2Key = buildObjectKey(userId, input.mimeType, mediaType);
    const command = new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: r2Key,
        ContentType: input.mimeType,
    });
    // Do not sign ContentLength/checksum headers — browser PUT only sends Content-Type + body.
    const uploadUrl = await getSignedUrl(getR2Client(), command, {
        expiresIn: PRESIGN_EXPIRES_SECONDS,
        signableHeaders: new Set(['content-type']),
    });
    return {
        uploadUrl,
        r2Key,
        publicUrl: buildPublicUrl(r2Key) || (await resolveAccessibleMediaUrl(r2Key)),
        headers: { 'Content-Type': input.mimeType },
        expiresIn: PRESIGN_EXPIRES_SECONDS,
    };
}
export async function createPresignedUploadBatch(userId, input) {
    const uploads = await Promise.all(input.files.map(async (file, clientIndex) => {
        const result = await createPresignedUpload(userId, file);
        return { ...result, clientIndex };
    }));
    return { uploads };
}
export async function completeMediaUpload(userId, input) {
    assertR2Ready();
    assertOwnedKey(userId, input.r2Key);
    await validateMediaMetadata(input);
    const mediaType = resolveMediaType(input.mimeType, input.type);
    let head;
    try {
        head = await getR2Client().send(new HeadObjectCommand({
            Bucket: getR2Bucket(),
            Key: input.r2Key,
        }));
    }
    catch {
        throw new AppError('Uploaded object not found in R2. Complete the upload before confirming.', 400, 'MEDIA_NOT_FOUND_IN_STORAGE');
    }
    const remoteSize = head.ContentLength ?? 0;
    if (remoteSize !== input.fileSize) {
        throw new AppError('Uploaded file size does not match the declared fileSize', 400, 'MEDIA_SIZE_MISMATCH', { expected: input.fileSize, actual: remoteSize });
    }
    const existing = await MediaAsset.findOne({ r2Key: input.r2Key, userId });
    if (existing) {
        return toPublic(existing);
    }
    const media = await MediaAsset.create({
        userId: new Types.ObjectId(userId),
        type: mediaType,
        originalFilename: input.originalFilename,
        r2Key: input.r2Key,
        // Empty when R2_PUBLIC_URL is unset; API responses use a fresh presigned GET URL.
        publicUrl: buildPublicUrl(input.r2Key) || '',
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        duration: input.duration,
        width: input.width,
        height: input.height,
        status: 'ready',
    });
    return toPublic(media);
}
export async function listMediaForUser(userId) {
    const items = await MediaAsset.find({ userId }).sort({ createdAt: -1 });
    return Promise.all(items.map((item) => toPublic(item)));
}
export async function getMediaForUser(userId, mediaId) {
    if (!Types.ObjectId.isValid(mediaId)) {
        throw new AppError('Invalid media id', 400, 'INVALID_MEDIA_ID');
    }
    const media = await MediaAsset.findOne({ _id: mediaId, userId });
    if (!media) {
        throw new AppError('Media not found', 404, 'MEDIA_NOT_FOUND');
    }
    return toPublic(media);
}
export async function deleteMediaForUser(userId, mediaId) {
    if (!Types.ObjectId.isValid(mediaId)) {
        throw new AppError('Invalid media id', 400, 'INVALID_MEDIA_ID');
    }
    const media = await MediaAsset.findOne({ _id: mediaId, userId });
    if (!media) {
        throw new AppError('Media not found', 404, 'MEDIA_NOT_FOUND');
    }
    if (isR2ConfiguredForRealUploads()) {
        try {
            await getR2Client().send(new DeleteObjectCommand({
                Bucket: getR2Bucket(),
                Key: media.r2Key,
            }));
        }
        catch {
            // Continue deleting DB record; storage cleanup can be retried later
        }
    }
    await media.deleteOne();
}
export async function bulkDeleteMediaForUser(userId, ids) {
    const uniqueIds = [...new Set(ids)];
    const objectIds = uniqueIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) {
        throw new AppError('No valid media ids provided', 400, 'INVALID_MEDIA_ID');
    }
    const items = await MediaAsset.find({ _id: { $in: objectIds }, userId });
    if (items.length === 0) {
        throw new AppError('No matching media found', 404, 'MEDIA_NOT_FOUND');
    }
    if (isR2ConfiguredForRealUploads()) {
        await Promise.all(items.map(async (media) => {
            try {
                await getR2Client().send(new DeleteObjectCommand({
                    Bucket: getR2Bucket(),
                    Key: media.r2Key,
                }));
            }
            catch {
                // Continue — DB delete still happens
            }
        }));
    }
    const result = await MediaAsset.deleteMany({
        _id: { $in: items.map((m) => m._id) },
        userId,
    });
    return { deletedCount: result.deletedCount ?? 0 };
}
export function getMediaUploadLimits() {
    return {
        maxUploadBytes: env.MEDIA_MAX_UPLOAD_BYTES,
    };
}
//# sourceMappingURL=media.service.js.map