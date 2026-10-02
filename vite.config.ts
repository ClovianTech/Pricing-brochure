import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

/**
 * Serves /api/data during `npm run dev` with the same handler Vercel runs,
 * backed by a local file instead of Vercel Blob. Passcode: $APP_PASSCODE or "dev".
 */
function devApi(): Plugin {
  const file = path.resolve(__dirname, '.data/workspace.json');
  const etagOf = (body: string) => `"${createHash('sha1').update(body).digest('hex')}"`;
  const store = {
    async read(ifNoneMatch?: string) {
      if (!fs.existsSync(file)) return null;
      const body = fs.readFileSync(file, 'utf8');
      const etag = etagOf(body);
      return ifNoneMatch === etag ? { notModified: true as const, etag } : { body, etag };
    },
    async write(body: string, ifMatch: string | null) {
      const cur = fs.existsSync(file) ? etagOf(fs.readFileSync(file, 'utf8')) : null;
      if (cur !== ifMatch) return 'conflict' as const;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, body);
      return { etag: etagOf(body) };
    },
  };
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/data', async (req, res) => {
        const { handle } = await server.ssrLoadModule('/api/data.ts');
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const request = new Request(`http://localhost${req.url}`, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : Buffer.concat(chunks),
        });
        const response: Response = await handle(request, store, process.env.APP_PASSCODE ?? 'dev');
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  base: './',
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          charts: ['recharts'],
        },
      },
    },
  },
});
