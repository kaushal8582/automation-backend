import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.js';
import { createLogger } from './logger.js';

const logger = createLogger('media-mux');

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH?.trim() || 'ffmpeg';
}

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH?.trim() || 'ffprobe';
}

async function runCommand(
  bin: string,
  args: string[],
  timeoutMs = 180_000,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new AppError('Media processing timed out', 504, 'IMPORT_PLATFORM_ERROR'));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(
        new AppError(
          `Failed to run ${bin}. Is FFmpeg installed? ${error.message}`,
          500,
          'IMPORT_PLATFORM_ERROR',
        ),
      );
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new AppError(
          `${bin} failed (exit ${code}): ${stderr.slice(-500) || 'unknown error'}`,
          500,
          'IMPORT_PLATFORM_ERROR',
        ),
      );
    });
  });
}

export async function createImportTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'mastplayer-import-'));
}

export async function cleanupTempDir(dir: string | undefined): Promise<void> {
  if (!dir) return;
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

export async function writeStreamToFile(
  stream: Readable,
  filePath: string,
  maxBytes = env.MEDIA_MAX_UPLOAD_BYTES,
): Promise<number> {
  let written = 0;
  stream.on('data', (chunk: Buffer) => {
    written += chunk.length;
    if (written > maxBytes) {
      stream.destroy(
        new AppError(
          `File exceeds maximum upload size of ${maxBytes} bytes`,
          400,
          'IMPORT_MEDIA_TOO_LARGE',
          { maxBytes },
        ),
      );
    }
  });
  await pipeline(stream, createWriteStream(filePath));
  const info = await stat(filePath);
  return info.size;
}

/** True if the media file contains at least one audio stream. */
export async function fileHasAudioStream(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await runCommand(ffprobeBin(), [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=index',
      '-of',
      'csv=p=0',
      filePath,
    ]);
    return stdout.trim().length > 0;
  } catch (error) {
    logger.warn('ffprobe audio check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Mux video + audio into a single MP4 (video stream copied, audio AAC).
 * Returns path to the output file inside the same temp directory.
 */
export async function muxVideoWithAudio(params: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
}): Promise<{ outputPath: string; fileSize: number }> {
  // First try: copy video + encode audio to AAC (works for mp3/m4a/aac)
  try {
    await runCommand(ffmpegBin(), [
      '-y',
      '-i',
      params.videoPath,
      '-i',
      params.audioPath,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0?',
      '-shortest',
      '-movflags',
      '+faststart',
      params.outputPath,
    ]);
  } catch (firstError) {
    // Fallback: let ffmpeg pick audio stream more loosely
    logger.warn('Primary mux failed, retrying', {
      error: firstError instanceof Error ? firstError.message : String(firstError),
    });
    await runCommand(ffmpegBin(), [
      '-y',
      '-i',
      params.videoPath,
      '-i',
      params.audioPath,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      '-movflags',
      '+faststart',
      params.outputPath,
    ]);
  }

  const info = await stat(params.outputPath);
  if (!info.size) {
    throw new AppError('Muxed video is empty', 500, 'IMPORT_PLATFORM_ERROR');
  }

  const hasAudio = await fileHasAudioStream(params.outputPath);
  if (!hasAudio) {
    throw new AppError(
      'Failed to attach audio to video. The muxed file still has no sound.',
      500,
      'IMPORT_PLATFORM_ERROR',
    );
  }

  logger.info('Muxed video with audio', { bytes: info.size, hasAudio });
  return { outputPath: params.outputPath, fileSize: info.size };
}
