/**
 * POST /api/visita — { pagina, device, sorgente, secondi, scroll, clicks } → 204
 * Una visita anonima, a fine pagina: tempo attivo, scroll e click. Vedi src/lib/interazioni.js.
 * Best effort: un errore qui non deve mai toccare la pagina.
 */
import type { APIRoute } from 'astro';
import { leggiJson, rpc } from '../../lib/supabaseRpc';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const d = await leggiJson(request);
  if (typeof d?.pagina !== 'string') return new Response(null, { status: 400 });
  await rpc('site_visita', { p: d }).catch(() => {});
  return new Response(null, { status: 204 });
};
