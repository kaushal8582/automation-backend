import type { Readable } from 'node:stream';
export declare function createImportTempDir(): Promise<string>;
export declare function cleanupTempDir(dir: string | undefined): Promise<void>;
export declare function writeStreamToFile(stream: Readable, filePath: string, maxBytes?: number): Promise<number>;
/** True if the media file contains at least one audio stream. */
export declare function fileHasAudioStream(filePath: string): Promise<boolean>;
/**
 * Mux video + audio into a single MP4 (video stream copied, audio AAC).
 * Returns path to the output file inside the same temp directory.
 */
export declare function muxVideoWithAudio(params: {
    videoPath: string;
    audioPath: string;
    outputPath: string;
}): Promise<{
    outputPath: string;
    fileSize: number;
}>;
//# sourceMappingURL=media-mux.d.ts.map