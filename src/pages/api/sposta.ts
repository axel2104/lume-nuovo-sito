/** POST /api/sposta { t, inizio } — sposta un appuntamento a un altro orario libero. Errori come /api/prenota. */
import type { APIRoute } from 'astro';
import { leggiJson, rpc } from '../../lib/supabaseRpc';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const { t, inizio } = await leggiJson(request);
  if (typeof t !== 'string' || !/^[0-9a-f-]{36}$/i.test(t) || typeof inizio !== 'string') return Response.json({ ok: false, errore: 'richiesta_non_valida' }, { status: 400 });
  try {
    const r = await rpc<{ ok: boolean; errore?: string; inizio?: string }>('site_sposta', { p_token: t, p_inizio: inizio });
    return Response.json({ ...r, token: t }, { status: r.ok ? 200 : 409 });
  } catch {
    return Response.json({ ok: false, errore: 'richiesta_non_valida' }, { status: 400 });
  }
};
