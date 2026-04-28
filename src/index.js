/**
 * IDX Screener - Cloudflare Worker
 * Fix: proper HTML response + no-cache headers to prevent stale content on mobile/other devices
 */

import { renderHTML } from './html.js';
import { handleAPI } from './api.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      // API routes
      if (url.pathname.startsWith('/api/')) {
        return await handleAPI(request, url, env);
      }

      // Serve main HTML app for all other routes
      const html = renderHTML();

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          // Fix: paksa browser & CDN selalu ambil versi terbaru
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          // Security headers
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      });

    } catch (err) {
      console.error('Worker error:', err);
      return new Response(
        `<html><body style="font-family:monospace;padding:2rem">
          <h2>⚠️ Internal Error</h2>
          <pre>${err.message}</pre>
        </body></html>`,
        {
          status: 500,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        }
      );
    }
  },
};
