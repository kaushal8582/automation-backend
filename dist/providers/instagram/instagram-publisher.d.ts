import type { AxiosInstance } from 'axios';
import type { CheckMediaStatusInput, CheckMediaStatusResult, CreateMediaContainerInput, CreateMediaContainerResult, GetPostStatusInput, GetPostStatusResult, PublishMediaInput, PublishMediaResult, SocialPublisher } from '../social-publisher.js';
export type InstagramPublisherOptions = {
    client?: AxiosInstance;
    pollIntervalMs?: number;
    maxPollAttempts?: number;
};
/**
 * Official Instagram API with Instagram Login — Reels publishing.
 * Flow: create container → poll until FINISHED → media_publish.
 */
export declare class InstagramPublisher implements SocialPublisher {
    private readonly client;
    private readonly pollIntervalMs;
    private readonly maxPollAttempts;
    constructor(options?: InstagramPublisherOptions);
    createMediaContainer(input: CreateMediaContainerInput): Promise<CreateMediaContainerResult>;
    checkMediaStatus(input: CheckMediaStatusInput): Promise<CheckMediaStatusResult>;
    /**
     * Poll until FINISHED (or ERROR/EXPIRED/timeout).
     * First check after pollIntervalMs, then every pollIntervalMs.
     */
    waitUntilContainerReady(input: CheckMediaStatusInput): Promise<CheckMediaStatusResult>;
    publishMedia(input: PublishMediaInput): Promise<PublishMediaResult>;
    getPostStatus(input: GetPostStatusInput): Promise<GetPostStatusResult>;
    refreshCredentialsIfSupported(): Promise<boolean>;
    /**
     * Full publish pipeline for one Reel.
     * Persisting platformContainerId / platformPostId is the caller's responsibility
     * (destination records in later phases).
     */
    publishReel(input: CreateMediaContainerInput): Promise<{
        platformContainerId: string;
        platformPostId: string;
    }>;
}
//# sourceMappingURL=instagram-publisher.d.ts.map