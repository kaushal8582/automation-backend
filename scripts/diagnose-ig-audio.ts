/**
 * One-off diagnostic: parse an Instagram reel and probe whether
 * returned video files contain audio streams.
 * Usage: npx tsx scripts/diagnose-ig-audio.ts [url]
 */
import axios from 'axios';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm, writeFileSync } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';

config();

const url =
  process.argv[2] || 'https://www.instagram.com/reel/DdMWWUYIfsx/';

async function parse(origin: 'source' | 'cache') {
  const body = new URLSearchParams({
    auth: process.env.IG_AUTH || '',
    domain: process.env.IG_DOMAIN || 'api-ak.igvideodownloader.net',
    origin,
    link: url,
  });
  const { data } = await axios.post(
    process.env.IG_PARSE_URL ||
      'https://api.igvideodownloader.net/api/contentsite_api/media/parse',
    body.toString(),
    {
      timeout: 45_000,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: process.env.IG_ORIGIN || 'https://igvideodownloader.net',
        referer: `${process.env.IG_ORIGIN || 'https://igvideodownloader.net'}/`,
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    },
  );
  return data;
}

function collectResources(payload: any) {
  const out: any[] = [];
  for (const m of payload?.data?.media || []) {
    for (const r of m.resources || []) out.push({ scope: 'media', parentType: m.type, ...r });
  }
  for (const r of payload?.data?.resources || []) out.push({ scope: 'top', ...r });
  return out;
}

function pickUrl(r: any): string | undefined {
  for (const k of ['downloadUrl', 'download_url', 'preview_url', 'previewUrl', 'url', 'link', 'src']) {
    if (typeof r[k] === 'string' && /^https?:\/\//i.test(r[k])) return r[k];
  }
  return undefined;
}

async function main() {
  if (!process.env.IG_AUTH) {
    console.error('IG_AUTH missing in env');
    process.exit(1);
  }
  console.log('Parsing', url);
  const payload = await parse('source');
  const resources = collectResources(payload);
  console.log('status', payload.status, 'resourceCount', resources.length);

  const dir = await mkdtemp(join(tmpdir(), 'ig-diag-'));
  try {
    for (const [i, r] of resources.entries()) {
      const dl = pickUrl(r);
      console.log(`\n#${i}`, {
        scope: r.scope,
        type: r.type,
        format: r.format,
        quality: r.quality,
        size: r.size,
        keys: Object.keys(r),
        url: dl?.slice(0, 90),
      });
      if (!dl) continue;
      const file = join(dir, `r${i}.bin`);
      try {
        const resp = await axios.get(dl, {
          responseType: 'stream',
          timeout: 120_000,
          headers: {
            Referer: 'https://www.instagram.com/',
            Origin: 'https://www.instagram.com',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          maxRedirects: 5,
        });
        await pipeline(resp.data, createWriteStream(file));
        const probe = spawnSync(
          'ffprobe',
          ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-of', 'csv=p=0', file],
          { encoding: 'utf8' },
        );
        console.log('  streams:', probe.stdout.trim() || probe.stderr.trim());
      } catch (e: any) {
        console.log('  download failed', e.message);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
