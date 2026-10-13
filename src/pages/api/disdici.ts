/** POST /api/disdici { t } — annulla un appuntamento preso dal sito e libera l'orario. */
import type { APIRoute } from 'astro';
import { leggiJson, rpc } from '../../lib/supabaseRpc';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const { t } = await leggiJson(request);
  if (typeof t !== 'string' || !/^[0-9a-f-]{36}$/i.test(t)) return Response.json({ ok: false }, { status: 400 });
  try {
    const ok = await rpc<boolean>('site_disdici', { p_token: t });
    return Response.json({ ok }, { status: ok ? 200 : 404 });
  } catch {
    return Response.json({ ok: false }, { status: 502 });
  }
};
