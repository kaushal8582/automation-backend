import type { AxiosInstance } from 'axios';
import type { CheckMediaStatusInput, CheckMediaStatusResult, CreateMediaContainerInput, CreateMediaContainerResult, GetPostStatusInput, GetPostStatusResult, PublishMediaInput, PublishMediaResult, SocialPublisher } from '../social-publisher.js';
export type FacebookPublisherOptions = {
    client?: AxiosInstance;
    /** Poll interval in ms while FB transcodes the video (default 5 s) */
    pollIntervalMs?: number;
    /** Max poll attempts (default 36 — 3 min) */
    maxPollAttempts?: number;
};
/**
 * Facebook Pages video publishing via Graph API.
 *
 * Flow:
 *   1. POST /{page-id}/videos — non-blocking upload (returns video_id)
 *   2. Poll GET /{video-id}?fields=status until status.video_status === 'ready'
 *   3. No separate "publish" call needed — the video posts go live automatically
 *      once transcoding finishes (or we set `published=true` in step 1).
 *
 * We map the FB flow onto the SocialPublisher interface:
 *   - createMediaContainer  → upload video, get video_id (container)
 *   - checkMediaStatus      → poll transcoding status
 *   - publishMedia          → no-op (video was published at upload time)
 */
export declare class FacebookPublisher implements SocialPublisher {
    private readonly client;
    private readonly pollIntervalMs;
    private readonly maxPollAttempts;
    constructor(options?: FacebookPublisherOptions);
    /**
     * Upload video to the Facebook Page.
     * `platformAccountId` is the Facebook Page ID.
     * Returns the FB video ID as `platformContainerId`.
     */
    createMediaContainer(input: CreateMediaContainerInput): Promise<CreateMediaContainerResult>;
    /** Poll the video transcoding status. */
    checkMediaStatus(input: CheckMediaStatusInput): Promise<CheckMediaStatusResult>;
    /** Poll until the video is ready (transcoded). */
    waitUntilVideoReady(input: CheckMediaStatusInput): Promise<CheckMediaStatusResult>;
    /**
     * No-op for Facebook — video is published when uploaded with `published=true`.
     * We still poll for "ready" in `waitUntilVideoReady`, but there's no separate
     * publish step. Returns the same videoId as the platformPostId.
     */
    publishMedia(input: PublishMediaInput): Promise<PublishMediaResult>;
    getPostStatus(input: GetPostStatusInput): Promise<GetPostStatusResult>;
    refreshCredentialsIfSupported(): Promise<boolean>;
    /** Full publish pipeline for one FB video post. */
    publishVideo(input: CreateMediaContainerInput): Promise<{
        platformContainerId: string;
        platformPostId: string;
    }>;
}
//# sourceMappingURL=facebook-publisher.d.ts.map