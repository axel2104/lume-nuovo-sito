/**
 * POST /api/prenota — { tipo, sede, inizio, email, nome, cognome, cellulare, messaggio, flusso, utm }
 * Prenota nel calendario interno (CRM). Risponde { ok: true, token, inizio, fine } oppure
 * { ok: false, errore } con errore = slot_occupato | troppe_prenotazioni | richiesta_non_valida.
 * `slot_occupato` è un caso normale (qualcuno ha preso l'orario mentre si compilava): il browser ricarica gli orari.
 */
import type { APIRoute } from 'astro';
import { leggiJson, rpc } from '../../lib/supabaseRpc';

export const prerender = false;

const WEBHOOK = process.env.N8N_BOOKING_WEBHOOK || 'https://n8n.lumeflow.it/webhook/lume-booking';
const TITOLI: Record<string, string> = { chiamata: 'Appuntamento Telefonico', in_sede: 'Appuntamento in Sede', visita: 'Appuntamento in Sede', segreteria: 'Appuntamento in Segreteria', 'sala-pesi': 'Appuntamento Sala Pesi', 'colloquio-check': 'Appuntamento Sala Pesi Colloquio e Check' };

/**
 * Stesso payload di BOOKING_CREATED di Cal.com: il workflow n8n `lume-booking` aggiorna il lead su Airtable,
 * avvisa la segreteria e crea l'evento (e i richiami) su PerfectGym, come faceva con Cal.com.
 * Un errore qui non deve far fallire la prenotazione, che è già stata salvata.
 */
async function avvisaN8n(d: any, r: { token?: string; inizio?: string; fine?: string }) {
  const sede = String(d.sede || '').toUpperCase();
  const tipo = String(d.tipo || '');
  // i vecchi tipi non hanno il centro nella chiave: n8n lo ricava dallo slug
  const slug = tipo === 'in_sede' ? `visita-${sede.toLowerCase()}` : tipo === 'chiamata' ? '' : tipo;
  const flusso = tipo === 'chiamata' ? 'richiamata' : String(d.flusso || 'prenota');
  const u = d.utm && typeof d.utm === 'object' ? d.utm : {};
  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        triggerEvent: 'BOOKING_CREATED',
        payload: {
          uid: r.token || '',
          title: TITOLI[tipo] || TITOLI[tipo.replace(/-(macerata|montecassiano)$/, '')] || String(d.titolo || tipo),
          eventType: { slug },
          startTime: r.inizio,
          endTime: r.fine,
          additionalNotes: String(d.messaggio || ''),
          attendees: [{ email: d.email, name: [d.nome, d.cognome].filter(Boolean).join(' ') }],
          metadata: { vid: d.vid || '', sede, flusso, source: u.source || d.source || 'SitoWeb', medium: u.medium || d.medium || 'Prenota' },
        },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* il lead resta nel CRM; n8n si può rilanciare dall'esecuzione */
  }
}

export const POST: APIRoute = async ({ request }) => {
  const d = await leggiJson(request);
  if (!d || typeof d.email !== 'string') return Response.json({ ok: false, errore: 'richiesta_non_valida' }, { status: 400 });
  try {
    const r = await rpc<{ ok: boolean; errore?: string; token?: string; inizio?: string; fine?: string }>('site_prenota', { p: d });
    if (r.ok) await avvisaN8n(d, r);
    return Response.json(r, { status: r.ok ? 200 : 409 });
  } catch {
    // email non valida (la funzione solleva) o database non raggiungibile
    return Response.json({ ok: false, errore: 'richiesta_non_valida' }, { status: 400 });
  }
};
