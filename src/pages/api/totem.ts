/**
 * POST /api/totem — { totem, centro?, evento, sezione?, voce?, durata? } → 204
 * Un gesto sul totem del centro (sezione aperta, voce toccata, QR mostrato, ritorno in attesa).
 * Dati anonimi: nessuna persona, nessun cookie. Best effort: un errore non deve mai fermare lo schermo.
 */
import type { APIRoute } from 'astro';
import { leggiJson, rpc } from '../../lib/supabaseRpc';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const d = await leggiJson(request);
  if (typeof d?.totem !== 'string' || typeof d?.evento !== 'string') return new Response(null, { status: 400 });
  await rpc('site_totem_evento', { p: d }).catch(() => {});
  return new Response(null, { status: 204 });
};
