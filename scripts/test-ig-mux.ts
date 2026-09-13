/**
 * End-to-end: parse reel → pick best video (prefer Original w/ audio) → mux if needed → ffprobe.
 * Usage: npx tsx scripts/test-ig-mux.ts [url]
 */
import { join } from 'node:path';
import dotenv from 'dotenv';
import { pickPreferredVideo } from '../src/providers/content-import/ig-video-rank.js';
import { instagramPublicUrlImportProvider } from '../src/providers/content-import/instagram-public-url.provider.js';
import {
  cleanupTempDir,
  createImportTempDir,
  fileHasAudioStream,
  muxVideoWithAudio,
  writeStreamToFile,
} from '../src/utils/media-mux.js';
import { safeFetchMediaStream } from '../src/utils/safe-fetch.js';
import { env } from '../src/config/env.js';

dotenv.config();

const url = process.argv[2] || 'https://www.instagram.com/reel/DdMWWUYIfsx/';

function downloadHeadersForUrl(downloadUrl: string): Record<string, string> {
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  if (/igvideodownloader\.net/i.test(downloadUrl)) {
    return {
      Referer: `${env.IG_ORIGIN}/`,
      Origin: env.IG_ORIGIN,
      'User-Agent': ua,
      Accept: '*/*',
    };
  }
  return {
    Referer: 'https://www.instagram.com/',
    Origin: 'https://www.instagram.com',
    'User-Agent': ua,
  };
}

async function download(resource: { downloadUrl: string; id: string }, path: string) {
  const fetched = await safeFetchMediaStream(resource.downloadUrl, {
    headers: downloadHeadersForUrl(resource.downloadUrl),
  });
  return writeStreamToFile(fetched.stream, path);
}

async function main() {
  console.log('Parsing', url);
  const parsed = await instagramPublicUrlImportProvider.parse(url);
  const videos = parsed.resources.filter((r) => r.type === 'video');
  const audios = parsed.resources.filter((r) => r.type === 'audio');
  console.log(
    'resources',
    parsed.resources.map((r) => `${r.type}:${r.format}:${r.quality}`),
  );
  console.log('videos', videos.length, 'audios', audios.length);

  if (videos.length === 0) throw new Error('No video');
  const video = pickPreferredVideo(videos)!;
  console.log('chosen video', video.quality, video.size, video.id);

  const dir = await createImportTempDir();
  try {
    let videoPath = join(dir, 'v.mp4');
    await download(video, videoPath);
    let has = await fileHasAudioStream(videoPath);
    console.log('video hasAudio?', has);

    if (!has) {
      const alts = [...videos]
        .filter((v) => v.id !== video.id)
        .sort((a, b) => {
          const score = (q: string) =>
            /original/i.test(q) ? 2 : !/^\d+\s*p$/i.test(q.trim()) ? 1 : 0;
          return score(b.quality) - score(a.quality);
        });
      for (const alt of alts) {
        const altPath = join(dir, `alt-${alt.id}.mp4`);
        await download(alt, altPath);
        const altHas = await fileHasAudioStream(altPath);
        console.log('alt', alt.quality, 'hasAudio?', altHas);
        if (altHas) {
          videoPath = altPath;
          has = true;
          break;
        }
      }
    }

    if (has) {
      console.log('SUCCESS: video contains audio');
      return;
    }
    if (audios.length === 0) {
      console.error('FAIL: no companion audio from provider for this reel');
      process.exit(2);
    }
    const audio = audios[0]!;
    console.log('companion audio', audio.format, audio.id, audio.downloadUrl.slice(0, 80));
    const audioPath = join(dir, 'a.bin');
    await download(audio, audioPath);
    const out = join(dir, 'muxed.mp4');
    const muxed = await muxVideoWithAudio({ videoPath, audioPath, outputPath: out });
    const ok = await fileHasAudioStream(muxed.outputPath);
    console.log('muxed hasAudio?', ok, 'bytes', muxed.fileSize);
    if (!ok) process.exit(3);
    console.log('SUCCESS: muxed reel has sound');
  } finally {
    await cleanupTempDir(dir);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
