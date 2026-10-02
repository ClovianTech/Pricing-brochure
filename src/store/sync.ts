import { create } from 'zustand';
import { useStore, type DataState } from './store';

/**
 * Cloud sync. The workspace (everything in DataState) lives in one document behind /api/data.
 * The local zustand store stays the source the UI reads from and doubles as an offline cache;
 * this module pulls remote changes into it and pushes local edits out, merging per record
 * when two devices edit at the same time.
 */

export type SyncStatus = 'locked' | 'connecting' | 'setup' | 'synced' | 'saving' | 'offline' | 'error';

interface SyncState {
  status: SyncStatus;
  error?: string;
  lastSyncedAt?: number;
  /** Set while the cloud is empty, so the user can choose what to start with. */
  localCounts?: number;
}

export const useSync = create<SyncState>(() => ({ status: 'connecting' }));

const PASS_KEY = 'clovian-sync-passcode';
const META_KEY = 'clovian-sync-meta';
const KEYS = ['transactions', 'clients', 'projects', 'leads', 'personal', 'budgets', 'settings'] as const;
const LISTS = ['transactions', 'clients', 'projects', 'leads', 'personal'] as const;
const POLL_MS = 20_000;
const PUSH_DELAY_MS = 700;

interface Meta { etag: string | null; base: DataState | null; dirty: boolean }

const storage = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* quota or private mode */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

let passcode: string | null = storage.get(PASS_KEY);
let meta: Meta = (() => {
  try { return { etag: null, base: null, dirty: false, ...JSON.parse(storage.get(META_KEY) ?? '{}') }; } catch { return { etag: null, base: null, dirty: false }; }
})();
const saveMeta = () => storage.set(META_KEY, JSON.stringify(meta));

let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = 3000;
let inflight: Promise<void> | null = null;
let conflicts = 0;
let started = false;

export const pickData = (s: DataState): DataState =>
  ({ transactions: s.transactions, clients: s.clients, projects: s.projects, leads: s.leads, personal: s.personal, budgets: s.budgets, settings: s.settings });

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

function mergeList<T>(key: (x: T) => string, base: T[], local: T[], server: T[]): T[] {
  const b = new Map(base.map((x) => [key(x), x]));
  const l = new Map(local.map((x) => [key(x), x]));
  const s = new Map(server.map((x) => [key(x), x]));
  const out: T[] = [];
  // Records created on this device since the last sync go first (lists are newest-first).
  for (const [id, x] of l) if (!s.has(id) && (!b.has(id) || !same(x, b.get(id)))) out.push(x);
  for (const [id, x] of s) {
    const mine = l.get(id);
    if (mine === undefined) {
      // Deleted here: keep the deletion unless the other device edited the record meanwhile.
      if (!b.has(id) || !same(x, b.get(id))) out.push(x);
    } else out.push(!same(mine, b.get(id)) ? mine : x);
  }
  return out;
}

/** Three-way merge: a record edited on this device wins, everything else comes from the server. */
export function merge(base: DataState, local: DataState, server: DataState): DataState {
  const byId = (x: { id: string }) => x.id;
  const out = { ...server } as DataState;
  for (const k of LISTS) (out[k] as { id: string }[]) = mergeList(byId, base[k] as { id: string }[], local[k] as { id: string }[], server[k] as { id: string }[]);
  out.budgets = mergeList((x) => x.category, base.budgets, local.budgets, server.budgets);
  out.settings = same(local.settings, base.settings) ? server.settings : { ...server.settings, ...local.settings };
  return out;
}

function applyRemote(data: DataState, etag: string) {
  applyingRemote = true;
  useStore.setState(pickData(data));
  applyingRemote = false;
  meta = { etag, base: pickData(data), dirty: false };
  saveMeta();
  useSync.setState({ status: 'synced', error: undefined, lastSyncedAt: Date.now() });
}

