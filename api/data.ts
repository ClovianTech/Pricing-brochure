import { createHash, timingSafeEqual } from 'node:crypto';
import { BlobPreconditionFailedError, get, put } from '@vercel/blob';

/**
 * Sync endpoint: the whole workspace is one JSON document in a private Vercel Blob.
 *
 *   GET /api/data           → 200 { data, etag } | 304 (If-None-Match) | 404 { error: 'empty' }
 *   PUT /api/data { data, baseEtag }
 *                           → 200 { etag } | 409 { data, etag } when another device saved first
 *
 * Every request needs `Authorization: Bearer <APP_PASSCODE>`.
 */

export interface DocStore {
  read(ifNoneMatch?: string): Promise<{ body: string; etag: string } | { notModified: true; etag: string } | null>;
  /** Writes only if the stored etag still equals `ifMatch` (null = must not exist yet). */
  write(body: string, ifMatch: string | null): Promise<{ etag: string } | 'conflict'>;
}

const PATHNAME = 'workspace/data.json';
const MAX_BYTES = 4_000_000; // stays under the 4.5 MB function body limit
const COLLECTIONS = ['transactions', 'clients', 'projects', 'leads', 'personal', 'budgets'] as const;

export const blobStore: DocStore = {
  async read(ifNoneMatch) {
    const res = await get(PATHNAME, { access: 'private', useCache: false, ifNoneMatch });
    if (!res) return null;
    if (res.statusCode === 304) return { notModified: true, etag: res.blob.etag };
    return { body: await new Response(res.stream).text(), etag: res.blob.etag };
  },
  async write(body, ifMatch) {
    try {
      const r = await put(PATHNAME, body, {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        ...(ifMatch ? { allowOverwrite: true, ifMatch } : { allowOverwrite: false }),
      });
      return { etag: r.etag };
    } catch (err) {
      if (err instanceof BlobPreconditionFailedError) return 'conflict';
      // A create-only write fails when another device created the document first.
      if (ifMatch === null && (await blobStore.read())) return 'conflict';
      throw err;
    }
  },
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });

const digest = (s: string) => createHash('sha256').update(s).digest();

function authorized(req: Request, passcode: string) {
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  return given.length > 0 && timingSafeEqual(digest(given), digest(passcode));
}

function validData(d: unknown): d is Record<string, unknown> {
  if (!d || typeof d !== 'object') return false;
  const o = d as Record<string, unknown>;
  return COLLECTIONS.every((k) => Array.isArray(o[k])) && !!o.settings && typeof o.settings === 'object';
}

export async function handle(req: Request, store: DocStore, passcode: string | undefined): Promise<Response> {
  if (!passcode) return json({ error: 'APP_PASSCODE is not configured on the server' }, 500);
  if (!authorized(req, passcode)) {
    await new Promise((r) => setTimeout(r, 500)); // slow down guessing
    return json({ error: 'Wrong passcode' }, 401);
  }

  if (req.method === 'GET') {
    const cur = await store.read(req.headers.get('if-none-match') ?? undefined);
    if (!cur) return json({ error: 'empty' }, 404);
    if ('notModified' in cur) return new Response(null, { status: 304, headers: { etag: cur.etag, 'cache-control': 'no-store' } });
    return json({ data: JSON.parse(cur.body), etag: cur.etag }, 200, { etag: cur.etag });
  }

  if (req.method === 'PUT') {
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: 'Workspace is too large to sync' }, 413);
    let payload: { data?: unknown; baseEtag?: string | null };
    try { payload = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!validData(payload.data)) return json({ error: 'Invalid workspace data' }, 400);

    const result = await store.write(JSON.stringify(payload.data), payload.baseEtag ?? null);
    if (result === 'conflict') {
      const cur = await store.read();
      if (!cur || 'notModified' in cur) return json({ error: 'conflict' }, 409);
      return json({ data: JSON.parse(cur.body), etag: cur.etag }, 409);
    }
    return json({ etag: result.etag });
  }

  return json({ error: 'Method not allowed' }, 405, { allow: 'GET, PUT' });
}

export const GET = (req: Request) => handle(req, blobStore, process.env.APP_PASSCODE);
export const PUT = (req: Request) => handle(req, blobStore, process.env.APP_PASSCODE);
