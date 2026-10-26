/**
 * GET /api/slot?tipo=chiamata|in_sede&sede=MACERATA|MONTECASSIANO|URBAN — orari liberi del calendario interno.
 * Restituisce solo gli orari (ISO UTC): nessun dato di chi ha già prenotato.
 */
import type { APIRoute } from 'astro';
import { rpc } from '../../lib/supabaseRpc';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const tipo = url.searchParams.get('tipo') || '';
  const sede = (url.searchParams.get('sede') || '').toUpperCase();
  try {
    const righe = await rpc<{ inizio: string }[]>('site_slot_liberi', { p_tipo: tipo, p_sede: sede });
    return Response.json({ slot: righe.map((r) => r.inizio) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return new Response(null, { status: 502 });
  }
};
