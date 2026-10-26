/**
 * POST /api/prenota — { tipo, sede, inizio, email, nome, cognome, cellulare, messaggio, flusso, utm }
 * Prenota nel calendario interno (CRM). Risponde { ok: true, token, inizio, fine } oppure
 * { ok: false, errore } con errore = slot_occupato | troppe_prenotazioni | richiesta_non_valida.
 * `slot_occupato` è un caso normale (qualcuno ha preso l'orario mentre si compilava): il browser ricarica gli orari.
 */
import type { APIRoute } from 'astro';
import { leggiJson, rpc } from '../../lib/supabaseRpc';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const d = await leggiJson(request);
  if (!d || typeof d.email !== 'string') return Response.json({ ok: false, errore: 'richiesta_non_valida' }, { status: 400 });
  try {
    const r = await rpc<{ ok: boolean; errore?: string; token?: string; inizio?: string; fine?: string }>('site_prenota', { p: d });
    return Response.json(r, { status: r.ok ? 200 : 409 });
  } catch {
    // email non valida (la funzione solleva) o database non raggiungibile
    return Response.json({ ok: false, errore: 'richiesta_non_valida' }, { status: 400 });
  }
};
