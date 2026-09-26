# FILEY

**Simple. Fast. Share.**

A lightweight, peer-to-peer-inspired file sharing web application. Share a file, let people search for it by name, extension or category, and let them download it — no account required to browse or to share.

## 1. Overview

FILEY recreates the simple, fast experience of classic desktop file-sharing apps as a modern web app: a searchable file index, upload with live progress, file detail pages with checksums, and download tracking. It is **not** a real peer-to-peer network — see [Future P2P Architecture](#11-future-p2p-architecture) for what that would take.

## 2. Features

- Share with drag-and-drop and a live progress bar (percent, bytes, speed) — no account required
- Full-text + partial search by filename, extension, or category, with sorting and pagination
- File detail pages with metadata, SHA-256 checksum, and download count
- Share/Download/Delete icon actions next to every file, on the homepage and the file details page alike
- Optional accounts (register/login) for a profile page with your own files, stats, and self-service delete (owners only)
- Abuse reporting on any file, with an admin dashboard to review reports, block/remove/restore individual files, or wipe every file site-wide
- Pluggable storage backend: local disk for development, Supabase Storage for production

## 3. Tech Stack

- **Backend:** Node.js, Express, Supabase (Postgres + Storage), EJS, Multer, express-session (custom Supabase-backed store)
- **Frontend:** Server-rendered EJS, vanilla JS (Fetch/XHR), plain CSS — no framework
- **Storage:** Local filesystem (dev) or a Supabase Storage bucket (production) via `@supabase/supabase-js`
- **Security:** helmet, express-rate-limit, bcryptjs, custom CSRF middleware

## 4. Project Structure

```
filey/
├── app.js                    # Express app: middleware, routes, error handling
├── server.js                 # Entry point (local listener / Vercel export)
├── config/
│   ├── supabase.js           # Cached Supabase client (PostgREST + Storage)
│   └── sessionStore.js       # express-session store backed by the `sessions` table
├── models/                   # File, User, Report — thin Supabase query wrappers
├── routes/                   # index, files, upload, auth, admin, api
├── controllers/              # Route handlers
├── services/                 # storageService, fileService, searchService, peerService
├── middleware/                # errorHandler, uploadMiddleware, authMiddleware, csrf, rateLimiter
├── utils/                     # categorize.js, sanitize.js, icons.js (shared inline-SVG icon set)
├── views/                     # EJS templates + layouts/main.ejs
├── public/                    # css, js, assets
├── uploads/                   # local dev storage only (gitignored)
├── supabase/schema.sql        # Run once in the Supabase SQL Editor
└── scripts/promoteAdmin.js    # CLI to grant the admin role
```

## 5. Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role API key (Project Settings → API) — server-only, never expose to the browser |
| `SESSION_SECRET` | Long random string for signing session cookies |
| `PORT` | Local dev port (default 3000) |
| `STORAGE_PROVIDER` | `local` or `supabase` |
| `SUPABASE_STORAGE_BUCKET` | Required when `STORAGE_PROVIDER=supabase` — bucket name |
| `MAX_UPLOAD_SIZE_MB` | Upload size limit (default 200) |

## 6. Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com) (no credit card required on the free tier).
2. Go to **Project Settings → API** and copy the **Project URL** (`SUPABASE_URL`) and the **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`) — not the `anon` key.
3. Go to **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the `users`, `files`, `reports`, and `sessions` tables plus a helper function.
4. Go to **Storage** and create a new bucket named `filey-uploads` (or any name — just set `SUPABASE_STORAGE_BUCKET` to match). Keep it **Private**; the app generates short-lived signed URLs for downloads, so the bucket never needs to be public.

## 7. Local Development

```bash
npm install
cp .env.example .env    # then fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SESSION_SECRET
npm run dev
```

The app runs at `http://localhost:3000` with `STORAGE_PROVIDER=local` by default — uploaded files are written to `uploads/`.

Production mode locally:

```bash
npm start
```

## 8. Storage Configuration

All file I/O goes through `services/storageService.js`, which exposes `uploadFile()`, `getDownloadTarget()`, and `deleteFile()`. Nothing outside that file knows which backend is active.

- **`STORAGE_PROVIDER=local`** — writes to the `uploads/` folder. **Development only.** Serverless platforms (Vercel included) don't guarantee the filesystem persists or is shared across invocations, so this is never safe in production.
- **`STORAGE_PROVIDER=supabase`** — uploads to a Supabase Storage bucket; downloads redirect the browser to a short-lived (60s) signed URL rather than streaming bytes through the Express app, so large/slow downloads never risk hitting Vercel's function-duration limit.

## 9. Vercel Deployment

**Option A — GitHub (recommended):**
1. Push this repo to a new GitHub repository (see below — this project needs its own repo, separate from any parent folder's).
2. Go to [vercel.com/new](https://vercel.com/new), import that GitHub repo.
3. Before the first deploy, add the environment variables below under **Environment Variables**.
4. Deploy. Every future push to the tracked branch redeploys automatically.

**Option B — CLI:**
```bash
npm i -g vercel
vercel login
vercel        # first deploy (preview)
vercel --prod # promote to production
```
With the CLI, add env vars via `vercel env add <NAME>` for each one below, or add them in the dashboard afterward — either way they must exist before the app can actually run.

**Required environment variables** (Project Settings → Environment Variables), same values as your local `.env`:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase secret/service_role key |
| `SESSION_SECRET` | A long random string (a different one from local, ideally) |
| `STORAGE_PROVIDER` | `supabase` — **not** `local` |
| `SUPABASE_STORAGE_BUCKET` | `filey-uploads` (or whatever you named it) |
| `MAX_UPLOAD_SIZE_MB` | `200` (see the clamp note below — the real ceiling on Vercel is lower) |

`.env` is gitignored and never read by Vercel — these have to be entered directly in the Vercel dashboard/CLI regardless of what's in your local `.env`.

**After the first deploy:** visit `https://<your-project>.vercel.app/admin` and log in with an admin account (see [Admin Access](#admin-access) below) to confirm the database connection and dashboard both work end-to-end.

**Known serverless limitation:** Vercel's Node.js serverless functions buffer the incoming request before your handler runs and cap the request body size (historically ~4.5 MB on Node.js runtimes, larger on some plans/runtimes). Because uploads in this version are proxied through the Express app (`POST /upload`), very large files can hit that platform ceiling. This is a genuine constraint, not something this codebase can route around — the correct fix is a **presigned direct-to-Supabase-Storage upload** (browser uploads straight to the bucket via `createSignedUploadUrl()`, then calls a small API route to record the metadata), which bypasses the function body entirely. That flow is not implemented in V1 to keep the upload path simple and centralized; `storageService.js` already isolates all storage logic, so adding a signed-upload endpoint later doesn't require touching the rest of the app.

**What happens today when a file is too big — by design, nothing breaks:**
- `middleware/uploadMiddleware.js` detects `process.env.VERCEL` (set automatically by the platform) and clamps the effective upload limit to a safe 4 MB whenever it's running there, regardless of what `MAX_UPLOAD_SIZE_MB` is set to. That number is also handed to the upload page, so the size limit shown to the user always matches what the server will actually accept.
- `public/js/upload.js` checks the selected file's size client-side before the request is even sent, so an oversized file gets an immediate, friendly toast instead of a network round-trip.
- If a request gets through anyway (a non-browser API caller, for instance) and is still small enough to reach the function, multer's own `LIMIT_FILE_SIZE` error is caught and turned into a clean `413 Payload Too Large` JSON/HTML response by `errorHandler.js` — never an unhandled exception.
- If a request is too big to reach the function at all (above Vercel's own hard ~4.5 MB platform ceiling), Vercel rejects it at the edge before any of this app's code runs — that one request fails, but the function/process itself is never invoked and nothing else is affected.
- Any temp file staged by multer during a rejected or failed upload is always cleaned up (including on unexpected errors during the magic-byte content check), so repeated failed uploads can't fill up Vercel's shared, size-limited `/tmp` over time.
- `server.js` also installs `unhandledRejection`/`uncaughtException` handlers as a last line of defense, so a bug anywhere else in the app logs an error instead of taking the whole process down.

## 10. Security

- Filenames are sanitized (path traversal stripped, control/reserved characters replaced) before storage
- Uploaded content is sniffed with magic-byte detection (`file-type`) rather than trusting the browser's declared MIME type; known executable/script extensions are rejected outright
- Downloads always force `Content-Disposition: attachment` and stream from storage — nothing uploaded is ever placed somewhere the server would execute it
- Passwords hashed with bcrypt (cost factor 12); sessions stored server-side in Postgres via a custom Supabase-backed session store
- All database access goes through `@supabase/supabase-js` (PostgREST), which parameterizes every query — no hand-built SQL/filter strings built from user input
- express-rate-limit on general traffic, auth, uploads, and reports
- A session-bound CSRF token is required on all state-changing form/API requests
- helmet sets a restrictive CSP (`script-src 'self'`, no inline scripts anywhere in the templates) and standard security headers
- Stack traces are only shown to non-JSON clients in non-production environments

## 11. Future P2P Architecture

V1 is intentionally centralized: FILEY itself holds the file index (Supabase Postgres) and the storage layer (`storageService.js`). `services/peerService.js` defines the shape a real peer-to-peer version would need — `searchPeers()`, `requestFile()`, `getPeerStatus()` — without implementing WebRTC or any peer transport yet, so routes/controllers can be written against a stable interface now and wired up to real peers later without a rewrite.

```
FILEY
   |
   +---- File Index (Supabase Postgres)
   |
   +---- Storage Layer (local / Supabase)
   |
   +---- [future] Peer A / Peer B / Peer C
```

## Admin Access

There's no signup flow for admins — promote an existing registered user from the command line:

```bash
node scripts/promoteAdmin.js user@example.com
```

They'll see an **Admin** link in the nav on their next request and can review reports and moderate files at `/admin`.