async function api(method: 'GET' | 'PUT', body?: unknown, headers: Record<string, string> = {}) {
  return fetch('/api/data', {
    method,
    cache: 'no-store',
    headers: { authorization: `Bearer ${passcode}`, ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function lock(error?: string) {
  passcode = null;
  storage.del(PASS_KEY);
  useSync.setState({ status: 'locked', error });
}

function goOffline(error = 'Offline — changes are saved on this device and will sync when you reconnect.') {
  useSync.setState({ status: 'offline', error });
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { void (meta.dirty ? push() : pull()); }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 60_000);
}

async function readError(res: Response) {
  try { return ((await res.json()) as { error?: string }).error ?? `Server error (${res.status})`; } catch { return `Server error (${res.status})`; }
}

function push(): Promise<void> {
  if (!passcode) return Promise.resolve();
  if (inflight) return inflight.then(() => (meta.dirty ? push() : undefined));
  inflight = (async () => {
    const sent = pickData(useStore.getState());
    useSync.setState({ status: 'saving' });
    try {
      const res = await api('PUT', { data: sent, baseEtag: meta.etag });
      if (res.status === 401) return lock('Passcode changed — enter the new one.');
      if (res.status === 409) {
        if (++conflicts > 3) { useSync.setState({ status: 'error', error: 'Could not merge changes from another device. Reload to try again.' }); return; }
        const cur = (await res.json()) as { data?: DataState; etag?: string };
        if (!cur.data || !cur.etag) throw new Error('conflict');
        const merged = merge(meta.base ?? cur.data, pickData(useStore.getState()), cur.data);
        applyRemote(cur.data, cur.etag); // server becomes the new base…
        applyingRemote = true;
        useStore.setState(merged); // …then local edits are re-applied on top of it
        applyingRemote = false;
        meta.dirty = true;
        saveMeta();
        useSync.setState({ status: 'saving' });
        return; // the follow-up push below sends the merge
      }
      if (!res.ok) { useSync.setState({ status: 'error', error: await readError(res) }); return; }
      const { etag } = (await res.json()) as { etag: string };
      const changedSince = KEYS.some((k) => useStore.getState()[k] !== sent[k]);
      meta = { etag, base: sent, dirty: changedSince };
      saveMeta();
      retryDelay = 3000;
      conflicts = 0;
      useSync.setState({ status: changedSince ? 'saving' : 'synced', error: undefined, lastSyncedAt: Date.now() });
    } catch {
      goOffline();
    }
  })().finally(() => { inflight = null; });
  return inflight.then(() => { if (meta.dirty && useSync.getState().status === 'saving') return push(); });
}

async function pull(): Promise<void> {
  if (!passcode || inflight || meta.dirty) return;
  try {
    const res = await api('GET', undefined, meta.etag ? { 'if-none-match': meta.etag } : {});
    if (res.status === 401) return lock('Passcode changed — enter the new one.');
    if (res.status === 304) { retryDelay = 3000; useSync.setState({ status: 'synced', error: undefined, lastSyncedAt: Date.now() }); return; }
    if (res.status === 404) return; // nothing to pull yet
    if (!res.ok) { useSync.setState({ status: 'error', error: await readError(res) }); return; }
    const { data, etag } = (await res.json()) as { data: DataState; etag: string };
    if (meta.dirty) return; // an edit happened mid-request; the next push will merge
    retryDelay = 3000;
    applyRemote(data, etag);
  } catch {
    goOffline();
  }
}

const countRecords = (d: DataState) => LISTS.reduce((n, k) => n + d[k].length, 0);

/** Connect with a passcode. Resolves to an error message, or undefined on success. */
export async function connect(code: string): Promise<string | undefined> {
  passcode = code;
  let res: Response;
  try { res = await api('GET'); } catch {
    if (storage.get(PASS_KEY) === code) {
      // Already signed in on this device: keep working from the local copy until the network returns.
      begin();
      goOffline();
      return;
    }
    passcode = storage.get(PASS_KEY);
    useSync.setState({ status: 'locked' });
    return 'Can’t reach the server. Check your connection and try again.';
  }
  if (res.status === 401) { lock(); return 'That passcode is not right.'; }
  if (res.status === 404) {
    storage.set(PASS_KEY, code);
    useSync.setState({ status: 'setup', localCounts: countRecords(pickData(useStore.getState())) });
    return;
  }
  if (!res.ok) { const e = await readError(res); lock(e); return e; }
  storage.set(PASS_KEY, code);
  const { data, etag } = (await res.json()) as { data: DataState; etag: string };
  if (meta.dirty && meta.base) {
    // Edits made offline on this device: fold them into the latest cloud copy.
    const merged = merge(meta.base, pickData(useStore.getState()), data);
    applyRemote(data, etag);
    applyingRemote = true; useStore.setState(merged); applyingRemote = false;
    meta.dirty = true; saveMeta();
    void push();
  } else applyRemote(data, etag);
  begin();
}

/** First device only: the cloud is empty, so seed it with this browser's data or an empty workspace. */
export async function initialise(useLocal: boolean) {
  if (!useLocal) { applyingRemote = true; useStore.getState().clearAll(); applyingRemote = false; }
  meta = { etag: null, base: null, dirty: true };
  saveMeta();
  begin();
  await push();
}

function begin() {
  if (started) return;
  started = true;
  useStore.subscribe((s, prev) => {
    if (applyingRemote || !passcode) return;
    if (!KEYS.some((k) => s[k] !== prev[k])) return;
    meta.dirty = true;
    saveMeta();
    useSync.setState({ status: 'saving' });
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { void push(); }, PUSH_DELAY_MS);
  });
  const refresh = () => { if (document.visibilityState === 'visible') void (meta.dirty ? push() : pull()); };
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('focus', refresh);
  window.addEventListener('online', refresh);
  setInterval(() => { if (document.visibilityState === 'visible') void pull(); }, POLL_MS);
  window.addEventListener('beforeunload', (e) => { if (meta.dirty) { e.preventDefault(); e.returnValue = ''; } });
}

/** Called once at startup: reconnect with the saved passcode, or show the lock screen. */
export function startSync() {
  if (passcode) { useSync.setState({ status: 'connecting' }); void connect(passcode); }
  else useSync.setState({ status: 'locked' });
}

/** Forget the passcode and the data cached on this device. */
export function signOut() {
  meta.dirty = false;
  storage.del(PASS_KEY);
  storage.del(META_KEY);
  storage.del('clovian-command-center-v1');
  location.reload();
}

export const hasUnsyncedChanges = () => meta.dirty;
