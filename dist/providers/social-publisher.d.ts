export type CreateMediaContainerInput = {
    platformAccountId: string;
    accessToken: string;
    videoUrl: string;
    caption?: string;
    coverUrl?: string;
    shareToFeed?: boolean;
    hideLikeCount?: boolean;
};
export type CreateMediaContainerResult = {
    platformContainerId: string;
};
export type CheckMediaStatusInput = {
    platformContainerId: string;
    accessToken: string;
};
export type MediaContainerStatusCode = 'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED' | 'PUBLISHED' | string;
export type CheckMediaStatusResult = {
    statusCode: MediaContainerStatusCode;
    status?: string;
};
export type PublishMediaInput = {
    platformAccountId: string;
    platformContainerId: string;
    accessToken: string;
};
export type PublishMediaResult = {
    platformPostId: string;
};
export type GetPostStatusInput = {
    platformPostId: string;
    accessToken: string;
};
export type GetPostStatusResult = {
    id: string;
    raw?: unknown;
};
/**
 * Platform-agnostic publisher contract.
 * Controllers/jobs must call this — never Instagram/Facebook HTTP directly.
 */
export interface SocialPublisher {
    createMediaContainer(input: CreateMediaContainerInput): Promise<CreateMediaContainerResult>;
    checkMediaStatus(input: CheckMediaStatusInput): Promise<CheckMediaStatusResult>;
    publishMedia(input: PublishMediaInput): Promise<PublishMediaResult>;
    getPostStatus(input: GetPostStatusInput): Promise<GetPostStatusResult>;
    refreshCredentialsIfSupported(): Promise<boolean>;
}
//# sourceMappingURL=social-publisher.d.ts.map