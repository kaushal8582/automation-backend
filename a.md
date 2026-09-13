# Download API — Full Flow

How the backend turns a YouTube / Instagram URL into downloadable media links (reels, posts, videos, photos, audio).

---

## Overview

The app does **not** download files through our server. The backend only **parses** the URL via a third-party provider and returns clean metadata + direct `downloadUrl`s. The mobile app then downloads those URLs directly to the device.

```
User pastes URL (YT / IG reel / post)
        │
        ▼
  React Native app
  (YTVideoDownloader / IGVideoDownloader)
        │
        │  POST /api/download/parse
        │  or POST /api/download/instagram/parse
        │  body: { "url": "..." }
        ▼
  Our Express backend (app.js)
        │
        │  1. Validate URL → extract media id
        │  2. Check in-memory cache (1 hour TTL)
        │  3. Call provider parse API (Vidssave / IG Video Downloader)
        │  4. Normalize resources (video / image / audio)
        │  5. Cache + return JSON
        ▼
  App shows quality list → user taps download
        │
        ▼
  App downloads file from resource.downloadUrl
  (direct CDN / provider URL — not via our server)
```

---

## Endpoints

| Platform | Method | Path | Body |
|----------|--------|------|------|
| YouTube (video / Shorts) | `POST` | `/api/download/parse` | `{ "url": "<youtube url>" }` |
| Instagram (reel / post / IGTV) | `POST` | `/api/download/instagram/parse` | `{ "url": "<instagram url>" }` |

Rate limit: **30 requests / minute** per IP on all `/api/*` routes.

Base URL (prod): `https://yt-backend-b4tl.onrender.com`

---

## Step-by-step (backend)

Shared handler: `handleDownloadParse` in `app.js`.

### 1. Auth check

| Route | Env var | Error if missing |
|-------|---------|------------------|
| YouTube | `VIDSSAVE_AUTH` | `VIDSSAVE_AUTH is not set on the server.` |
| Instagram | `IG_AUTH` (falls back to `VIDSSAVE_AUTH`) | `IG_AUTH is not set on the server.` |

### 2. Read & validate URL

- Reads `req.body.url` (also accepts `req.query.url`).
- Empty → `400` `{ "error": "Missing URL" }`.

**YouTube** — `extractVideoId`:

- `youtube.com/watch?v=...`
- `youtu.be/...`
- `youtube.com/shorts/...`
- `youtube.com/embed/...`
- `youtube.com/live/...`
- or bare 11-char video id

Invalid → `400` `{ "error": "Invalid YouTube URL" }`

**Instagram** — `extractInstagramId`:

- `instagram.com/reel/...` or `/reels/...`
- `instagram.com/p/...` (photo / carousel post)
- `instagram.com/tv/...` (IGTV)
- `instagr.am/p/...` or `/reel/...`

Invalid → `400` `{ "error": "Invalid Instagram URL. Use a reel, post, or IGTV link." }`

### 3. Cache lookup

Key:

- YouTube: `download-yt:<videoId>`
- Instagram: `download-ig-v2:<shortCode>`

TTL: **1 hour** (`CACHE_TTL_MS`). Hit → return cached JSON immediately.

### 4. Call provider parse API

`parseMediaProvider` POSTs `application/x-www-form-urlencoded`:

```
auth=<AUTH>
domain=<DOMAIN>
origin=<cache|source>
link=<user url>
```

| | YouTube (Vidssave) | Instagram |
|--|--------------------|-----------|
| Parse URL | `VIDSSAVE_PARSE_URL` | `IG_PARSE_URL` |
| Domain | `VIDSSAVE_DOMAIN` | `IG_DOMAIN` |
| Origin header | `https://vidssave.com` | `IG_ORIGIN` (default `https://igvideodownloader.net`) |
| Try order | `cache` → `source` | `source` → `cache` |

Headers sent to provider: `content-type`, `origin`, `referer`, browser-like `user-agent`.

If provider returns HTTP error or `status: false` / `status_code >= 400` → throw with their message.

### 5. Collect & normalize resources

`collectDownloadResources` + `normalizeDownloadResources`:

