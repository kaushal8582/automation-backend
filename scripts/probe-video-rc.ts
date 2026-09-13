import dotenv from 'dotenv';
import { join } from 'path';
import { instagramPublicUrlImportProvider } from '../src/providers/content-import/instagram-public-url.provider.js';
import { resolveProviderDownloadUrl } from '../src/providers/content-import/ig-resource-resolve.js';
import {
  cleanupTempDir,
  createImportTempDir,
  fileHasAudioStream,
  writeStreamToFile,
} from '../src/utils/media-mux.js';
import { safeFetchMediaStream } from '../src/utils/safe-fetch.js';

dotenv.config();

const url = process.argv[2] || 'https://www.instagram.com/reel/DdMWWUYIfsx/?stkn=NTc4MTIwNjQ2YQ==';

async function main() {
  const parsed = await instagramPublicUrlImportProvider.parse(url);
  const v = parsed.resources.find((r) => r.type === 'video');
  if (!v) throw new Error('no video');
  console.log({
    quality: v.quality,
    hasRc: Boolean(v.resourceContent),
    dl: v.downloadUrl.slice(0, 100),
  });
  if (!v.resourceContent) return;

  const resolved = await resolveProviderDownloadUrl({
    resource_content: v.resourceContent,
    format: v.format,
    type: v.type,
    resource_id: v.id,
  });
  console.log('resolved', resolved?.slice(0, 160) || null);
  if (!resolved) return;

  const dir = await createImportTempDir();
  try {
    const fetched = await safeFetchMediaStream(resolved, {
      headers: {
        Referer: 'https://igvideodownloader.net/',
        Origin: 'https://igvideodownloader.net',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    const path = join(dir, 'alt.bin');
    await writeStreamToFile(fetched.stream, path);
    console.log('resolved hasAudio?', await fileHasAudioStream(path));
  } finally {
    await cleanupTempDir(dir);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
