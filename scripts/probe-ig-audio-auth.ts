/**
 * Probe how to fetch audio after download_url returns task_id.
 */
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const auth = process.env.IG_AUTH!;
const domain = process.env.IG_DOMAIN!;
const origin = process.env.IG_ORIGIN!;
const parseUrl = process.env.IG_PARSE_URL!;
const ua =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function collect(obj: unknown, out: Record<string, unknown>[] = []) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    for (const x of obj) collect(x, out);
    return out;
  }
  const rec = obj as Record<string, unknown>;
  if (rec.type === 'audio' || String(rec.format || '').toUpperCase() === 'MP3') {
    out.push(rec);
  }
  for (const v of Object.values(rec)) collect(v, out);
  return out;
}

async function main() {
  const body = new URLSearchParams({ auth, domain, url: 'https://www.instagram.com/reel/DdLlfT6hREl/', lang: 'en' });
  // provider may use `link` not `url` — try both via our provider later; raw parse:
  const parseBody = new URLSearchParams({ auth, domain, origin: 'source', link: 'https://www.instagram.com/reel/DdLlfT6hREl/' });
  const { data } = await axios.post(parseUrl, parseBody.toString(), {
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin,
      referer: `${origin}/`,
      'user-agent': ua,
      accept: 'application/json',
    },
    timeout: 30000,
  });

  const audios = collect(data);
  const videos = collect(data).filter(() => false);
  // also grab one video with download_url for comparison
  const all: Record<string, unknown>[] = [];
  const walk = (o: unknown) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    const r = o as Record<string, unknown>;
    if (r.type === 'video' && typeof r.download_url === 'string') all.push(r);
    Object.values(r).forEach(walk);
  };
  walk(data);

  console.log('audio count', audios.length, 'video with url', all.length);
  const a = audios[0];
  if (!a) throw new Error('no audio');
  console.log(
    JSON.stringify(
      {
        type: a.type,
        format: a.format,
        download_url: a.download_url,
        preview_url: a.preview_url,
        resource_id: a.resource_id,
        download_mode: a.download_mode,
        resource_content_len: typeof a.resource_content === 'string' ? a.resource_content.length : 0,
        resource_content_prefix:
          typeof a.resource_content === 'string' ? a.resource_content.slice(0, 160) : a.resource_content,
      },
      null,
      2,
    ),
  );

  // Compare: can we download a video gateway URL?
  const v = all[0];
  if (v && typeof v.download_url === 'string') {
    console.log('\nvideo download_url sample:', String(v.download_url).slice(0, 140));
    const vr = await axios.get(String(v.download_url), {
      headers: { Origin: origin, Referer: `${origin}/`, 'User-Agent': ua, Accept: '*/*' },
      responseType: 'arraybuffer',
      timeout: 20000,
      validateStatus: () => true,
      maxRedirects: 5,
    });
    console.log('video fetch', vr.status, vr.headers['content-type'], Buffer.from(vr.data).length);
  }

  const dlEndpoint = parseUrl.replace(/\/media\/parse\/?$/, '/media/download_url');
  const dlBody = new URLSearchParams({
    auth,
    domain,
    resource_content: String(a.resource_content || ''),
    format: String(a.format || 'MP3'),
    type: String(a.type || 'audio'),
    resource_id: String(a.resource_id || ''),
    download_mode: String(a.download_mode || ''),
  });
  const { data: dl } = await axios.post(dlEndpoint, dlBody.toString(), {
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin,
      referer: `${origin}/`,
      'user-agent': ua,
      accept: 'application/json',
    },
    timeout: 30000,
  });
  console.log('\ndownload_url response:', JSON.stringify(dl, null, 2).slice(0, 2500));

  const taskId = dl?.data?.task_id || dl?.data?.taskId || dl?.task_id;
  if (!taskId) {
    console.log('NO task_id');
    return;
  }

  const streamUrl = `https://${domain}/api/gateway/proxy/stream?request=${encodeURIComponent(taskId)}`;
  console.log('\nstreamUrl len', streamUrl.length);

  const combos: Array<{ name: string; url?: string; headers: Record<string, string> }> = [
    { name: 'ig-origin', headers: { Origin: origin, Referer: `${origin}/`, 'User-Agent': ua, Accept: '*/*' } },
    {
      name: 'auth-query',
      url: `${streamUrl}&auth=${encodeURIComponent(auth)}`,
      headers: { Origin: origin, Referer: `${origin}/`, 'User-Agent': ua, Accept: '*/*' },
    },
    {
      name: 'cookie-auth',
      headers: {
        Origin: origin,
        Referer: `${origin}/`,
        'User-Agent': ua,
        Accept: '*/*',
        Cookie: `auth=${auth}`,
      },
    },
    {
      name: 'x-auth',
      headers: {
        Origin: origin,
        Referer: `${origin}/`,
        'User-Agent': ua,
        Accept: '*/*',
        Authorization: auth,
        'x-auth': auth,
      },
    },
    {
      name: 'instagram-ref',
      headers: {
        Origin: 'https://www.instagram.com',
        Referer: 'https://www.instagram.com/',
        'User-Agent': ua,
        Accept: '*/*',
      },
    },
  ];

  for (const c of combos) {
    const u = c.url || streamUrl;
    const r = await axios.get(u, {
      headers: c.headers,
      responseType: 'arraybuffer',
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: () => true,
    });
    const buf = Buffer.from(r.data);
    console.log(
      c.name,
      'status',
      r.status,
      'ct',
      r.headers['content-type'],
      'bytes',
      buf.length,
      'head',
      buf.slice(0, 80).toString('utf8').replace(/\n/g, ' '),
    );
  }

  // Poll task endpoints
  for (const path of [
    '/api/contentsite_api/media/download_url',
    '/api/contentsite_api/media/download_progress',
    '/api/contentsite_api/media/task_status',
    '/api/contentsite_api/task/status',
    '/api/gateway/proxy/progress',
  ]) {
    for (const method of ['GET', 'POST'] as const) {
      try {
        const u =
          method === 'GET'
            ? `https://api.igvideodownloader.net${path}?auth=${encodeURIComponent(auth)}&domain=${encodeURIComponent(domain)}&task_id=${encodeURIComponent(taskId)}`
            : `https://api.igvideodownloader.net${path}`;
        const r =
          method === 'GET'
            ? await axios.get(u, {
                headers: { origin, referer: `${origin}/`, 'user-agent': ua },
                validateStatus: () => true,
                timeout: 10000,
              })
            : await axios.post(
                u,
                new URLSearchParams({ auth, domain, task_id: taskId, request: taskId }).toString(),
                {
                  headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    origin,
                    referer: `${origin}/`,
                    'user-agent': ua,
                  },
                  validateStatus: () => true,
                  timeout: 10000,
                },
              );
        const snippet = typeof r.data === 'string' ? r.data.slice(0, 200) : JSON.stringify(r.data).slice(0, 300);
        if (r.status !== 404 && r.status !== 405) {
          console.log('probe', method, path, r.status, snippet);
        }
      } catch (e) {
        console.log('probe err', method, path, e instanceof Error ? e.message : e);
      }
    }
  }

  // Maybe task needs delay then re-fetch download_url?
  console.log('\nWaiting 3s and re-calling download_url...');
  await new Promise((r) => setTimeout(r, 3000));
  const { data: dl2 } = await axios.post(dlEndpoint, dlBody.toString(), {
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin,
      referer: `${origin}/`,
      'user-agent': ua,
      accept: 'application/json',
    },
    timeout: 30000,
  });
  console.log('2nd download_url:', JSON.stringify(dl2, null, 2).slice(0, 1500));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
