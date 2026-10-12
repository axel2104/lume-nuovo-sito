/**
 * POST /api/evento — { evento, email?, vid?, pagina?, dati? } → 204
 * Azione del cliente sul sito, registrata in crm_site_events e agganciata al lead per email.
 * Best effort: un errore qui non deve mai rompere la pagina.
 */
import type { APIRoute } from 'astro';
import { leggiJson, rpc } from '../../lib/supabaseRpc';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const d = await leggiJson(request);
  if (typeof d?.evento !== 'string') return new Response(null, { status: 400 });
  try {
    await rpc('site_registra_evento', { p: d });
  } catch {}
  return new Response(null, { status: 204 });
};
