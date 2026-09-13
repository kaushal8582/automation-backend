import { type IContentImportJobDocument } from '../models/content-import-job.model.js';
import type { ExternalMediaItem } from '../providers/content-import/types.js';
import type { MediaSourceType, SocialPlatform } from '../types/domain.js';
import type { PublicMediaAsset } from './media.service.js';
export type PublicImportJob = {
    id: string;
    sourceType: MediaSourceType;
    sourcePlatform?: SocialPlatform | 'url';
    socialAccountId?: string;
    externalId?: string;
    sourceResourceId?: string;
    sourceUrl?: string;
    status: IContentImportJobDocument['status'];
    progress?: number;
    mediaAssetId?: string;
    errorCode?: string;
    errorMessage?: string;
    caption?: string;
    thumbnailUrl?: string;
    createdAt: Date;
    updatedAt: Date;
};
export declare function previewInstagramPublicLink(_userId: string, url: string): Promise<{
    sourceUrl: string;
    sourcePlatform: string;
    externalId: string;
    title: string;
    caption: string;
    thumbnail: string | undefined;
    duration: string | undefined;
    durationSeconds: number | undefined;
    resources: {
        id: string;
        type: import("../providers/content-import/public-url.types.js").PublicImportResourceType;
        format: string;
        quality: string;
        size: number;
        downloadUrl: string;
        selected: boolean;
        alreadyImported: boolean;
        existingMediaId: string | undefined;
        importable: boolean;
    }[];
}>;
export declare function enqueueInstagramPublicImport(userId: string, input: {
    sourceUrl: string;
    resourceIds: string[];
    rightsConfirmed: boolean;
    forceDuplicate?: boolean;
}): Promise<{
    jobs: PublicImportJob[];
    preview: {
        title: string;
        caption: string;
        thumbnail: string | undefined;
        externalId: string;
        sourceUrl: string;
    };
}>;
export declare function listImportSources(userId: string): Promise<{
    platforms: {
        platform: "instagram" | "facebook";
        supported: boolean;
    }[];
    urlImport: {
        supported: boolean;
        adapters: string[];
        note: string;
    };
    accounts: {
        id: string;
        platform: "instagram" | "facebook";
        accountType: "instagram_business" | "instagram_creator" | "facebook_page";
        platformAccountId: string;
        username: string | undefined;
        displayName: string | undefined;
        profilePicture: string | undefined;
        status: "error" | "active" | "expired" | "revoked";
        permissions: string[];
    }[];
}>;
export declare function listAccountMedia(userId: string, socialAccountId: string, options: {
    limit?: number;
    cursor?: string;
}): Promise<{
    items: ExternalMediaItem[];
    nextCursor: string | undefined;
    account: {
        id: string;
        platform: "instagram" | "facebook";
        username: string | undefined;
        displayName: string | undefined;
    };
    pageSize: number;
}>;
export declare function enqueueAccountImport(userId: string, socialAccountId: string, externalIds: string[]): Promise<{
    jobs: PublicImportJob[];
}>;
export declare function previewUrlImport(userId: string, url: string, options?: {
    socialAccountId?: string;
}): Promise<{
    preview: import("../providers/content-import/types.js").UrlImportPreview;
    adapter: string;
}>;
export declare function enqueueUrlImport(userId: string, url: string, options?: {
    socialAccountId?: string;
}): Promise<{
    jobs: PublicImportJob[];
} | {
    jobs: PublicImportJob[];
    media: PublicMediaAsset & {
        sourceType?: string;
        sourcePlatform?: string;
        sourceExternalId?: string;
        sourceCaption?: string;
        sourcePostUrl?: string;
        importedAt?: Date;
    };
}>;
export declare function getImportJob(userId: string, jobId: string): Promise<PublicImportJob>;
export declare function getImportJobs(userId: string, jobIds: string[]): Promise<PublicImportJob[]>;
export declare function retryImportJob(userId: string, jobId: string): Promise<PublicImportJob>;
export declare function processImportJob(data: {
    jobId: string;
    userId: string;
    socialAccountId?: string;
    externalId?: string;
    sourceUrl?: string;
    sourceResourceId?: string;
    sourceType: 'account' | 'url' | 'instagram_public';
    forceDuplicate?: boolean;
}): Promise<void>;
//# sourceMappingURL=content-import.service.d.ts.map