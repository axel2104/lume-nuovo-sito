/** GET /api/appuntamento?t=<token> — dati minimi dell'appuntamento (tipo, sede, orario, stato), per la pagina «gestisci». */
import type { APIRoute } from 'astro';
import { rpc } from '../../lib/supabaseRpc';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const t = url.searchParams.get('t') || '';
  if (!/^[0-9a-f-]{36}$/i.test(t)) return new Response(null, { status: 404 });
  try {
    const [a] = await rpc<{ tipo: string; sede: string; inizio: string; fine: string; stato: string }[]>('site_appuntamento', { p_token: t });
    return a ? Response.json(a, { headers: { 'Cache-Control': 'no-store' } }) : new Response(null, { status: 404 });
  } catch {
    return new Response(null, { status: 502 });
  }
};