1. Prefer `data.media[].resources[]` (carousels / multi-item posts get labels like `1/3 Photo`).
2. Fallback: image thumbnails if no nested resources.
3. Fallback: top-level `data.resources`.
4. Normalize type: `video` | `image` | `audio` (from type / format).
5. Dedupe by `downloadUrl`; drop empty URLs.

Each resource becomes:

```json
{
  "id": "resource-id-or-generated",
  "type": "video",
  "format": "MP4",
  "quality": "Original",
  "size": 0,
  "downloadUrl": "https://...",
  "downloadMode": "..."
}
```

No usable resources → `404` `{ "error": "No downloadable formats found" }`.

### 6. Success response

```json
{
  "videoId": "Dxxxx or youtubeId",
  "title": "Post / video title",
  "thumbnail": "https://...",
  "duration": "0:45",
  "durationSeconds": 45,
  "resources": [
    {
      "id": "...",
      "type": "video",
      "format": "MP4",
      "quality": "Original",
      "size": 1234567,
      "downloadUrl": "https://...",
      "downloadMode": "..."
    },
    {
      "id": "...",
      "type": "image",
      "format": "JPG",
      "quality": "1/3 Photo",
      "size": 0,
      "downloadUrl": "https://...",
      "downloadMode": "..."
    }
  ]
}
```

Then stored in cache under the key from step 3.

---

## Example requests

### Instagram Reel

```bash
curl -X POST https://yt-backend-b4tl.onrender.com/api/download/instagram/parse \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.instagram.com/reel/SHORTCODE/"}'
```

### Instagram post / carousel

```bash
curl -X POST http://localhost:3000/api/download/instagram/parse \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.instagram.com/p/SHORTCODE/"}'
```

### YouTube / Shorts

```bash
curl -X POST http://localhost:3000/api/download/parse \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=VIDEO_ID"}'
```

---

## App → backend mapping

| Screen | API helper (`ytapp/src/api/videoApi.js`) | Backend route |
|--------|------------------------------------------|---------------|
| `YTVideoDownloader.jsx` | `parseDownloadMedia(url)` | `POST /api/download/parse` |
| `IGVideoDownloader.jsx` | `parseInstagramMedia(url)` | `POST /api/download/instagram/parse` |

After parse, the app downloads with `downloadMediaFile` (`ytapp/src/utils/downloadFile.js`) using each `resource.downloadUrl`, with Referer/Origin tuned for Instagram vs YouTube CDNs.

---

## Env vars (see `.env.example`)

```env
PORT=3000

# YouTube downloader proxy
VIDSSAVE_AUTH=...
VIDSSAVE_DOMAIN=api-ak.vidssave.com
VIDSSAVE_PARSE_URL=https://api.vidssave.com/api/contentsite_api/media/parse

# Instagram downloader proxy
IG_AUTH=...
IG_DOMAIN=api-ak.igvideodownloader.net
IG_PARSE_URL=https://api.igvideodownloader.net/api/contentsite_api/media/parse
IG_ORIGIN=https://igvideodownloader.net
```

---

## Error reference

| Status | When |
|--------|------|
| `400` | Missing URL, or URL not YT / IG format |
| `404` | Provider returned no media / no downloadable formats |
| `429` | Rate limit (30/min) |
| `500` | Auth env missing, or unexpected server error |
| `502+` | Provider rejected / failed (status bubbled from provider when available) |

Shape: `{ "error": "human readable message" }`

---

## Key functions in `app.js`

| Function | Role |
|----------|------|
| `extractVideoId` | Parse YouTube id from URL |
| `extractInstagramId` | Parse reel/post/tv shortcode |
| `parseMediaProvider` | HTTP call to Vidssave / IG provider |
| `handleDownloadParse` | Shared parse → cache → normalize → respond |
| `collectDownloadResources` | Flatten media / carousel into list |
| `normalizeDownloadResources` | Types, formats, dedupe, `downloadUrl` |
| `hasParsePayload` | Decide if provider data is usable |
| `getCached` / `setCache` | 1h in-memory cache |

---

## Mental model

1. **Parse only on backend** — get titles, thumbs, quality list, direct links.
2. **Download on client** — app hits `downloadUrl` and saves to gallery / Downloads.
3. **Same shape for YT and IG** — one UI can render both; only the parse endpoint differs.
4. **Reels, posts, photos, carousels, audio** — all come back as `resources[]` with `type` of `video`, `image`, or `audio`.
